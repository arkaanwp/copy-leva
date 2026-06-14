# Smoke Test Frontend End-to-End (Stage 16)

Berikut adalah checklist audit dan smoke test untuk memastikan frontend Leva berjalan dengan baik dan mematuhi kontrak API backend. Jika terjadi error 500 atau CORS dari sisi backend, frontend telah dipersiapkan dengan _fallback_ (pesan aman) agar aplikasi tidak mengalami *crash*.

## Checklist Flow Utama

| Fitur / Flow | Status | Cara Cek | File Frontend Terkait | Endpoint Backend | Catatan Error (Jika Ada) |
|---|---|---|---|---|---|
| **Onboarding: Register & Login** | ✅ | Isi form onboarding langkah 1-4, klik "Masuk ke Dashboard". | `OnboardingView.jsx`, `authService.js` | `POST /auth/register`, `POST /auth/login` | Jika email sudah ada, error "Pendaftaran gagal" ditangkap dan ditampilkan aman. |
| **Onboarding: Create Profile** | ✅ | Lanjut dari register, pilih jurusan/semester, submit. | `OnboardingView.jsx`, `profileService.js` | `POST /profile` | Jika session "PENDING", otomatis diarahkan ke Step 2. |
| **Dashboard: Tampil 12 Tools** | ✅ | Buka halaman dashboard, scroll daftar tools. | `DashboardView.jsx`, `toolService.js` | `GET /tools` | Menampilkan pesan "Dashboard belum bisa dimuat" jika backend mati. |
| **Dashboard: Filter Kategori** | ✅ | Klik chip kategori di dashboard. | `DashboardView.jsx`, `toolService.js` | `GET /tools?category=...` | Mengirim parameter query sesuai kontrak. |
| **Chat: Submit Teks & Polling** | ✅ | Ketik tugas di chat, enter. Tunggu indikator AI. | `ChatWorkspaceView.jsx`, `taskService.js` | `POST /tasks`, `GET /tasks/{id}/status`, `GET /tasks/{id}` | Polling berhenti saat status 'completed' atau 'failed'. |
| **Chat: Upload PDF** | ✅ | Klik tombol attach, pilih PDF, kirim. | `ChatWorkspaceView.jsx`, `taskService.js` | `POST /tasks` (multipart/form-data) | File dikirim dengan key `pdf_file`. |
| **Chat: Tandai Sub-Task Done** | ✅ | Klik checklist/tombol 'Tandai Selesai' di sub-task. | `ChatWorkspaceView.jsx`, `taskService.js` | `PATCH /tasks/{id}/sub-tasks/{subId}` | Status diperbarui tanpa me-refresh seluruh halaman. |
| **Chat: Follow-up Tanya Tools** | ✅ | Di mode 'Chat', ketik pertanyaan rekomendasi tools. | `ChatWorkspaceView.jsx`, `chatService.js` | `POST /chat` | Response memunculkan `recommended_tools` sebagai chips. |
| **Library: Tampil Bookmark** | ✅ | Buka Library, cek tools yang sudah di-save. | `LibraryView.jsx`, `bookmarkService.js` | `GET /bookmarks` | Menggunakan data dari API, bukan mock. |
| **Library: Filter Priority 4-Tier** | ✅ | Klik chip priority (Must Try, dsb). | `LibraryView.jsx`, `bookmarkService.js` | `GET /bookmarks?priority=...` | Priority: `must_try`, `very_good`, `niche`, `optional`. |
| **Library: Badge "AI men-tag"** | ✅ | Save tool baru, lihat badge tagging pending. | `LibraryView.jsx` | `GET /bookmarks` | Polling berjalan sampai tag/priority terisi. |
| **Library: Hapus Bookmark** | ✅ | Klik 'Hapus', konfirmasi modal. | `LibraryView.jsx`, `bookmarkService.js` | `DELETE /bookmarks/{toolId}` | Memakai `tool.id` sesuai kontrak endpoint. |
| **Profile: Edit & Save Info** | ✅ | Buka Profile, edit jurusan/bahasa, klik Simpan. | `ProfileView.jsx`, `profileService.js` | `GET /profile`, `PUT /profile` | Data tersimpan, saat refresh tidak berubah. |
| **Profile: Logout** | ✅ | Klik Keluar, konfirmasi. | `ProfileView.jsx`, `authService.js` | `POST /auth/logout` | Token lokal dihapus, redirect ke Onboarding. |

## Audit Service & Response Shape
- Seluruh service frontend (`authService`, `profileService`, dll) **sudah menggunakan `api.js`**.
- File `api.js` **hanya membaca `import.meta.env.VITE_API_BASE_URL`**, tidak ada *hardcode* `localhost` di komponen.
- API Response Mapping telah diaudit. Semua *response parsing* (`data.data.token`, `data.data.user`, `data.data.tools`, dsb) telah dicocokkan dengan standar service.
- *Error Handling*: Setiap *catch* _block_ memberikan pesan Bahasa Indonesia ramah ("Backend belum terhubung", dll).

## Audit Mobile Responsiveness
- Bottom navigation bar tidak terpotong atau menutupi isi view (padding bawah sudah memadai).
- Semua card (Task, Library, Profile) menyesuaikan layar (flex-wrap & grid responsive).
- Modals menampilkan overlay gelap dan box dialog di tengah tanpa menyebabkan *horizontal scroll*.

## Build Check (Production Readiness)
- `npm run build` berhasil (tidak ada *missing imports* atau error *syntax* React).
- Frontend siap di-deploy ke Vercel dengan *environment variables* yang sesuai.

*Catatan QA: Proses pengecekan manual tidak memerlukan perubahan pada file backend sedikitpun.*

## Catatan Perbaikan Bug (Post-Smoke Test)
Beberapa bug yang ditemukan selama proses Smoke Test telah diperbaiki:
- **BUG-001 (Library)**: Statistik "Sangat Bagus" dsb sudah dihitung akurat berdasarkan normalisasi data (Fixed, Needs Verification).
- **BUG-002 (Library)**: Tag cloud (sidebar TAG) sudah tampil dengan mengekstrak dari bookmark jika response API tags kosong (Fixed, Needs Verification).
- **BUG-003 (Chat Workspace)**: Polling `tasks/status` kini berhenti secara otomatis jika user berpindah halaman (unmount) (Fixed, Needs Verification).
- **BUG-004 (Library)**: Loading UI tidak akan lagi _stuck_ jika user memindah filter secara cepat karena diterapkan mekanisme _race-condition check_ dengan `useRef` (Fixed, Needs Verification).
- **BUG-005 (Library)**: Tool manual kini dicari dari backend dan disave via tool_id, tidak hilang setelah refresh (Fixed, Needs Verification).
- **BUG-006 (Library)**: Statistik "Sangat Bagus" sekarang bertambah berkat canonical priority (Fixed, Needs Verification).
- **BUG-007 (Dashboard)**: Tombol Simpan di Dashboard berhasil memakai method service alias `create` (Fixed, Needs Verification).
- **BUG-008 (App)**: Request looping `/tasks` dan `/bookmarks` berhasil diatasi dengan `useCallback` dan guard (Fixed, Needs Verification).
- **BUG-009 (Landing)**: Landing Page tidak lagi auto-redirect ke Dashboard saat token valid. Navigasi hanya terjadi via tombol CTA (Fixed, Needs Verification).
- **BUG-010 (i18n)**: Sistem i18n ditambahkan. Mengubah bahasa di Profile langsung mengubah teks Sidebar, Dashboard, Library, dan Profile (Fixed, Needs Verification).

## Checklist Verifikasi Lanjutan
* [ ] Search tool yang ada, misalnya Perplexity AI.
* [ ] Search tool yang belum ada, misalnya Gemini.
* [ ] Tool kosong menampilkan empty state.
* [ ] Tool yang ada bisa disimpan permanen.
* [ ] Tambah tool dari Library menghasilkan POST `/api/bookmarks`
* [ ] Payload POST `/bookmarks` berisi `tool_id`
* [ ] Setelah refresh/relog, bookmark tetap muncul
* [ ] Dashboard Simpan menghasilkan POST `/api/bookmarks`
* [ ] Statistik Sangat Bagus sesuai jumlah bookmark `very_good`
* [ ] Saat berada di Library, tidak ada request `/api/tasks` berulang
* [ ] `GET /bookmarks` tidak loop terus-menerus
* [ ] Hapus `leva_token`, refresh → Landing tetap ditampilkan saat scroll
* [ ] Token valid + refresh → Landing tetap ditampilkan sampai klik tombol
* [ ] Klik "Masuk" saat token valid → langsung ke Dashboard
* [ ] Klik "Masuk" tanpa token → ke Onboarding/Login
* [ ] Klik "Mulai Gratis" → ke Onboarding/Register
* [ ] Profile → ubah bahasa ke English → Simpan
* [ ] Sidebar berubah ke English tanpa refresh
* [ ] Library empty state berubah ke English
* [ ] Dashboard label utama berubah ke English
* [ ] Chat & Task empty state berubah ke English
* [ ] Chat & Task placeholder berubah ke English
* [ ] Chat processing message berubah ke English
* [ ] Chat completion overlay berubah ke English
* [ ] Chat leave modal berubah ke English
* [ ] Chat right panel (tool recommendations, tips) berubah ke English
* [ ] Chat subtask buttons (Mark Done/Undo) berubah ke English
* [ ] Toast dan modal berubah ke English
* [ ] Profile → ubah kembali ke Indonesia
* [ ] Setelah refresh, bahasa tetap sesuai preferensi terakhir
* [ ] PUT `/api/profile` mengirim `language_preference`
* [ ] Tidak ada enum backend yang berubah karena diterjemahkan
* [ ] Library bisa dibuka tanpa crash
* [ ] Filter priority tampil dalam Bahasa Indonesia
* [ ] Ubah bahasa ke English, filter priority berubah ke English
* [ ] Console tidak menampilkan `PRIORITY_OPTIONS is not defined`

## Skenario 3: Uji Dark Mode
* [ ] Profile -> pilih Dark Mode
* [ ] Dashboard berubah ke dark mode
* [ ] Sidebar tetap terbaca
* [ ] Library tetap terbaca
* [ ] Chat & Task tetap terbaca
* [ ] Profile tetap terbaca
* [ ] Modal dan toast tetap terbaca
* [ ] Input dan placeholder tetap terbaca
* [ ] Refresh browser, theme tetap dark
* [ ] Pilih Light Mode, tampilan kembali terang
* [ ] Language preference tetap berfungsi setelah theme berubah


* [ ] Set language ke English
* [ ] Dashboard greeting berubah ke English
* [ ] Dashboard stat cards berubah ke English
* [ ] Dashboard progress text berubah ke English
* [ ] Featured tools title/subtitle berubah ke English
* [ ] Tool buttons berubah ke Save/Saving/Saved/Open
* [ ] Error state berubah ke English
* [ ] Retry button berubah ke Try Again
* [ ] Set language kembali ke Indonesia
* [ ] Semua teks Dashboard kembali ke Bahasa Indonesia


## Skenario 4: Keterbacaan Input Form Onboarding & Register
* [ ] Onboarding full name input text is visible
* [ ] Email input text is visible
* [ ] Password input text is visible
* [ ] Confirm password input text is visible
* [ ] Login modal input text is visible
* [ ] Inputs are readable in light mode
* [ ] Inputs are readable in dark mode
* [ ] Placeholder text remains readable
* [ ] Password show/hide button remains readable
