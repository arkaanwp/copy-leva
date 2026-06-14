# Prompt Revisi Leva — Roadmap Implementasi Bertahap

> **Cara pakai:** salin seluruh isi file ini ke chat Claude Code baru di working directory `d:/Projects/LevaFull`. Jalankan **per stage**, jangan sekaligus. Tunggu Claude konfirmasi tiap stage selesai dan kamu sudah verifikasi sebelum lanjut ke stage berikutnya.
>
> **Legenda penanda:**
> - 🧑 **USER** → kamu yang lakukan secara manual (instal database, isi API key, dll.)
> - 🤖 **CLAUDE** → Claude yang menulis/ubah kode
> - ✅ **VERIFY** → cek hasil sebelum lanjut

---

## 0. Konteks Proyek (BACA DULU SEBELUM CODING)

Kamu (Claude) sedang melanjutkan proyek **Leva** — SaaS asisten kurasi alat AI untuk mahasiswa, berbasis filosofi *Atomic Habits* + arsitektur RAG. Baca dokumen-dokumen ini lebih dulu agar kamu paham keputusan desain yang sudah diambil:

1. `Base Idea (Rutinitas Harian).pdf` — spesifikasi IEEE 830 lengkap (referensi utama)
2. `GAP_REPORT.md` — analisis gap frontend↔backend versi 1.1.0
3. `API_CONTRACT.md` — kontrak 24 endpoint final
4. `INTEGRATION_GUIDE.md` — panduan integrasi & env
5. `openapi.yaml` — schema OpenAPI

### Keputusan tetap (jangan diubah):
- **Frontend tetap React 18 + Vite** (PDF menyebut Vue.js, tapi tim memutuskan React sebagai prototype yang dipertahankan — lihat GAP_REPORT 1d). **Jangan rewrite ke Vue.**
- **State pakai React Context** yang sudah ada (`src/context/AppContext.jsx`). Jangan ganti ke Redux/Zustand.
- **Routing tetap pakai `activeView` state** (bukan React Router) — sesuai pola eksisting.
- **Backend Laravel 13 + Sanctum + MySQL.** Queue di-redis untuk production, `database` driver untuk dev.
- **Vector DB:** Qdrant Cloud (free tier) — bukan self-hosted di tahap ini.
- **LLM:** OpenAI (chat: `gpt-4o-mini`, embedding: `text-embedding-3-small` 1536 dim).
- **PK convention:** UUID untuk `users`, `user_profiles`, `tasks_master`, `atomic_sub_tasks`, `saved_libraries`, `chat_*`. **BIGINT** untuk `scraped_tools` (sesuai spec, karena jadi FK di `saved_libraries`).
- **4 level prioritas bookmark** (`must_try`, `very_good`, `niche`, `optional`) — bukan 3 level seperti mock saat ini.
- **Field mapping wajib** (frontend ↔ backend): `jurusan→major`, `bahasa('Indonesia'/'English')→language_preference('id'/'en')`, `semester(string)→integer`.

### Aturan kerja:
- Setiap kali jalankan command yang outputnya panjang (test, build, migrate), **prefix `rtk`** — sesuai `CLAUDE.md`.
- Jangan tambah fitur di luar yang diminta tiap stage. Tidak ada refactor "sambil lalu".
- Jangan tulis komentar penjelasan kecuali memang non-obvious (lihat aturan global Claude Code).
- Setelah selesai tiap stage, beri **ringkasan 5 baris** (apa yang berubah, file mana, cara verifikasi).
- Kalau ada package yang perlu diinstal, **tampilkan command install dan tunggu konfirmasi** sebelum jalan — supaya user bisa cek dulu.

---

## STAGE 1 — 🧑 Setup Database (USER kerjakan dulu, Claude tunggu)

Tujuan: pasang MySQL lokal, jalankan migration + seeder yang **sudah dibuat**, validasi data demo masuk.

### 1.1 Install MySQL lokal (pilih salah satu)
- **Windows:** install [Laragon](https://laragon.org/) (sudah include MySQL 8 + PHP 8.3 + Composer + Node) — paling cepat.
- **Alternatif:** XAMPP, atau Docker (`docker run -d -p 3306:3306 -e MYSQL_ROOT_PASSWORD=root -e MYSQL_DATABASE=leva_db --name leva-mysql mysql:8`).

### 1.2 Buat database
```sql
-- via phpMyAdmin / DBeaver / mysql CLI
CREATE DATABASE leva_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 1.3 Konfigurasi `.env` backend
File: `leva-backend/.env` (copy dari `.env.example` jika belum ada)
```env
APP_NAME=Leva
APP_ENV=local
APP_KEY=                              # akan diisi otomatis di langkah 1.4
APP_DEBUG=true
APP_URL=http://localhost:8000

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=leva_db
DB_USERNAME=root
DB_PASSWORD=                          # sesuaikan; di Laragon default kosong

QUEUE_CONNECTION=database             # nanti diganti ke redis di production
SESSION_DRIVER=database
CACHE_STORE=database

# Akan diisi di stage berikutnya — biarkan kosong dulu:
OPENAI_API_KEY=
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
OPENAI_CHAT_MODEL=gpt-4o-mini
QDRANT_HOST=
QDRANT_API_KEY=
QDRANT_COLLECTION=tools_semantic_vectors
SCRAPER_SECRET_KEY=

FRONTEND_URL=http://localhost:5173
```

### 1.4 Install dependency + jalankan migration + seed
Buka terminal di `d:/Projects/LevaFull/leva-backend/`:
```bash
composer install
php artisan key:generate
php artisan migrate
php artisan db:seed
```

### ✅ VERIFY 1
- `php artisan migrate:status` → semua tabel berstatus `Ran`.
- Cek tabel `scraped_tools` → ada **12 baris** AI tools.
- Cek tabel `users` → ada user `renisa@demo.leva.id` (password: `password123`).
- Cek tabel `atomic_sub_tasks` → ada 5 sub-task untuk demo task.

**Beri tahu Claude saat selesai:** _"Database siap, lanjut Stage 2."_

---

## STAGE 2 — 🤖 Backend: Refactor Auth + Tambah Profile Endpoint

Tujuan: selaraskan route ke `/api/auth/*` dan `/api/profile`, tambah `logout`, `GET/PUT /api/profile`. Aktifkan CORS untuk Vite dev server.

### 2.1 Yang harus Claude kerjakan:

**A. Refactor `routes/api.php`** — pindah ke prefix `/auth`, tambah endpoint baru:
```php
Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login',    [AuthController::class, 'login']);

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me',      [AuthController::class, 'me']);
    });
});

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/profile', [ProfileController::class, 'store']);   // first-time onboarding
    Route::get('/profile',  [ProfileController::class, 'show']);
    Route::put('/profile',  [ProfileController::class, 'update']);
});
```

**B. Buat `app/Http/Controllers/ProfileController.php`** dengan tiga method:
- `store()` — pindahan dari `OnboardingController@store`. Validasi `major|semester|language_preference|learning_style`. Set `users.status = ACTIVE`. Return user + profile.
- `show()` — return profil user yang sedang login. 404 kalau belum onboarding.
- `update()` — partial update; semua field opsional. Return profile terbaru.

Pisahkan logic ke `app/Services/ProfileService.php` (mirror pola `AuthService`).

**C. Tambah `AuthController@logout`:**
```php
public function logout(Request $request): JsonResponse
{
    $request->user()->currentAccessToken()->delete();
    return response()->json(['message' => 'Logged out successfully']);
}
```

**D. Konfigurasi CORS** — edit `config/cors.php`:
```php
'paths' => ['api/*', 'sanctum/csrf-cookie'],
'allowed_methods' => ['*'],
'allowed_origins' => [
    'http://localhost:5173',
    env('FRONTEND_URL', 'http://localhost:5173'),
],
'allowed_headers' => ['*'],
'supports_credentials' => false,
```

**E. Hapus `OnboardingController.php` dan `OnboardingService.php`** karena sudah dipindahkan ke `ProfileController`. Hapus juga route lama `/onboarding` & `/me` yang tidak di-prefix.

### ✅ VERIFY 2
Jalankan `php artisan serve` di backend, lalu test dari terminal lain:
```bash
# Register
curl -X POST http://localhost:8000/api/auth/register -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@leva.id","password":"password123","password_confirmation":"password123"}'

# Login
curl -X POST http://localhost:8000/api/auth/login -H "Content-Type: application/json" \
  -d '{"email":"renisa@demo.leva.id","password":"password123"}'
# → simpan token dari response, sebut TOKEN

# Get profile
curl http://localhost:8000/api/auth/me -H "Authorization: Bearer TOKEN"
```
Semua harus return JSON sesuai contract di `API_CONTRACT.md` bagian A & B.

---

## STAGE 3 — 🤖 Backend: Tools API (REQ-F02 + REQ-F04 fallback)

Tujuan: expose data `scraped_tools` yang sudah di-seed via REST. Tahap ini belum pakai Qdrant — pencarian pakai MySQL dulu (fallback dari REQ-F04).

### 3.1 Yang harus Claude kerjakan:

**A. Buat model `app/Models/ScrapedTool.php`** — table `scraped_tools`, BIGINT id, fillable lengkap, cast `rating` ke float.

**B. Buat `app/Http/Controllers/ToolController.php`:**
- `index()` — `GET /api/tools` dengan query `category`, `pricing`, `page`, `per_page` (max 50). Pakai `paginate()` Laravel.
- `show($id)` — `GET /api/tools/{id}` return detail.
- `search(Request $r)` — `GET /api/tools/search?q=...` — untuk sekarang, pakai `WHERE name LIKE ? OR description LIKE ?`. Field `score` di response set 1.0 dummy. Field `why_recommended` = string statis "Direkomendasikan berdasarkan pencarian kata kunci" sampai Qdrant aktif.

**C. Daftarkan route di `routes/api.php`** (semua di-protect Sanctum):
```php
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/tools/search', [ToolController::class, 'search']);  // letakkan SEBELUM {id}
    Route::get('/tools',        [ToolController::class, 'index']);
    Route::get('/tools/{id}',   [ToolController::class, 'show']);
});
```

**D. Format response** harus sama persis dengan `API_CONTRACT.md` bagian C. Bungkus dalam `{ "message": ..., "data": { "tools": [...], "pagination": {...} } }`.

### ✅ VERIFY 3
```bash
TOKEN="..."  # dari login Stage 2
curl "http://localhost:8000/api/tools?per_page=5" -H "Authorization: Bearer $TOKEN"
curl "http://localhost:8000/api/tools/search?q=research" -H "Authorization: Bearer $TOKEN"
```
Harus return 5 tools dan hasil search yang relevan.

---

## STAGE 4 — 🧑 Setup OpenAI API Key

### 4.1 Yang USER kerjakan:
1. Daftar / login ke https://platform.openai.com/
2. Top-up minimum **$5** (lebih dari cukup untuk dev — embedding murah).
3. Buat API key: https://platform.openai.com/api-keys
4. Edit `leva-backend/.env`:
   ```env
   OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```
5. Beri tahu Claude saat siap: _"OpenAI key sudah ada, lanjut Stage 5."_

---

## STAGE 5 — 🤖 Backend: Task Decomposition + AI To-do Analysis (REQ-F03)

Tujuan: implementasi pipeline penuh — user kirim teks ATAU PDF → backend ekstrak teks → LLM pecah jadi sub-task → simpan → frontend polling.

### 5.1 Install package
Tampilkan command ini dulu, tunggu user approve:
```bash
cd leva-backend
composer require spatie/pdf-to-text openai-php/laravel
php artisan vendor:publish --provider="OpenAI\Laravel\ServiceProvider"
```

> **Catatan untuk USER:** `spatie/pdf-to-text` butuh binary `pdftotext` di OS:
> - Windows (Laragon): download [poppler-windows](https://github.com/oschwartz10612/poppler-windows/releases), extract, tambahkan folder `bin/` ke PATH.
> - macOS: `brew install poppler`
> - Linux: `apt install poppler-utils`

### 5.2 Yang harus Claude kerjakan:

**A. Buat model:**
- `app/Models/TaskMaster.php` — table `tasks_master`, primary key `task_id` UUID, relasi `hasMany(SubTask, 'parent_task_id', 'task_id')` dan `belongsTo(User)`.
- `app/Models/AtomicSubTask.php` — table `atomic_sub_tasks`, primary key `sub_task_id` UUID, cast `recommended_tool_ids` ke array.

**B. Buat `app/Services/OpenAIService.php`** dengan method:
- `embedText(string $text): array` — return vektor 1536 float pakai `text-embedding-3-small`.
- `decomposeTask(string $text, array $userProfile): array` — call `gpt-4o-mini` dengan prompt **KERNEL pattern** (lihat PDF Bab 4.3). Output JSON yang dipaksa via `response_format: json_object`. Schema yang harus dihasilkan LLM:
  ```json
  {
    "title": "string judul tugas keseluruhan",
    "sub_tasks": [
      {
        "judul_tugas": "string",
        "deskripsi": "string 2-3 kalimat",
        "tips": "string 1-2 kalimat tips konkret",
        "estimasi_waktu": "1-2 hari",
        "kategori_alat_ai_yang_rekomendasi": "Research|Writing|Coding|Data|Academic|Productivity"
      }
    ]
  }
  ```
  Persona: "Insinyur alur kerja perilaku yang mensintesis metodologi Atomic Habits". Setiap sub-task wajib bisa diselesaikan dalam <30 menit (Aturan 2 Menit). User context: `major={major}, semester={semester}`.

**C. Buat `app/Http/Controllers/TaskController.php`:**
- `store(Request $r)` — validasi: `text` (string, optional) **atau** `pdf_file` (mimetypes:application/pdf, max:10240). Wajib salah satu. Bikin record `tasks_master` (status=`processing`), dispatch `TaskDecompositionJob`, return HTTP 202 `{ task_id, status:'processing', estimated_seconds:25, poll_url }`.
- `index()` — list task milik user, paginate.
- `show($taskId)` — full detail dengan sub_tasks + recommended_tools (eager-load `ScrapedTool` via `whereIn(id, recommended_tool_ids)`).
- `status($taskId)` — return ringkas: `task_id, status, sub_tasks_count, ready, error_message?`.
- `destroy($taskId)` — hapus task + cascade sub-tasks.
- `updateSubTask($taskId, $subTaskId, Request $r)` — `PATCH /api/tasks/{taskId}/sub-tasks/{subTaskId}`. Validasi `status: in:done,next`. Return sub_task baru.

**D. Buat `app/Jobs/TaskDecompositionJob.php` (queueable):**
1. Load `TaskMaster`.
2. Kalau ada PDF: simpan ke `storage/app/tmp/`, `Pdf::getText(path)`, hash SHA-256 untuk `source_pdf_hash`, **hapus file setelah ekstrak** (REQ-NF03).
3. Truncate teks ke ±8000 karakter biar hemat token.
4. Panggil `OpenAIService->decomposeTask($text, $profile)`.
5. Loop hasil → bikin `AtomicSubTask` records dengan `order` urut. Untuk setiap sub-task, panggil `WHERE category=kategori_alat_ai_yang_rekomendasi LIMIT 3` di MySQL `scraped_tools`, simpan ID-nya ke kolom `recommended_tool_ids` JSON.
6. Update `tasks_master.title` dan `tasks_master.status='completed'`. Kalau exception: status=`failed`, simpan `error_message` (tambah kolom kalau belum ada — bikin migration baru).
7. Wrap try/catch — jangan biarkan exception lolos (job harus mark task failed, bukan crash silent).

**E. Daftarkan route**:
```php
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/tasks',                                       [TaskController::class, 'index']);
    Route::post('/tasks',                                      [TaskController::class, 'store'])->middleware('throttle:30,1');
    Route::get('/tasks/{taskId}',                              [TaskController::class, 'show']);
    Route::get('/tasks/{taskId}/status',                       [TaskController::class, 'status']);
    Route::delete('/tasks/{taskId}',                           [TaskController::class, 'destroy']);
    Route::patch('/tasks/{taskId}/sub-tasks/{subTaskId}',      [TaskController::class, 'updateSubTask']);
});
```

**F. Worker queue:** Pastikan `php artisan queue:work` aktif di terminal terpisah saat dev. Tambahkan instruksi ini ke balasan Claude.

### ✅ VERIFY 5
```bash
# Terminal 1: php artisan serve
# Terminal 2: php artisan queue:work
# Terminal 3:
TOKEN="..."
curl -X POST http://localhost:8000/api/tasks \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"text":"Bantu saya menyusun proposal skripsi tentang machine learning untuk deteksi penyakit kulit"}'
# → return task_id, status:processing

# Polling sampai status=completed (max 30 detik):
curl http://localhost:8000/api/tasks/{task_id}/status -H "Authorization: Bearer $TOKEN"

# Detail
curl http://localhost:8000/api/tasks/{task_id} -H "Authorization: Bearer $TOKEN"
# → harus ada >=3 sub_tasks dengan recommended_tools
```

---

## STAGE 6 — 🤖 Backend: Bookmarks + Smart Tagging (REQ-F05)

Tujuan: user bisa simpan tool ke library, LLM otomatis kasih prioritas + 5 keyword.

### 6.1 Yang harus Claude kerjakan:

**A. Model `app/Models/SavedLibrary.php`** — table `saved_libraries`, UUID PK, cast `semantic_keywords` ke array.

**B. Service `OpenAIService->classifyBookmark(ScrapedTool $tool, array $profile): array`** — return `['utility_priority' => 'must_try|very_good|niche|optional', 'semantic_keywords' => [5 string]]`. Pakai prompt KERNEL: persona = "agen auditor utilitas alat AI untuk mahasiswa". Force JSON output dengan schema kaku. Wajib **tepat 5 keywords**.

**C. Controller `BookmarkController.php`:**
- `store(Request $r)` — input `{ tool_id, note? }`. Bikin `SavedLibrary` (tagging_status=`pending`), dispatch `TaggingJob`, return 202.
- `index(Request $r)` — list bookmark dengan filter `priority`, `category`, `q` (cari di nama/keyword/note), `sort` (`latest|oldest|rating|az|za`).
- `destroy($toolId)` — `DELETE /api/bookmarks/{toolId}` hapus berdasarkan `tool_id` (bukan PK bookmark).
- `tags()` — `GET /api/bookmarks/tags` — flatten semua `semantic_keywords` user, unique, return array string.

**D. Job `app/Jobs/TaggingJob.php`** — call `OpenAIService->classifyBookmark`, update record dengan hasil, `tagging_status='completed'`.

**E. Route**:
```php
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/bookmarks',              [BookmarkController::class, 'index']);
    Route::post('/bookmarks',             [BookmarkController::class, 'store']);
    Route::delete('/bookmarks/{toolId}',  [BookmarkController::class, 'destroy']);
    Route::get('/bookmarks/tags',         [BookmarkController::class, 'tags']);
});
```

**F. Map response** — `priority_label` untuk frontend:
```php
// di Resource atau langsung di controller
'priority_label' => match($bookmark->utility_priority) {
    'must_try'  => 'Wajib Dicoba',
    'very_good' => 'Sangat Bagus',
    'niche'     => 'Bagus/Niche',
    'optional'  => 'Opsional/Alternatif',
}
```

### ✅ VERIFY 6
```bash
curl -X POST http://localhost:8000/api/bookmarks \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"tool_id":1,"note":"untuk bab 2"}'
# → 202 dengan tagging_status:pending

# Tunggu 5 detik (job jalan), cek lagi:
curl "http://localhost:8000/api/bookmarks?priority=must_try" -H "Authorization: Bearer $TOKEN"
# → semantic_keywords harus berisi 5 string, utility_priority terisi
```

---

## STAGE 7 — 🤖 Backend: Qdrant + RAG Chat (REQ-F04)

Tujuan: aktifkan vector search di Qdrant Cloud, ganti search dummy di Stage 3 dengan RAG hybrid, implementasi `POST /api/chat`.

### 7.1 USER kerjakan dulu:
1. Daftar Qdrant Cloud free tier: https://cloud.qdrant.io/ (1 GB free, cukup untuk MVP).
2. Buat cluster region **Singapore** (terdekat dengan user Indonesia).
3. Copy `URL` (contoh `https://xxx.eu-central.aws.cloud.qdrant.io:6333`) dan `API Key`.
4. Edit `leva-backend/.env`:
   ```env
   QDRANT_HOST=https://xxx.cloud.qdrant.io:6333
   QDRANT_API_KEY=your-qdrant-api-key
   ```

### 7.2 Yang Claude kerjakan:

**A. Install package** (tunggu approval USER):
```bash
composer require mcpuishor/qdrant-laravel
php artisan vendor:publish --provider="Mcpuishor\\QdrantLaravel\\QdrantServiceProvider"
```

**B. `app/Services/QdrantService.php`** — wrapper untuk:
- `ensureCollection()` — cek koleksi `tools_semantic_vectors` (dim 1536, distance Cosine), buat kalau belum ada. Index payload: `tool_mysql_id` (integer parameterized), `category_filter` (keyword), `extracted_description` (text).
- `upsertTool(ScrapedTool $tool)` — embed `name + description + category` via OpenAIService, upsert point dengan `id = $tool->qdrant_uuid` (generate UUID kalau null, save ke MySQL).
- `searchTools(string $query, ?string $categoryFilter, int $limit = 5, float $minScore = 0.85): array` — embed query, hybrid search (filter `category_filter` + vector similarity), return array `[ [tool_mysql_id, score], ... ]`.

**C. Command Artisan `app/Console/Commands/EmbedSeededTools.php`:**
```bash
php artisan leva:embed-tools
```
Loop semua `ScrapedTool` yang `qdrant_uuid` null, embed dan upsert. Print progress.

**D. Update `ToolController@search`** — pakai `QdrantService->searchTools`, fallback ke MySQL LIKE kalau Qdrant unavailable. Field `score` real, `why_recommended` di-generate LLM 1 kalimat berdasarkan tool + major user.

**E. Update `TaskDecompositionJob`** — di langkah pencarian tool per sub-task, ganti dari MySQL `where category=...` ke `QdrantService->searchTools($subTask['judul_tugas'] + ' ' + $subTask['kategori_alat_ai_yang_rekomendasi'], category, 3, 0.7)`.

**F. Model `ChatConversation` + `ChatMessage`** (table sudah dibuat di migration). Set relasi `hasMany`.

**G. Controller `ChatController.php`:**
- `send(Request $r)` — input `{ message, context_task_id? }`. Pipeline:
  1. Embed query.
  2. `QdrantService->searchTools(message, $user->profile->major, 5, 0.85)`.
  3. Kalau hasil kurang dari 1: turunkan threshold ke 0.7. Kalau masih kosong: return reply minta user reformulasi pertanyaan.
  4. Build prompt sistem dengan **kendala absolut**: "Hanya gunakan tools yang ada di context berikut. Dilarang merekomendasikan tools lain. Jawab dalam bahasa user."
  5. Suntik tools yang ditemukan ke prompt sebagai context.
  6. Call `gpt-4o-mini`. Simpan conversation + 2 messages.
  7. Return `{ reply, recommended_tools, conversation_id }`.
- `history()` — list conversation user.
- `clearHistory()` — `DELETE /api/chat/history` hapus semua.

**H. Route**:
```php
Route::middleware(['auth:sanctum', 'throttle:30,1'])->group(function () {
    Route::post('/chat',               [ChatController::class, 'send']);
    Route::get('/chat/history',        [ChatController::class, 'history']);
    Route::delete('/chat/history',     [ChatController::class, 'clearHistory']);
});
```

### ✅ VERIFY 7
```bash
php artisan leva:embed-tools
# → "Embedded 12 tools"

curl -X POST http://localhost:8000/api/chat \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"message":"tools terbaik untuk literature review jurnal IEEE"}'
# → reply natural language + recommended_tools dengan score >= 0.85
```

---

## STAGE 8 — 🤖 Backend: Webhook Scraper (OPSIONAL — bisa di-skip untuk MVP)

> **Skip jika** kamu belum mau bikin Python scraper. Endpoint dummy cukup untuk Stage berikutnya.

Yang Claude kerjakan:
- Middleware `app/Http/Middleware/ScraperSecret.php` — validasi header `X-Scraper-Secret == env('SCRAPER_SECRET_KEY')`. Return 403 kalau salah.
- Controller `ScraperWebhookController@store` — validasi payload (array of tools), upsert ke `scraped_tools` (unique on `url`), trigger `EmbedToolJob` per tool baru.
- Route: `Route::post('/internal/scraper-webhook', ...)->middleware(ScraperSecret::class);`
- USER set `SCRAPER_SECRET_KEY` di `.env` ke string acak ≥32 karakter (`openssl rand -hex 32`).

---

## STAGE 9 — 🤖 Frontend: Service Layer + Auth Flow

Tujuan: bangun layer Axios + auth, ganti `setUser` mock di OnboardingView dengan flow nyata.

### 9.1 Install + setup
Command (tunggu approve):
```bash
cd leva-frontend
npm install axios
```

### 9.2 Yang Claude kerjakan:

**A. Buat `leva-frontend/.env`:**
```env
VITE_API_BASE_URL=http://localhost:8000/api
```

**B. `src/services/api.js`** — Axios instance dengan interceptor Bearer token + handle 401 (clear `localStorage`, redirect onboarding). **Persis seperti contoh di `INTEGRATION_GUIDE.md` bagian 4.**

**C. `src/services/authService.js`** — method `register`, `login`, `logout`, `me`.

**D. `src/services/profileService.js`** — `create(payload)`, `get()`, `update(payload)`.

**E. `src/services/toolService.js`** — `list(params)`, `get(id)`, `search(q)`.

**F. `src/services/taskService.js`** — `submit(text, file)`, `list()`, `get(id)`, `status(id)`, `pollStatus(id, onComplete, onError)`, `updateSubTask(taskId, subTaskId, status)`, `delete(id)`. Polling interval 2 detik, timeout 60 detik.

**G. `src/services/bookmarkService.js`** — `list(params)`, `create(toolId, note)`, `delete(toolId)`, `tags()`.

**H. `src/services/chatService.js`** — `send(message, contextTaskId?)`, `history()`, `clearHistory()`.

**I. `src/utils/fieldMapper.js`** — sesuai INTEGRATION_GUIDE bagian 6: `mapOnboardingToApi`, `PRIORITY_LABELS` (4 level).

**J. Update `src/context/AppContext.jsx`:**
- Tambah `token` state (init dari `localStorage.getItem('leva_token')`).
- Tambah `bootstrap()` — di mount, kalau ada token → `authService.me()` → set user + redirect ke dashboard. Kalau gagal → clear token, stay onboarding.
- Hapus `mockSavedTools` & `historyTasks` import — ganti dengan state kosong, akan di-fetch per view.
- Sediakan `refreshSavedTools()`, `refreshHistoryTasks()` yang panggil service.

### ✅ VERIFY 9
- `npm run dev` jalan tanpa error.
- Buka DevTools Network: belum ada request (logical, belum ada view yang call). Kompilasi OK = lulus.

---

## STAGE 10 — 🤖 Frontend: Onboarding (Register + Profile flow)

Tujuan: ganti `handleStart` mock dengan alur register → login → save profile.

### Yang Claude kerjakan:

**A. Tambah field ke `OnboardingView.jsx` step 1:**
- Email (validasi format).
- Password (min 8 karakter, dengan toggle show/hide).
- Konfirmasi password.

**B. Tambah step "Gaya Belajar"** sebelum step terakhir:
- Pilihan radio: `visual`, `auditory`, `kinesthetic` dengan ilustrasi/icon.
- Simpan ke `form.learning_style`.

**C. Refactor `handleStart`:**
```js
const handleStart = async () => {
  setIsSubmitting(true);
  try {
    await authService.register(form.name, form.email, form.password);
    const user = await authService.login(form.email, form.password);
    if (user.status === 'PENDING') {
      await profileService.create(mapOnboardingToApi(form));
    }
    const fullUser = await authService.me();
    setUser(fullUser);
    setActiveView('dashboard');
    showToast('Selamat datang di Leva!', 'success');
  } catch (e) {
    const msg = e.response?.data?.message ?? 'Pendaftaran gagal. Coba lagi.';
    showToast(msg, 'error');
  } finally {
    setIsSubmitting(false);
  }
};
```

**D. Disable tombol "Mulai" saat `isSubmitting`** dan tampilkan spinner.

**E. Tambah handler "Sudah punya akun? Login"** di step 1 — tampilkan modal login sederhana yang call `authService.login` lalu `me()`.

### ✅ VERIFY 10
- Register user baru via UI → terus ke dashboard.
- Refresh browser → tetap di dashboard (token persist).
- Logout (akan dibikin di Stage 14) → kembali ke onboarding.

---

## STAGE 11 — 🤖 Frontend: Dashboard (Daily Widget + Tools)

Tujuan: ganti mockTools dengan API, tambah ringkasan harian.

### Yang Claude kerjakan:

**A. `DashboardView.jsx`** — di mount, `useEffect` panggil:
- `toolService.list({ per_page: 12 })` → set `tools` state.
- `taskService.list()` → hitung `tasks_hari_ini`, `subtasks_done_hari_ini`, `subtasks_pending`.

**B. Tambah komponen `DailyProgressWidget`** di atas grid tools:
- Greeting personal: "Selamat pagi/siang/sore/malam, {name}" (berdasarkan jam lokal).
- 3 stat card: **Tugas Hari Ini**, **Sub-tugas Selesai**, **Sub-tugas Tertunda**.
- Progress bar tipis: `% sub-task selesai dari total hari ini`.
- CTA "Lanjutkan Tugas Terakhir" → set `activeTask` ke task terakhir + `setActiveView('chat')`.

**C. Tools grid** — pakai data dari API (`tools` state), bukan `mockTools`.

**D. Tombol "Simpan ke Library"** pada card tool — call `bookmarkService.create(tool.id)`. Tampilkan toast "AI sedang men-tag tool... cek di Library beberapa detik lagi".

**E. Filter kategori** — kirim sebagai query param `?category=Research` ke API, jangan filter di client.

**F. State loading + empty + error** — wajib ditangani (skeleton loader, "Belum ada tools", retry button).

### ✅ VERIFY 11
- Dashboard load 12 tools dari API.
- Klik kategori filter → request baru ke `/api/tools?category=...`.
- Klik "Simpan" → tool muncul di Library setelah refresh.

---

## STAGE 12 — 🤖 Frontend: Chat & Task (REQ-F03 — alur inti)

Tujuan: ganti `runMockRag` dengan submit real + polling.

### Yang Claude kerjakan:

**A. `ChatWorkspaceView.jsx`** — refactor `submitTaskToRag`:
```js
const submitTaskToRag = async (payload) => {
  setIsLoading(true);
  setRagError(null);
  try {
    const result = await taskService.submit(payload.text, payload.attachedFile);
    setProcessingTaskId(result.task_id);

    taskService.pollStatus(
      result.task_id,
      async () => {
        const task = await taskService.get(result.task_id);
        setTaskTitle(task.title);
        setSubTasks(task.sub_tasks);
        setActiveTask({ id: task.task_id, title: task.title });
        setIsLoading(false);
        playSoundEffect('success');
      },
      (err) => {
        setRagError(RAG_ERROR_MESSAGE);
        setIsLoading(false);
      }
    );
  } catch (e) {
    setRagError(e.response?.data?.message ?? RAG_ERROR_MESSAGE);
    setIsLoading(false);
  }
};
```

**B. Map data dari API ke shape yang dipakai komponen `SubTaskCard`:**
- `actionable_title` → `title`
- `description` → `deskripsi`
- `tips` → `tips`
- `category` → `kategori`
- `estimated_duration` → `estimasi`
- `recommended_tools` → langsung pakai (sudah ada `id, name, url, category`)
- `status` → `status` (`done` / `next`)

**C. `onMarkDone`** — call `taskService.updateSubTask(taskId, subTaskId, 'done')`. Update local state setelah sukses.

**D. `handleFollowUp` / chat input** — call `chatService.send(message, activeTask?.id)`. Append reply ke timeline. Tampilkan `recommended_tools` sebagai chip yang bisa diklik untuk simpan ke library.

**E. Sidebar history** — `taskService.list()` → tampilkan, klik task → `taskService.get(id)` load ke workspace.

**F. Upload PDF** — pakai existing UI; tinggal pastikan `taskService.submit(null, file)` kirim multipart.

### ✅ VERIFY 12
- Submit teks "bantu saya susun skripsi tentang AI" → loading 15-25 detik → muncul 3-7 sub-tasks dengan rekomendasi tools.
- Tandai sub-task done → state berubah, persist setelah refresh.
- Upload PDF silabus → sub-tasks hasil ekstraksi muncul.
- Follow-up chat → reply natural + chips tool.

---

## STAGE 13 — 🤖 Frontend: Library (4-tier priority)

Tujuan: ganti mockSavedTools, naikkan filter prioritas dari 3 ke 4 level sesuai spec.

### Yang Claude kerjakan:

**A. `LibraryView.jsx`** — di mount: `bookmarkService.list()`. Map response ke shape internal.

**B. Filter prioritas** — ganti dari `['high', 'good', 'later']` ke 4 level dari `PRIORITY_LABELS`:
| key | label | warna |
|---|---|---|
| `must_try` | Wajib Dicoba | merah |
| `very_good` | Sangat Bagus | hijau |
| `niche` | Bagus/Niche | kuning/amber |
| `optional` | Opsional/Alternatif | abu-abu |

**C. Filter cloud tag** — pakai `bookmarkService.tags()` → tampilkan sebagai chip clickable, klik → set `q` query.

**D. Sort dropdown** — `latest|oldest|rating|az|za` → kirim ke API sebagai param.

**E. Tombol hapus** — modal konfirmasi (sudah ada komponen `Modal`), call `bookmarkService.delete(toolId)`.

**F. State `tagging_status === 'pending'`** — tampilkan badge "AI sedang men-tag..." pulsing, refresh tiap 5 detik sampai status `completed`.

### ✅ VERIFY 13
- Bookmark dari Stage 11 muncul.
- Filter `Wajib Dicoba` → request baru `/api/bookmarks?priority=must_try`.
- Cloud tag terbentuk dari semantic_keywords.
- Hapus bookmark → hilang dari list + toast konfirmasi.

---

## STAGE 14 — 🤖 Frontend: Profile / Settings + Logout

Tujuan: edit profil + logout.

### Yang Claude kerjakan:

**A. `ProfileView.jsx`** — di mount: `profileService.get()`. Form fields: `name` (read-only di awal), `major`, `semester`, `language_preference`, `learning_style`.

**B. Tombol "Simpan Perubahan"** — `profileService.update(payload)` → toast sukses → `profileHasUnsavedChanges = false`.

**C. Bagian "Statistik"** — call `taskService.list()` & `bookmarkService.list()` untuk count: total tugas selesai, total bookmark, kategori favorit.

**D. Tombol "Keluar (Logout)"** dengan modal konfirmasi:
```js
await authService.logout();
setUser(null);
setActiveView('onboarding');
```

**E. Toggle preferensi UX** — `soundEnabled` (sudah ada di context), simpan ke `localStorage.leva_prefs`.

### ✅ VERIFY 14
- Edit jurusan → simpan → refresh → masih tersimpan.
- Logout → kembali ke onboarding, token hilang.
- Login lagi → langsung dashboard, dashboard widget tampilkan stats benar.

---

## STAGE 15 — 🤖 Deployment ke Vercel + Hosting Backend

> **PENTING:** Vercel **tidak cocok** untuk Laravel (PHP serverless tidak support: queue worker long-running, binary `pdftotext`, file upload ke disk lokal). Frontend → Vercel; **backend perlu host terpisah**.

### 15.1 Frontend → Vercel (USER kerjakan)

`vercel.json` sudah ada. Langkah:
1. Push repo ke GitHub.
2. https://vercel.com/new → Import → pilih repo.
3. Root Directory: `leva-frontend`
4. Framework Preset: Vite (auto-detect dari `vercel.json`).
5. Environment Variables:
   - `VITE_API_BASE_URL=https://api-leva.example.com/api` (URL backend production)
6. Deploy.

### 15.2 Backend → Railway (rekomendasi termurah, region Singapore)

USER kerjakan:
1. https://railway.app/ → New Project → Deploy from GitHub → pilih repo, root `leva-backend`.
2. Tambah service **MySQL** (Railway provision otomatis). Copy `DATABASE_URL`.
3. Tambah service **Redis** untuk queue.
4. Set ENV vars di Railway dashboard:
   ```
   APP_KEY=base64:...     # generate: php artisan key:generate --show
   APP_ENV=production
   APP_DEBUG=false
   APP_URL=https://api-leva.up.railway.app
   DB_CONNECTION=mysql
   DB_HOST=${MYSQL.MYSQLHOST}
   DB_PORT=${MYSQL.MYSQLPORT}
   DB_DATABASE=${MYSQL.MYSQLDATABASE}
   DB_USERNAME=${MYSQL.MYSQLUSER}
   DB_PASSWORD=${MYSQL.MYSQLPASSWORD}
   QUEUE_CONNECTION=redis
   REDIS_HOST=${REDIS.REDISHOST}
   REDIS_PASSWORD=${REDIS.REDISPASSWORD}
   REDIS_PORT=${REDIS.REDISPORT}
   OPENAI_API_KEY=...
   QDRANT_HOST=https://xxx.cloud.qdrant.io:6333
   QDRANT_API_KEY=...
   FRONTEND_URL=https://leva.vercel.app
   ```
5. Tambahkan **2 service** dari repo yang sama:
   - **Web**: `php artisan serve --host 0.0.0.0 --port $PORT`
   - **Worker**: `php artisan queue:work --tries=3 --timeout=120`
6. Build command: `composer install --optimize-autoloader --no-dev && php artisan migrate --force && php artisan leva:embed-tools`

### 15.3 Yang Claude kerjakan:

**A. Buat `leva-backend/Dockerfile`** (multi-stage: PHP 8.3-fpm-alpine + poppler-utils + composer install).

**B. Buat `leva-backend/railway.json`** (atau `nixpacks.toml`) dengan startCommand.

**C. Update `config/cors.php`** untuk include domain Vercel:
```php
'allowed_origins' => [
    env('FRONTEND_URL', 'http://localhost:5173'),
    'https://leva.vercel.app',
    '/^https:\/\/leva-.*\.vercel\.app$/',  // preview deployments
],
```

**D. Buat script post-deploy** `php artisan optimize` + cache clear.

### ✅ VERIFY 15
- Buka URL Vercel → onboarding muncul.
- Register user baru → request ke Railway backend → 201.
- Submit task → polling → sub-tasks muncul.
- Cek Railway Logs: tidak ada error queue/migration.

---

## STAGE 16 — Smoke Test End-to-End (USER + CLAUDE bareng)

Checklist final yang harus PASS:

- [ ] Onboarding: register → fill profile → dashboard
- [ ] Dashboard: 12 tools tampil, daily widget akurat, kategori filter jalan
- [ ] Chat: submit teks → 3+ sub-tasks dengan rekomendasi tools dalam <30 detik
- [ ] Chat: upload PDF (silabus) → sub-tasks dari konten PDF
- [ ] Chat: tandai sub-task done → persist setelah refresh
- [ ] Chat follow-up: tanya "tools terbaik untuk analisis statistik" → reply + chips
- [ ] Library: bookmark dari dashboard → muncul setelah ~5 detik dengan priority + 5 keyword
- [ ] Library: filter 4-tier prioritas semua jalan
- [ ] Library: hapus bookmark → konfirmasi modal → hilang
- [ ] Profile: edit jurusan → save → refresh masih tersimpan
- [ ] Profile: logout → onboarding lagi
- [ ] Mobile: bottom nav, semua view responsive
- [ ] Network: tidak ada request 401/500 di tab DevTools saat happy path

---

## Catatan Kritis untuk Claude

1. **Jangan modify `mockData.js`** sampai Stage 11+. Beberapa view masih reference saat transisi.
2. **Jangan ubah PK convention** — UUID untuk user/task/bookmark, BIGINT untuk scraped_tools. Konsisten dengan migration yang sudah ada.
3. **Jangan tambah feature flag** atau backwards-compat shim — langsung ganti.
4. **Format response API harus persis** seperti `API_CONTRACT.md`. Frontend dibikin berdasarkan kontrak itu.
5. **Throttle wajib** di endpoint LLM (`/api/tasks`, `/api/chat`, `/api/tools/search`) — `throttle:30,1`.
6. **PDF dihapus setelah ekstraksi** (REQ-NF03) — jangan lupa `unlink()` di TaskDecompositionJob.
7. **Semua text user-facing dalam Bahasa Indonesia** (toast, error message, label).
8. **Setiap selesai stage**, beri ringkasan 5 baris + command verify yang harus user jalankan.
9. **Kalau stuck atau ada keputusan ambigu**, tanya user dulu — jangan asumsi.

Selesai membaca? Konfirmasi dengan: _"Saya sudah baca prompt revisi Leva dan siap mulai dari Stage 1. Mohon user kabari setelah database siap."_
