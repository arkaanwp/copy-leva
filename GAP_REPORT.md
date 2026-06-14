# Laporan Gap dan Rencana Kerja — Leva

> **Versi:** 1.1.0 (diselaraskan dengan SRS IEEE Leva)  
> **Tanggal:** 2026-05-04  
> **Referensi Spesifikasi:** Dokumen Konsep Dasar dan SRS Proyek Leva

---

## Bagian 1: Analisis Frontend

### 1a. Inventarisasi Halaman/Screen

| View | File | Fungsi | Data dari API | Aksi ke Backend |
|------|------|--------|---------------|-----------------|
| Onboarding | `OnboardingView.jsx` | Profiling wajib: nama, jurusan, semester, bahasa (REQ-F01) | — | `POST /api/auth/register` → `POST /api/auth/login` → `POST /api/profile` |
| Dashboard | `DashboardView.jsx` | Tampilkan tools AI rekomendasi, filter kategori (REQ-F04) | Tools terfilter per major | `GET /api/tools`, `POST /api/bookmarks` |
| Chat & Task | `ChatWorkspaceView.jsx` | Input tugas/PDF → sub-tasks atomik + rekomendasi tools (REQ-F03, REQ-F04) | Sub-tasks + tools per sub-task | `POST /api/tasks`, `GET /api/tasks/{id}/status`, `PATCH sub-tasks`, `POST /api/chat` |
| Library | `LibraryView.jsx` | Kelola bookmark: filter prioritas 4-level, sort, hapus (REQ-F05) | Bookmarks + semantic keywords | `GET /api/bookmarks`, `DELETE /api/bookmarks/{id}`, `POST /api/bookmarks` |
| Profile | `ProfileView.jsx` | Edit profil, statistik, logout | Data profil user | `GET /api/auth/me`, `PUT /api/profile`, `POST /api/auth/logout` |

### 1b. Status API Call Frontend

**Hasil:** Frontend **belum memiliki satu pun API call nyata**. Semua data dari `mockData.js` dan React state lokal. Tidak ada `fetch()`, `axios`, atau library HTTP apapun.

### 1c. Mismatch Field Frontend vs Backend

| Field di Frontend | Field di Backend | Perlakuan |
|-------------------|-----------------|-----------|
| `jurusan` | `major` | ⚠️ Wajib di-map di service frontend |
| `bahasa` (`Indonesia`/`English`) | `language_preference` (`id`/`en`) | ⚠️ Wajib konversi nilai + rename |
| `semester` (string `"6"`) | `semester` (integer `6`) | ⚠️ Wajib parse ke integer |
| `name` | `name` | ✅ Sama |
| — | `learning_style` | ⚠️ Belum ada di form frontend, perlu ditambahkan |
| `priorityKey: 'high'/'good'/'later'` | `utility_priority: 'must_try'/'very_good'/'niche'/'optional'` | ⚠️ Mapping 3→4 level (sesuai spesifikasi) |

### 1d. Mismatch Teknologi

| Aspek | Kondisi Saat Ini | Target Spesifikasi | Rekomendasi |
|-------|-----------------|-------------------|-------------|
| Framework | React 18 | Vue.js + Pinia | Gunakan prototype React sebagai referensi visual; implementasi ulang di Vue |
| State | React Context API | Pinia | Pola Context → Store Pinia relatif mudah dikonversi |
| HTTP Client | Belum ada | Axios | Tambah Axios + interceptor Bearer Token |
| Routing | Single-page (tidak ada router) | Vue Router | Tambah Vue Router + route guard auth |
| Build Tool | Vite | Vite | ✅ Kompatibel |

---

## Bagian 2: Analisis Backend

### 2a. Route API yang Sudah Ada

| Method | URI | Controller@Method | Middleware | Status Kontrak |
|--------|-----|-------------------|------------|---------------|
| POST | `/api/register` | `AuthController@register` | — | ⚠️ Perlu pindah ke `/api/auth/register` |
| POST | `/api/login` | `AuthController@login` | — | ⚠️ Perlu pindah ke `/api/auth/login` |
| POST | `/api/onboarding` | `OnboardingController@store` | `auth:sanctum` | ⚠️ Perlu pindah ke `/api/profile` |
| GET | `/api/me` | `AuthController@me` | `auth:sanctum` | ⚠️ Perlu pindah ke `/api/auth/me` |

**Belum ada:** logout, profile read/update, tools, tasks, chat, bookmarks, webhook.

### 2b. Model Database yang Sudah Ada

| Model | Tabel | Kolom Fillable | Relasi |
|-------|-------|----------------|--------|
| `User` | `users` | name, email, password, status | `hasOne(UserProfile)` |
| `UserProfile` | `user_profiles` | user_id, major, semester, language_preference, learning_style | `belongsTo(User)` |

**Catatan penting:** Backend menggunakan UUID sebagai PK di semua tabel. Spesifikasi menyebut BIGINT pada tabel `scraped_tools`, `tasks_master`, `atomic_sub_tasks` — ini keputusan desain yang perlu diklarifikasi dengan tim. Migration yang sudah dibuat di proyek ini tetap menggunakan UUID untuk `tasks_master` dan `atomic_sub_tasks` (konsisten dengan pola bestehend), namun `scraped_tools` menggunakan BIGINT auto-increment sesuai spesifikasi (karena akan menjadi FK integer di `saved_libraries` dan payload Qdrant `tool_mysql_id`).

### 2c. Skema Database Aktual (Sebelum Migration Baru)

```
Tabel: users
  - id (UUID, PK)
  - name (string)
  - email (string, unique)
  - password (string, auto-hashed by Laravel)
  - status (ENUM: PENDING/ACTIVE, default: PENDING, indexed)
  - email_verified_at (timestamp, nullable)
  - remember_token (string)
  - created_at, updated_at

Tabel: user_profiles
  - id (UUID, PK)
  - user_id (UUID, FK → users.id, unique, cascade delete)
  - major (string)
  - semester (integer)
  - language_preference (string)   ← spec: language_pref — functionally equivalent
  - learning_style (string)        ← tidak ada di spec, tambahan backend
  - created_at, updated_at

Tabel: personal_access_tokens (Sanctum standard)
Tabel: sessions, password_reset_tokens, cache, cache_locks, jobs (Laravel standard)
```

### 2d. Gap Analysis Skema Database vs Spesifikasi

| Tabel Dibutuhkan (Spesifikasi Tabel 3) | Status | Catatan |
|---------------------------------------|--------|---------|
| `users` | ✅ Ada | Nama kolom minor berbeda: `password` (bukan `password_hash`) — Laravel hash otomatis |
| `user_profiles` | ✅ Ada — ⚠️ Minor | `language_preference` vs `language_pref` di spec (equivalent); ada `learning_style` extra |
| `scraped_tools` | ✅ Migration Dibuat | `id` BIGINT, `name`, `url`, `description`, `qdrant_uuid` + field tambahan: category, pricing_type, rating |
| `tasks_master` | ✅ Migration Dibuat | `task_id` UUID (penyesuaian dari BIGINT spec untuk konsistensi codebase), `user_id`, `source_pdf_hash` |
| `atomic_sub_tasks` | ✅ Migration Dibuat | `sub_task_id` UUID, `parent_task_id`, `actionable_title`, `status` + field tambahan: description, tips, category, estimated_duration, recommended_tool_ids, order |
| `saved_libraries` | ✅ Migration Dibuat | `user_id`, `tool_id`, `utility_priority` (4 level sesuai spec), `semantic_keywords` JSON (tepat 5 keywords per spec) |
| `chat_conversations` | ✅ Migration Dibuat | Tidak ada di spec, tapi dibutuhkan untuk fitur riwayat chat (REQ-F04) |
| `chat_messages` | ✅ Migration Dibuat | Idem |

### 2e. Gap Package Composer

| Package | Kebutuhan | Status |
|---------|-----------|--------|
| `laravel/sanctum` | Auth token | ✅ Ada |
| `spatie/pdf-to-text` | Ekstrak teks dari PDF (REQ-F03, Bagian 4.3) | 🔧 Belum ada |
| Qdrant PHP client | Koneksi ke Qdrant vector DB | 🔧 Belum ada (pilihan: `mcpuishor/qdrant-laravel` atau `wontonee/laravel-qdrant-sdk`) |
| OpenAI PHP client | Generate embedding + LLM call | 🔧 Belum ada |

---

## Bagian 3: Kebutuhan Non-Fungsional dari Spesifikasi

| Kode | Atribut | Parameter | Implikasi Implementasi |
|------|---------|-----------|----------------------|
| REQ-NF01 | Penghindaran Anti-Bot | Python scraper pakai `curl_cffi` + BoringSSL untuk bypass Cloudflare WAF di `theresanaiforthat.com/timeline/` | Python microservice terpisah; bukan bagian Laravel |
| REQ-NF02 | Latensi Pengambilan | Kueri Qdrant < 50 milidetik | Deploy Qdrant + Laravel di region yang sama (Jakarta / GCP `asia-southeast2`) |
| REQ-NF03 | Keamanan Data | TLS 1.3 end-to-end; PDF di `tmpfs`, hapus otomatis setelah ekstraksi | Configure HTTPS + tmpfs di server production |

---

## Bagian 4: Tabel Status 24 Endpoint

| No | Endpoint | Method | Status Backend | Status Frontend | Prioritas |
|----|----------|--------|----------------|-----------------|-----------|
| 1 | `/api/auth/register` | POST | ⚠️ Ada di `/api/register` | 🔧 Belum ada | Tinggi |
| 2 | `/api/auth/login` | POST | ⚠️ Ada di `/api/login` | 🔧 Belum ada | Tinggi |
| 3 | `/api/auth/logout` | POST | 🔧 Belum ada | 🔧 Belum ada | Tinggi |
| 4 | `/api/auth/me` | GET | ⚠️ Ada di `/api/me` | 🔧 Belum ada | Tinggi |
| 5 | `/api/profile` (create) | POST | ⚠️ Ada di `/api/onboarding` | 🔧 Belum ada | Tinggi |
| 6 | `/api/profile` (read) | GET | 🔧 Belum ada | 🔧 Belum ada | Tinggi |
| 7 | `/api/profile` (update) | PUT | 🔧 Belum ada | 🔧 Belum ada | Tinggi |
| 8 | `/api/tools` | GET | 🔧 Belum ada | 🔧 Belum ada | Tinggi |
| 9 | `/api/tools/{id}` | GET | 🔧 Belum ada | 🔧 Belum ada | Sedang |
| 10 | `/api/tools/search` | GET | 🔧 Belum ada | 🔧 Belum ada | Sedang |
| 11 | `/api/tasks` (create) | POST | 🔧 Belum ada | 🔧 Belum ada | Tinggi |
| 12 | `/api/tasks` (list) | GET | 🔧 Belum ada | 🔧 Belum ada | Tinggi |
| 13 | `/api/tasks/{taskId}` | GET | 🔧 Belum ada | 🔧 Belum ada | Tinggi |
| 14 | `/api/tasks/{taskId}/sub-tasks/{subTaskId}` | PATCH | 🔧 Belum ada | 🔧 Belum ada | Tinggi |
| 15 | `/api/tasks/{taskId}` | DELETE | 🔧 Belum ada | 🔧 Belum ada | Sedang |
| 16 | `/api/chat` | POST | 🔧 Belum ada | 🔧 Belum ada | Tinggi |
| 17 | `/api/chat/history` | GET | 🔧 Belum ada | 🔧 Belum ada | Sedang |
| 18 | `/api/chat/history` | DELETE | 🔧 Belum ada | 🔧 Belum ada | Rendah |
| 19 | `/api/bookmarks` (create) | POST | 🔧 Belum ada | 🔧 Belum ada | Tinggi |
| 20 | `/api/bookmarks` (list) | GET | 🔧 Belum ada | 🔧 Belum ada | Tinggi |
| 21 | `/api/bookmarks/{toolId}` | DELETE | 🔧 Belum ada | 🔧 Belum ada | Tinggi |
| 22 | `/api/bookmarks/tags` | GET | 🔧 Belum ada | 🔧 Belum ada | Sedang |
| 23 | `/api/tasks/{taskId}/status` | GET | 🔧 Belum ada | 🔧 Belum ada | Tinggi |
| 24 | `/api/internal/scraper-webhook` | POST | 🔧 Belum ada | N/A (internal) | Sedang |

---

## Bagian 5: Migration yang Sudah Dibuat (Sesi Ini)

| File Migration | Tabel | Status |
|----------------|-------|--------|
| `2026_05_04_080000_create_scraped_tools_table.php` | `scraped_tools` | ✅ Siap dijalankan |
| `2026_05_04_080100_create_tasks_master_table.php` | `tasks_master` | ✅ Siap dijalankan |
| `2026_05_04_080200_create_atomic_sub_tasks_table.php` | `atomic_sub_tasks` | ✅ Siap dijalankan |
| `2026_05_04_080300_create_saved_libraries_table.php` | `saved_libraries` | ✅ Siap dijalankan |
| `2026_05_04_080400_create_chat_tables.php` | `chat_conversations`, `chat_messages` | ✅ Siap dijalankan |

**Seeder Dummy yang Dibuat:**
- `ScrapedToolsSeeder.php` — 12 AI tools dari mockData.js + 3 tambahan
- `DemoUserSeeder.php` — 1 user demo + profil + 5 sub-tasks + 6 bookmark + 1 chat

**Cara menjalankan:**
```bash
php artisan migrate
php artisan db:seed
```

---

## Bagian 6: Urutan Pengerjaan Backend (Sprint)

### Sprint 1 — Fondasi Auth & Routing (3–5 hari)
```
Backend:
  - [ ] Refactor routes/api.php: pindah ke prefix /auth/*
  - [ ] Tambah POST /api/auth/logout
  - [ ] Tambah GET /api/profile + PUT /api/profile
  - [ ] Aktifkan CORS: config/cors.php untuk localhost:5173
  - [ ] composer require spatie/pdf-to-text
  - [ ] php artisan migrate + php artisan db:seed

Frontend (paralel):
  - [ ] npm install axios
  - [ ] Buat src/services/api.js (Axios instance + interceptor)
  - [ ] Ganti AppContext mock dengan API call nyata
  - [ ] Implementasi alur register → login → onboarding → dashboard
  - [ ] Field mapping: jurusan→major, bahasa→id/en, semester→parseInt
  - [ ] Tambahkan field learning_style di OnboardingView step 2
```

### Sprint 2 — Core AI: Tools & Task Decomposition (5–7 hari)
```
Backend:
  - [ ] Buat ScrapedTool model + ToolController (CRUD + search MySQL)
  - [ ] Buat Task model + TaskController (store → dispatch Job)
  - [ ] Buat SubTask model + PATCH sub-task endpoint
  - [ ] Buat TaskDecompositionJob (PDF extract → LLM → JSON parse → simpan)
  - [ ] GET /api/tasks/{id}/status untuk polling
  - [ ] composer require openai-php/laravel (untuk LLM call)

Frontend:
  - [ ] GET /api/tools → ganti mockTools di Dashboard
  - [ ] POST /api/tasks → ganti runMockRag di ChatWorkspace
  - [ ] Polling loop /api/tasks/{id}/status setiap 2 detik
  - [ ] Tampilkan sub-tasks dari API (ganti mockSubTasks)
```

### Sprint 3 — Bookmarks & RAG Chat (5–7 hari)
```
Backend:
  - [ ] Buat SavedLibrary model + BookmarkController
  - [ ] Buat TaggingJob (LLM → priority + 5 keywords)
  - [ ] Setup Qdrant (Docker) + client PHP
  - [ ] Upsert dummy tools ke Qdrant setelah seed
  - [ ] Implementasi POST /api/chat dengan RAG pipeline
  - [ ] Buat ChatConversation + ChatMessage model

Frontend:
  - [ ] GET /api/bookmarks → ganti mockSavedTools di Library
  - [ ] Pindah filter priority: 3 level → 4 level (sesuai spec)
  - [ ] POST /api/bookmarks → sambungkan tombol "Simpan"
  - [ ] DELETE /api/bookmarks → sambungkan tombol "Hapus"
  - [ ] POST /api/chat → ganti handleFollowUp mock
```

### Sprint 4 — Scraper, Polishing, Infrastructure (3–5 hari)
```
Backend:
  - [ ] POST /api/internal/scraper-webhook + middleware secret key
  - [ ] IP whitelist untuk webhook endpoint
  - [ ] Opsional: Laravel Echo + WebSocket event TaskCompleted
  - [ ] Ganti QUEUE_CONNECTION=database → redis di .env
  - [ ] Terapkan throttle pada endpoint AI (30 req/menit)

Python Microservice (terpisah):
  - [ ] Script Python curl_cffi scrape theresanaiforthat.com/timeline/
  - [ ] Cron job 24 jam → POST ke /api/internal/scraper-webhook

Infrastructure:
  - [ ] Deploy backend ke GCP asia-southeast2 (Jakarta) — REQ-NF02
  - [ ] Deploy Qdrant container di region yang sama
  - [ ] CDN (Cloudflare) untuk static assets frontend
  - [ ] HTTPS + TLS 1.3 — REQ-NF03
```

---

## Bagian 7: Peringatan Keamanan

| # | Peringatan | Severity | Action |
|---|-----------|----------|--------|
| 1 | ⚠️ Bearer token disimpan di `localStorage` rentan XSS | Sedang | Pertimbangkan `httpOnly cookie` via Sanctum SPA mode |
| 2 | ⚠️ Scraper webhook tanpa IP whitelist | Tinggi | Tambah middleware IP whitelist + rate limit ketat |
| 3 | ⚠️ PDF upload hanya cek ekstensi | Sedang | Validasi MIME type di backend + scan konten |
| 4 | ⚠️ CORS masih `allowed_origins: ['*']` default | Tinggi | Set ke domain spesifik sebelum production |
| 5 | ⚠️ Tidak ada rate limiting di endpoint LLM (chat/search) | Sedang | Terapkan `throttle:30,1` minimal |
