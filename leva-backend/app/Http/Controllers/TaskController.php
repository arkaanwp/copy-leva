<?php

namespace App\Http\Controllers;

use App\Jobs\TaskDecompositionJob;
use App\Models\AtomicSubTask;
use App\Models\ScrapedTool;
use App\Models\TaskMaster;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class TaskController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $paginator = TaskMaster::query()
            ->where('user_id', $request->user()->id)
            ->withCount([
                'subTasks as sub_tasks_count',
                'subTasks as completed_count' => fn ($query) => $query->where('status', 'done'),
            ])
            ->latest()
            ->paginate(10);

        return response()->json([
            'message' => 'Tasks retrieved successfully',
            'data' => [
                'tasks' => $paginator->getCollection()
                    ->map(fn (TaskMaster $task) => $this->formatTaskSummary($task))
                    ->values(),
                'pagination' => [
                    'current_page' => $paginator->currentPage(),
                    'total' => $paginator->total(),
                    'last_page' => $paginator->lastPage(),
                ],
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = Validator::make($request->all(), [
            'text' => ['nullable', 'string'],
            'description' => ['nullable', 'string'],
            'pdf_file' => ['nullable', 'file', 'mimetypes:application/pdf', 'max:10240'],
        ])->after(function ($validator) use ($request) {
            if (!$request->filled('text') && !$request->hasFile('pdf_file')) {
                $validator->errors()->add('text', 'Either text or pdf_file is required.');
            }
        })->validate();

        $sourceType = $request->hasFile('pdf_file') ? 'pdf' : 'text';
        $storedPath = null;
        $pdfHash = null;

        if ($request->hasFile('pdf_file')) {
            $file = $request->file('pdf_file');
            $storedPath = $file->store('tmp');
            $pdfHash = hash_file('sha256', $file->getRealPath());
        }

        $task = TaskMaster::query()->create([
            'task_id' => (string) Str::uuid(),
            'user_id' => $request->user()->id,
            'status' => 'processing',
            'source_type' => $sourceType,
            'source_pdf_hash' => $pdfHash,
            'source_text' => $validated['text'] ?? null,
            'source_description' => $validated['description'] ?? null,
            'source_file_path' => $storedPath,
        ]);

        TaskDecompositionJob::dispatch($task->task_id);

        return response()->json([
            'message' => 'Task submitted for processing',
            'data' => [
                'task_id' => $task->task_id,
                'status' => $task->status,
                'estimated_seconds' => 25,
                'poll_url' => '/api/tasks/'.$task->task_id.'/status',
            ],
        ], 202);
    }

    public function show(Request $request, string $taskId): JsonResponse
    {
        $task = $this->findUserTask($request, $taskId);
        $task->load('subTasks');

        return response()->json([
            'message' => 'Task retrieved successfully',
            'data' => [
                'task' => $this->formatTaskDetail($task),
            ],
        ]);
    }

    public function status(Request $request, string $taskId): JsonResponse
    {
        $task = $this->findUserTask($request, $taskId);
        $subTasksCount = $task->subTasks()->count();

        return response()->json([
            'message' => 'Task status retrieved',
            'data' => [
                'task_id' => $task->task_id,
                'status' => $task->status,
                'progress_message' => $this->progressMessage($task, $subTasksCount),
                'sub_tasks_count' => $subTasksCount,
                'ready' => $task->status === 'completed',
                'error_message' => $task->error_message,
            ],
        ]);
    }

    public function destroy(Request $request, string $taskId): JsonResponse
    {
        $task = $this->findUserTask($request, $taskId);

        if ($task->source_file_path && Storage::disk('local')->exists($task->source_file_path)) {
            Storage::disk('local')->delete($task->source_file_path);
        }

        $task->delete();

        return response()->json([
            'message' => 'Task deleted successfully',
        ]);
    }

    public function updateSubTask(Request $request, string $taskId, string $subTaskId): JsonResponse
    {
        $validated = Validator::make($request->all(), [
            'status' => ['required', 'in:done,next'],
        ])->validate();

        $task = $this->findUserTask($request, $taskId);

        $subTask = $task->subTasks()->where('sub_task_id', $subTaskId)->firstOrFail();
        $subTask->update([
            'status' => $validated['status'],
        ]);

        return response()->json([
            'message' => 'Sub-task updated successfully',
            'data' => [
                'sub_task' => [
                    'sub_task_id' => $subTask->sub_task_id,
                    'actionable_title' => $subTask->actionable_title,
                    'status' => $subTask->status,
                ],
            ],
        ]);
    }

    private function findUserTask(Request $request, string $taskId): TaskMaster
    {
        return TaskMaster::query()
            ->where('user_id', $request->user()->id)
            ->where('task_id', $taskId)
            ->firstOrFail();
    }

    private function formatTaskSummary(TaskMaster $task): array
    {
        return [
            'task_id' => $task->task_id,
            'title' => $task->title,
            'status' => $task->status,
            'sub_tasks_count' => (int) ($task->sub_tasks_count ?? $task->subTasks()->count()),
            'completed_count' => (int) ($task->completed_count ?? $task->subTasks()->where('status', 'done')->count()),
            'source_type' => $task->source_type,
            'created_at' => $task->created_at?->toISOString(),
        ];
    }

    private function formatTaskDetail(TaskMaster $task): array
    {
        $subTasks = $task->subTasks->map(function (AtomicSubTask $subTask) {
            $recommendedTools = ScrapedTool::query()
                ->whereIn('id', $subTask->recommended_tool_ids ?? [])
                ->get()
                ->keyBy('id');

            return [
                'sub_task_id' => $subTask->sub_task_id,
                'actionable_title' => $subTask->actionable_title,
                'description' => $subTask->description,
                'tips' => $subTask->tips,
                'status' => $subTask->status,
                'category' => $subTask->category,
                'estimated_duration' => $subTask->estimated_duration,
                'order' => $subTask->order,
                'recommended_tools' => collect($subTask->recommended_tool_ids ?? [])
                    ->map(fn ($toolId) => $recommendedTools->get($toolId))
                    ->filter()
                    ->map(fn (ScrapedTool $tool) => [
                        'id' => $tool->id,
                        'name' => $tool->name,
                        'url' => $tool->url,
                        'category' => $tool->category,
                    ])
                    ->values(),
            ];
        })->values();

        return [
            ...$this->formatTaskSummary($task),
            'sub_tasks' => $subTasks,
        ];
    }

    private function progressMessage(TaskMaster $task, int $subTasksCount): string
    {
        return match ($task->status) {
            'completed' => 'Sub-tasks berhasil dibuat',
            'failed' => $task->error_message ?: 'Task processing failed',
            default => $subTasksCount > 0 ? 'Task masih diproses' : 'Task is still being processed',
        };
    }
}
