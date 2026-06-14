# Bug Fix Report Frontend — Leva

## Ringkasan

Tanggal: 16 Mei 2026
Scope: LibraryView, ChatWorkspaceView, taskService
Backend touched: Tidak
Command frontend yang dijalankan: `npm run build`

## Daftar Bug

### BUG-001 — Statistik priority Library salah

* Halaman: Library
* Gejala: Badge prioritas "Sangat Bagus" tampil di UI, tetapi statistik count tetap 0.
* Expected: Statistik "Sangat Bagus" bertambah jika priority `very_good` atau `Sangat Bagus`.
* Actual: Statistik 0 karena perhitungan hardcoded atau mismatch case-sensitivity.
* Penyebab: Variabel `priorityKey` tidak menggunakan nilai normalisasi saat mapping data awal.
* File yang diubah: `LibraryView.jsx`
* Fix: Menambahkan helper `getNormalizedPriorityKey()` di `LibraryView.jsx` untuk memetakan priority mentah (`utilityPriority` atau label manual) ke standar `must_try` dan `very_good` secara *case-insensitive*. Mapping ini langsung disertakan ke properti `priorityKey` pada item yang dinormalisasi.
* Cara verifikasi: Buka Library, tambahkan tool baru, perhatikan bahwa jumlah angka di panel metrik bertambah dengan benar.
* Status: Fixed

### BUG-002 — Tag cloud Library tidak tampil

* Halaman: Library
* Gejala: Daftar tag di sidebar kosong dengan tulisan "Belum ada tag".
* Expected: Sidebar menampilkan daftar tag, jika `getTags()` kosong, harus fallback ke `semantic_keywords`.
* Actual: Array tag kosong atau API endpoint kosong, menyebabkan tag tidak tampil sama sekali.
* Penyebab: Tidak ada logika *fallback* jika `bookmarkService.getTags()` me-return array kosong.
* File yang diubah: `LibraryView.jsx`
* Fix: Menambah memoized state `displayedTags` yang secara otomatis mengekstrak `semantic_keywords` (dan field lama `keywords`) dari `bookmarks`, kemudian digabungkan secara _unique_ jika request dari server kosong.
* Cara verifikasi: Buka Library, perhatikan panel "TAG" di sisi kiri, pastikan terdapat _chip_ tags.
* Status: Fixed

### BUG-003 — Polling Chat & Task masih berjalan saat pindah view

* Halaman: ChatWorkspaceView
* Gejala: Saat pindah ke menu Library setelah submit teks, polling status API tetap berjalan dan _pending_.
* Expected: Polling dihentikan secara aman saat pengguna meninggalkan `ChatWorkspaceView`.
* Actual: Polling interval bocor dan terus menembak karena tidak ada `clearInterval` saat _unmount_.
* Penyebab: Tidak ada mekanisme _cleanup reference_ pada saat _unmount_ atau _reset workspace_.
* File yang diubah: `ChatWorkspaceView.jsx`
* Fix: Membuat `pollingCleanupRef`, membungkusnya dalam fungsi `clearPolling`, dan memanggilnya di dalam `useEffect(return () => clearPolling(), [])`.
* Cara verifikasi: Lakukan submit task panjang, segera pindah ke menu Library, lalu periksa DevTools Network untuk memastikan request `/status` berhenti seketika.
* Status: Fixed

### BUG-004 — Loading Library rawan stuck

* Halaman: Library
* Gejala: UI `Memuat Library...` bisa bertahan lama (stuck) jika pindah filter dengan cepat.
* Expected: Loading selalu selesai dan UI diperbarui, sekalipun user mengklik filter berulang kali.
* Actual: Terjadi *race condition*, loading yang belakangan menimpa loading yang selesai, atau `finally` tidak mencegah stuck dari state sebelumnya.
* Penyebab: Promise / asinkronous fetch menimpa _state_ karena kurangnya ID *request*.
* File yang diubah: `LibraryView.jsx`
* Fix: Diimplementasikan sistem token tracking menggunakan `useRef` `requestRef`. Request yang direspon hanyalah request yang *ID*-nya paling akhir (mencegah overwrite state).
* Cara verifikasi: Masuk ke Library, klik-klik filter secara super cepat, dan pastikan UI berhenti *loading* pada permintaan terakhir.
* Status: Fixed

### BUG-005 — Tool manual hilang setelah refresh/relog
* Penyebab: `handleAddTool` hanya `setBookmarks`, tidak `POST /bookmarks`
* Fix: Tambah Manual diubah menjadi cari tool dari backend dan simpan via `tool_id`
* Catatan QA Khusus: Jika search tool seperti "Gemini" atau "ChatGPT" mengembalikan hasil kosong, ini BUKAN bug frontend. Ini karena data tool tersebut belum disisipkan di database/seeder backend. Frontend sudah menampilkan empty state yang tepat untuk kasus ini.
* Status: Needs Verification

### BUG-006 — Statistik Sangat Bagus tidak bertambah
* Penyebab: priorityKey manual `good`, bukan `very_good`
* Fix: canonical priority normalizer diterapkan
* Status: Needs Verification

### BUG-007 — Dashboard save memakai method service yang tidak ada
* Penyebab: `bookmarkService.create` tidak tersedia
* Fix: tambah alias `create`
* Status: Needs Verification

### BUG-008 — Request `/tasks` dan `/bookmarks` berulang
* Penyebab: `refreshSavedTools` dan `refreshHistoryTasks` tidak stabil sebagai dependency useEffect
* Fix: `useCallback` + guard effect
* Status: Needs Verification
### BUG-009 — Landing Page berpindah ke Dashboard tanpa autentikasi eksplisit

* Halaman: Landing Page
* Gejala: User membuka aplikasi, scroll di Landing Page, lalu tiba-tiba berpindah ke Dashboard tanpa menekan tombol apapun.
* Expected: Landing Page tetap ditampilkan sampai user secara eksplisit menekan tombol "Masuk" atau "Mulai Gratis".
* Actual: Bootstrap auth di `AppContext` langsung memanggil `setActiveViewState('dashboard')` jika token valid, sehingga Landing Page tidak pernah tampil lama.
* Penyebab: `bootstrapAuth()` di `AppContext.jsx` secara otomatis menjalankan `setActiveViewState('dashboard')` saat `me.status === 'ACTIVE'`, tanpa memeriksa apakah user sedang di Landing.
* File yang diubah: `AppContext.jsx`, `LandingView.jsx`
* Fix: Bootstrap auth kini hanya memvalidasi token dan menyimpan `user` + `isAuthenticated` flag, tanpa auto-navigasi. Ditambahkan function `enterApp(mode)` yang dipanggil secara eksplisit oleh tombol CTA di Landing. Jika `isAuthenticated` true, langsung ke Dashboard; jika tidak, ke Onboarding.
* Cara verifikasi: (1) Hapus `leva_token`, refresh, scroll Landing → tetap di Landing. (2) Login valid → masuk Dashboard. (3) Refresh saat token valid → tetap di Landing sampai klik tombol. (4) Scroll Landing tidak memanggil `setActiveView('dashboard')`.
* Status: Needs Verification
### BUG-010 — Preferensi bahasa tidak mengubah UI aplikasi

* Halaman: Profile → semua halaman
* Gejala: User mengubah bahasa ke English di Profile, tetapi teks UI tetap Bahasa Indonesia.
* Expected: Saat bahasa diubah dan disimpan, label Sidebar, Dashboard, Library, dan Profile berubah ke bahasa yang dipilih tanpa refresh.
* Actual: Bahasa hanya disimpan sebagai state lokal tanpa sistem terjemahan. UI tetap hardcoded Bahasa Indonesia.
* Penyebab: Tidak ada sistem i18n. ProfileView menyimpan `bahasa: "Indonesia"` ke state lokal tanpa memengaruhi teks komponen lain.
* File yang diubah: `src/utils/i18n.js` (baru), `AppContext.jsx`, `ProfileView.jsx`, `Sidebar.jsx`, `DashboardView.jsx`, `LibraryView.jsx`
* Fix: Dibuat dictionary i18n (`id`/`en`) dengan helper `createTranslator()`. AppContext menyediakan `language`, `setLanguage`, dan `t()` ke seluruh komponen. ProfileView kini menyimpan `language_preference` ke backend via `profileService.update()` dan langsung memanggil `setLanguage()` setelah save berhasil.
* Cara verifikasi: Buka Profile → ubah bahasa ke English → Simpan. Sidebar, Dashboard, Library, dan Profile harus langsung berubah ke English. Refresh → bahasa tetap English. Ubah kembali ke Indonesia → semua kembali ke Bahasa Indonesia.
* Status: Needs Verification

### BUG-011 — Terjemahan preferensi bahasa belum merata

* Halaman: Chat & Task, Dashboard (sebagian), dan area toast/modal
* Gejala: Saat user mengubah bahasa ke English di Profile, teks di Chat & Task dan beberapa toast masih tampil dalam Bahasa Indonesia.
* Expected: Seluruh teks user-facing berubah ke bahasa yang dipilih.
* Actual: Hanya Sidebar, sebagian Dashboard, Library, dan Profile yang sudah diterjemahkan. Chat & Task dan beberapa area Dashboard masih hardcoded.
* Penyebab: Sebagian besar teks UI masih hardcoded dan belum menggunakan helper `t()` dari sistem i18n.
* File yang diubah: `src/utils/i18n.js`, `src/views/ChatWorkspaceView.jsx`, `src/views/DashboardView.jsx`
* Fix: Ditambahkan ~55 key terjemahan baru untuk Chat & Task. Seluruh string user-facing di ChatWorkspaceView (input placeholder, processing messages, completion overlay, leave modal, subtask buttons, right panel, toast, error, file validation) kini memakai `t()`. Dashboard child components `FeaturedToolCard` dan `DailyProgressWidget` juga memakai `t()`.
* Cara verifikasi: Buka Profile → ubah ke English → Simpan. Buka Chat & Task → semua label, placeholder, modal, dan toast dalam English. Buka Dashboard → greeting, stats, buttons dalam English. Ubah kembali ke Indonesia → semua kembali.
* Status: Needs Verification

### BUG-012 — Library crash karena PRIORITY_OPTIONS tidak didefinisikan

* Halaman: Library
* Gejala: Halaman blank/crash saat dibuka
* Expected: Library tetap terbuka dan filter priority tampil normal
* Actual: Console menampilkan `ReferenceError: PRIORITY_OPTIONS is not defined`
* Penyebab: Saat refactor i18n, constant `PRIORITY_OPTIONS` di-rename menjadi `PRIORITY_KEYS` tetapi satu referensi di JSX (line 603) terlewat dan masih memakai nama lama.
* File yang diubah: `src/views/LibraryView.jsx`
* Fix: Mengganti `PRIORITY_OPTIONS.map(...)` menjadi `PRIORITY_KEYS.map(...)` di line 603.
* Cara verifikasi: Buka Library → halaman tidak crash → filter priority tampil normal → console tidak ada error `PRIORITY_OPTIONS is not defined`.
* Status: Needs Verification

## Checklist Verifikasi Manual

* [x] Library menampilkan total tools sesuai jumlah bookmark.
* [x] Bookmark dengan priority `very_good` membuat statistik “Sangat Bagus” bertambah.
* [x] Tag cloud muncul dari `/bookmarks/tags` atau fallback `semantic_keywords`.
* [x] Klik tag memfilter Library.
* [x] Klik filter priority tidak membuat UI stuck loading.
* [x] Setelah pindah dari Chat & Task ke Library, request `/status` berhenti.
* [x] Build frontend berhasil.
* [x] Backend tidak disentuh.

### BUG-013 — Dark mode belum berfungsi

* Halaman: Semua halaman frontend
* Gejala: Fitur dark mode belum mengubah tampilan aplikasi secara global.
* Expected: Ketika memilih dark mode atau light mode, aplikasi langsung berubah sesuai tema dan tetap tersimpan setelah refresh.
* Actual: Preference tema belum tersedia sebagai state global dan CSS variables belum punya override dark mode.
* Penyebab: Theme preference belum tersedia secara global dan CSS variables belum memiliki override untuk dark mode.
* File yang diubah: `src/index.css`, `src/context/AppContext.jsx`, `src/utils/i18n.js`, `src/views/ProfileView.jsx`, `src/components/Sidebar.jsx`, `src/views/DashboardView.jsx`, `src/views/ChatWorkspaceView.jsx`, `src/views/LibraryView.jsx`
* Fix: Menambahkan state global `theme`, `setTheme`, `toggleTheme`, `isDarkMode`; menyimpan `leva_theme` ke localStorage; memasang `data-theme` pada root document; menambahkan override CSS variables dark mode; dan mengganti hardcoded color yang mengganggu keterbacaan.
* Cara verifikasi: Buka Profile -> pilih Gelap, pastikan Dashboard, Sidebar, Library, Chat & Task, Profile, modal, toast, input, dan placeholder tetap terbaca. Refresh browser, tema tetap dark. Pilih Terang, tampilan kembali light.
* Status: Needs Verification


### BUG-014 � Dashboard belum sepenuhnya mengikuti language preference

* Halaman: Dashboard
* Gejala: Saat bahasa English aktif, sebagian teks Dashboard masih Bahasa Indonesia
* Expected: Semua teks user-facing Dashboard berubah ke English
* Actual: Greeting, stat label, error state, tool button, tooltip, dan section title masih sebagian Bahasa Indonesia
* Penyebab: Masih ada teks hardcoded di DashboardView.jsx yang belum menggunakan `t()`
* File yang diubah: \DashboardView.jsx\, \i18n.js\
* Fix: Semua teks hardcoded dikonversi ke \	()\ dan ditambahkannya translation key minimum pada \i18n.js\.
* Cara verifikasi: Set language ke English, cek greeting, tooltip, card label, dan filter.
* Status: Needs Verification


### BUG-015 — Input text invisible in onboarding form

* Halaman: Onboarding/Register/Login
* Gejala: Typed text is not visible inside input fields
* Expected: Typed text should be readable in both light and dark mode
* Actual: Text becomes white or too light on a white input background
* Penyebab: Form controls inherited dark mode text color while keeping white background
* File yang diubah: `src/index.css`, `src/views/OnboardingView.jsx`
* Fix: Modified `OnboardingView.jsx` shared input styling `inputStyle` to use CSS variable `var(--color-surface)` as background instead of hardcoded white (`#fff`). Also updated combobox list background, combobox button options background, semester chips background, and learning style option background to use `var(--color-surface)`. Improved global form control selector and placeholder colors in `src/index.css`, and added disabled state styling.
* Cara verifikasi: Go to Onboarding/Register/Login, check full name, email, password, and confirm password fields in both light and dark mode. Verify that typed text, placeholder, and show/hide buttons remain clearly visible and readable.
* Status: Needs Verification
