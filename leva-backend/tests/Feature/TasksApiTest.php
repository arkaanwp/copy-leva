<?php

namespace Tests\Feature;

use App\Jobs\TaskDecompositionJob;
use App\Models\AtomicSubTask;
use App\Models\TaskMaster;
use App\Models\User;
use Database\Seeders\ScrapedToolsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TasksApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(ScrapedToolsSeeder::class);
    }

    public function test_authenticated_user_can_submit_text_task_for_processing(): void
    {
        Queue::fake();
        Sanctum::actingAs(User::factory()->create());

        $response = $this->postJson('/api/tasks', [
            'text' => 'Bantu saya menyusun proposal skripsi tentang machine learning untuk deteksi penyakit kulit',
            'description' => 'Fokus pada langkah yang bisa langsung dikerjakan.',
        ]);

        $response
            ->assertStatus(202)
            ->assertJson([
                'message' => 'Task submitted for processing',
                'data' => [
                    'status' => 'processing',
                    'estimated_seconds' => 25,
                ],
            ])
            ->assertJsonStructure([
                'message',
                'data' => [
                    'task_id',
                    'status',
                    'estimated_seconds',
                    'poll_url',
                ],
            ]);

        $taskId = $response->json('data.task_id');

        $this->assertDatabaseHas('tasks_master', [
            'task_id' => $taskId,
            'source_type' => 'text',
            'status' => 'processing',
        ]);

        Queue::assertPushed(TaskDecompositionJob::class, fn (TaskDecompositionJob $job) => $job->taskId === $taskId);
    }

    public function test_authenticated_user_can_submit_pdf_task_for_processing(): void
    {
        Queue::fake();
        Storage::fake('local');
        Sanctum::actingAs(User::factory()->create());

        $response = $this->post('/api/tasks', [
            'pdf_file' => UploadedFile::fake()->create('proposal.pdf', 100, 'application/pdf'),
            'description' => 'Butuh langkah penyusunan proposal.',
        ]);

        $response->assertStatus(202);

        $task = TaskMaster::query()->first();

        $this->assertNotNull($task);
        $this->assertSame('pdf', $task->source_type);
        $this->assertNotNull($task->source_pdf_hash);
        $this->assertNotNull($task->source_file_path);
        Storage::disk('local')->assertExists($task->source_file_path);
    }

    public function test_task_submission_requires_text_or_pdf(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $response = $this->postJson('/api/tasks', []);

        $response
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['text']);
    }

    public function test_authenticated_user_can_list_owned_tasks(): void
    {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();

        $ownedTask = TaskMaster::query()->create([
            'task_id' => (string) Str::uuid(),
            'user_id' => $user->id,
            'title' => 'Task Saya',
            'status' => 'completed',
            'source_type' => 'text',
            'source_text' => 'Isi tugas saya',
        ]);

        AtomicSubTask::query()->create([
            'sub_task_id' => (string) Str::uuid(),
            'parent_task_id' => $ownedTask->task_id,
            'actionable_title' => 'Cari referensi',
            'status' => 'done',
            'order' => 1,
        ]);

        TaskMaster::query()->create([
            'task_id' => (string) Str::uuid(),
            'user_id' => $otherUser->id,
            'title' => 'Task Orang Lain',
            'status' => 'processing',
            'source_type' => 'text',
            'source_text' => 'Isi tugas lain',
        ]);

        Sanctum::actingAs($user);

        $response = $this->getJson('/api/tasks');

        $response
            ->assertOk()
            ->assertJson([
                'message' => 'Tasks retrieved successfully',
                'data' => [
                    'pagination' => [
                        'current_page' => 1,
                        'total' => 1,
                        'last_page' => 1,
                    ],
                ],
            ])
            ->assertJsonPath('data.tasks.0.title', 'Task Saya')
            ->assertJsonPath('data.tasks.0.sub_tasks_count', 1)
            ->assertJsonPath('data.tasks.0.completed_count', 1);
    }

    public function test_authenticated_user_can_view_task_detail_and_status_and_update_sub_task(): void
    {
        $user = User::factory()->create();

        $task = TaskMaster::query()->create([
            'task_id' => (string) Str::uuid(),
            'user_id' => $user->id,
            'title' => 'Menyusun Skripsi Teknik Informatika',
            'status' => 'completed',
            'source_type' => 'text',
            'source_text' => 'Bantu saya menyusun skripsi',
        ]);

        $subTask = AtomicSubTask::query()->create([
            'sub_task_id' => (string) Str::uuid(),
            'parent_task_id' => $task->task_id,
            'actionable_title' => 'Cari Topik',
            'description' => 'Langkah pertama dan sangat krusial.',
            'tips' => 'Gunakan Perplexity AI untuk riset cepat.',
            'status' => 'next',
            'category' => 'Research',
            'estimated_duration' => '1-2 hari',
            'recommended_tool_ids' => [1],
            'order' => 1,
        ]);

        Sanctum::actingAs($user);

        $detailResponse = $this->getJson('/api/tasks/'.$task->task_id);
        $detailResponse
            ->assertOk()
            ->assertJsonPath('data.task.sub_tasks.0.actionable_title', 'Cari Topik')
            ->assertJsonPath('data.task.sub_tasks.0.recommended_tools.0.id', 1)
            ->assertJsonPath('data.task.sub_tasks.0.recommended_tools.0.name', 'Perplexity AI');

        $statusResponse = $this->getJson('/api/tasks/'.$task->task_id.'/status');
        $statusResponse
            ->assertOk()
            ->assertJson([
                'message' => 'Task status retrieved',
                'data' => [
                    'task_id' => $task->task_id,
                    'status' => 'completed',
                    'sub_tasks_count' => 1,
                    'ready' => true,
                ],
            ]);

        $patchResponse = $this->patchJson('/api/tasks/'.$task->task_id.'/sub-tasks/'.$subTask->sub_task_id, [
            'status' => 'done',
        ]);

        $patchResponse
            ->assertOk()
            ->assertJsonPath('data.sub_task.status', 'done');

        $this->assertDatabaseHas('atomic_sub_tasks', [
            'sub_task_id' => $subTask->sub_task_id,
            'status' => 'done',
        ]);
    }

    public function test_authenticated_user_can_delete_owned_task(): void
    {
        $user = User::factory()->create();

        $task = TaskMaster::query()->create([
            'task_id' => (string) Str::uuid(),
            'user_id' => $user->id,
            'title' => 'Task Hapus',
            'status' => 'processing',
            'source_type' => 'text',
            'source_text' => 'Isi task',
        ]);

        Sanctum::actingAs($user);

        $response = $this->deleteJson('/api/tasks/'.$task->task_id);

        $response
            ->assertOk()
            ->assertJson([
                'message' => 'Task deleted successfully',
            ]);

        $this->assertDatabaseMissing('tasks_master', [
            'task_id' => $task->task_id,
        ]);
    }
}
