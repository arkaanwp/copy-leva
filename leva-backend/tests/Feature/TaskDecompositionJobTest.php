<?php

namespace Tests\Feature;

use App\Jobs\TaskDecompositionJob;
use App\Models\TaskMaster;
use App\Models\User;
use App\Models\UserProfile;
use App\Services\OpenAIService;
use App\Services\PdfTextExtractor;
use App\Services\QdrantService;
use Database\Seeders\ScrapedToolsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Tests\TestCase;

class TaskDecompositionJobTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(ScrapedToolsSeeder::class);
    }

    public function test_task_decomposition_job_completes_text_task_with_openai_response(): void
    {
        $user = User::factory()->create([
            'status' => User::STATUS_ACTIVE,
        ]);

        UserProfile::query()->create([
            'id' => (string) Str::uuid(),
            'user_id' => $user->id,
            'major' => 'Teknik Informatika',
            'semester' => 6,
            'language_preference' => 'id',
            'learning_style' => 'visual',
        ]);

        $task = TaskMaster::query()->create([
            'task_id' => (string) Str::uuid(),
            'user_id' => $user->id,
            'status' => 'processing',
            'source_type' => 'text',
            'source_text' => 'Bantu saya menyusun proposal skripsi tentang machine learning',
        ]);

        $openAIService = new class extends OpenAIService
        {
            public function decomposeTask(string $text, array $userProfile): array
            {
                return [
                    'title' => 'Menyusun Proposal Skripsi',
                    'sub_tasks' => [
                        [
                            'judul_tugas' => 'Cari topik',
                            'deskripsi' => 'Tentukan topik yang spesifik dan realistis untuk dikerjakan.',
                            'tips' => 'Gunakan satu jam pertama untuk menyaring tiga ide.',
                            'estimasi_waktu' => '20 menit',
                            'kategori_alat_ai_yang_rekomendasi' => 'Research',
                        ],
                        [
                            'judul_tugas' => 'Kumpulkan referensi awal',
                            'deskripsi' => 'Kumpulkan referensi inti yang paling relevan.',
                            'tips' => 'Cari minimal tiga paper terbaru.',
                            'estimasi_waktu' => '25 menit',
                            'kategori_alat_ai_yang_rekomendasi' => 'Academic',
                        ],
                        [
                            'judul_tugas' => 'Susun outline',
                            'deskripsi' => 'Buat kerangka proposal yang bisa langsung dikembangkan.',
                            'tips' => 'Tulis poin per bab agar tidak blank.',
                            'estimasi_waktu' => '25 menit',
                            'kategori_alat_ai_yang_rekomendasi' => 'Writing',
                        ],
                    ],
                ];
            }
        };

        $qdrantService = new class($openAIService) extends QdrantService
        {
            public function __construct(OpenAIService $openAIService)
            {
                parent::__construct($openAIService);
            }

            public function searchTools(string $query, ?string $categoryFilter = null, int $limit = 5, float $minScore = 0.85): array
            {
                return [];
            }
        };

        (new TaskDecompositionJob($task->task_id))->handle(
            $openAIService,
            app(PdfTextExtractor::class),
            $qdrantService
        );

        $task->refresh();

        $this->assertSame('completed', $task->status);
        $this->assertSame('Menyusun Proposal Skripsi', $task->title);
        $this->assertDatabaseCount('atomic_sub_tasks', 3);
    }

    public function test_task_decomposition_job_marks_failed_when_pdf_extraction_breaks(): void
    {
        Storage::fake('local');

        $user = User::factory()->create();

        $task = TaskMaster::query()->create([
            'task_id' => (string) Str::uuid(),
            'user_id' => $user->id,
            'status' => 'processing',
            'source_type' => 'pdf',
            'source_file_path' => 'tmp/missing.pdf',
        ]);

        app()->instance(PdfTextExtractor::class, new class extends PdfTextExtractor
        {
            public function extract(string $path): string
            {
                throw new \RuntimeException('Failed to extract PDF text.');
            }
        });

        $openAIService = new class extends OpenAIService {};
        $qdrantService = new class($openAIService) extends QdrantService
        {
            public function __construct(OpenAIService $openAIService)
            {
                parent::__construct($openAIService);
            }

            public function searchTools(string $query, ?string $categoryFilter = null, int $limit = 5, float $minScore = 0.85): array
            {
                return [];
            }
        };

        (new TaskDecompositionJob($task->task_id))->handle(
            $openAIService,
            app(PdfTextExtractor::class),
            $qdrantService
        );

        $task->refresh();

        $this->assertSame('failed', $task->status);
        $this->assertSame('Failed to extract PDF text.', $task->error_message);
    }
}
