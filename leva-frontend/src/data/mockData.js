export const mockTools = [
  { id: 1, name: "Perplexity AI", category: "Research", iconKey: "search", url: "perplexity.ai", desc: "Mesin pencari berbasis AI dengan sumber terverifikasi. Ideal untuk literature review cepat.", detailDesc: "Cocok untuk mencari sumber awal tugas karena jawaban disertai sitasi yang bisa langsung dicek. Versi gratis cukup untuk riset harian, fitur lanjutan tersedia di paket berlangganan.", pricingType: "freemium", rating: 4.8, jurusan: ["Teknik Informatika", "Hukum", "Semua"] },
  { id: 2, name: "GitHub Copilot", category: "Coding", iconKey: "task", url: "github.com/copilot", desc: "Asisten koding AI dari GitHub yang membantu autocomplete dan debug kode secara real-time.", detailDesc: "Produktif untuk pairing saat ngerjain praktikum atau project coding. Performa terbaik tersedia lewat langganan berbayar.", pricingType: "paid", rating: 4.9, jurusan: ["Teknik Informatika"] },
  { id: 3, name: "Scite.ai", category: "Academic", iconKey: "book", url: "scite.ai", desc: "Temukan dan evaluasi referensi ilmiah dengan konteks sitasi langsung dari paper aslinya.", detailDesc: "Membantu bedakan paper yang mendukung atau membantah temuan penelitian. Versi dasar tersedia, fitur analisis lengkap ada di paket premium.", pricingType: "freemium", rating: 4.6, jurusan: ["Semua"] },
  { id: 4, name: "Julius AI", category: "Data", iconKey: "dashboard", url: "julius.ai", desc: "Analisis data dan buat visualisasi hanya dengan upload spreadsheet dan bertanya dalam bahasa natural.", detailDesc: "Praktis untuk mahasiswa yang butuh insight data cepat tanpa coding panjang. Paket gratis ada, kapasitas lebih besar tersedia di paket berbayar.", pricingType: "freemium", rating: 4.5, jurusan: ["Teknik Informatika", "Bisnis & Manajemen"] },
  { id: 5, name: "Grammarly", category: "Writing", iconKey: "pencil", url: "grammarly.com", desc: "Periksa grammar, tone, dan kejelasan tulisan akademikmu secara otomatis.", detailDesc: "Efektif untuk polishing laporan dan email akademik. Koreksi dasar gratis, saran lanjutan tersedia di paket premium.", pricingType: "freemium", rating: 4.7, jurusan: ["Semua"] },
  { id: 6, name: "Notion AI", category: "Productivity", iconKey: "folder", url: "notion.so", desc: "Workspace serba bisa dengan AI terintegrasi untuk nulis, organisir, dan merangkum catatan.", detailDesc: "Bagus untuk membuat workflow tugas dari brainstorming sampai checklist. Fitur AI tersedia lewat model langganan freemium.", pricingType: "freemium", rating: 4.6, jurusan: ["Semua"] },
  { id: 7, name: "Consensus", category: "Research", iconKey: "search", url: "consensus.app", desc: "Cari jawaban dari ribuan paper akademik peer-reviewed secara instan.", detailDesc: "Berfokus pada jawaban ringkas berbasis evidence dari jurnal ilmiah. Bisa dipakai gratis untuk kebutuhan pencarian dasar.", pricingType: "free", rating: 4.5, jurusan: ["Semua"] },
  { id: 8, name: "Codeium", category: "Coding", iconKey: "sparkles", url: "codeium.com", desc: "Alternatif Copilot gratis dengan kemampuan koding AI multi-bahasa pemrograman.", detailDesc: "Pilihan ekonomis untuk auto-complete dan assist coding harian. Cocok saat butuh opsi non-paywall.", pricingType: "free", rating: 4.4, jurusan: ["Teknik Informatika"] },
  { id: 9, name: "Elicit", category: "Academic", iconKey: "bot", url: "elicit.com", desc: "Otomatiskan literature review dan ekstraksi data dari paper ilmiah.", detailDesc: "Meringkas dan mengekstrak temuan paper dengan cepat untuk draft tinjauan pustaka. Tersedia paket gratis dengan batas penggunaan.", pricingType: "freemium", rating: 4.3, jurusan: ["Semua"] },
];

export const mockSubTasks = [
  {
    id: 1, title: "Cari Topik", status: "done", estimasi: "1–2 hari", kategori: "Research",
    deskripsi: "Langkah pertama dan sangat krusial adalah mencari topik. Topik yang kamu pilih harus selinear dengan jurusan Teknik Informatika yang kamu ambil dan memiliki novelty yang jelas. Pastikan topik bisa dijawab dengan penelitian yang kamu mampu lakukan dalam rentang waktu skripsi.",
    tips: "Gunakan Perplexity AI untuk riset cepat: minta 5 topik skripsi terbaru, lalu lanjutkan dengan prompt 'sertakan gap riset dan minimal 3 sumber 2022-2026' agar topik lebih tajam.",
    toolIds: [1, 3, 7],
  },
  {
    id: 2, title: "Cari Referensi atau Jurnal Terkait", status: "next", estimasi: "3–5 hari", kategori: "Academic",
    deskripsi: "Setelah topik ditentukan, kamu perlu mengumpulkan minimal 20–30 referensi dari jurnal ilmiah terindeks (Scopus, IEEE, ACM). Prioritaskan jurnal yang diterbitkan 5 tahun terakhir untuk memastikan relevansi dan kebaruan.",
    tips: "Di Scite.ai, pakai fitur Smart Citations untuk cek apakah paper 'supporting' atau 'contrasting', lalu prioritaskan referensi yang paling sering didukung untuk fondasi teorimu.",
    toolIds: [1, 3, 9],
  },
  {
    id: 3, title: "Menulis Draft", status: "next", estimasi: "2–4 minggu", kategori: "Writing",
    deskripsi: "Mulai dengan outline terlebih dahulu sebelum menulis draft penuh. Fokus pada BAB I (Pendahuluan) dan BAB II (Tinjauan Pustaka) dulu. Jangan fokus pada kesempurnaan di tahap ini — yang penting ide mengalir.",
    tips: "Gunakan Notion AI untuk menyusun kerangka BAB, lalu cek kejelasan kalimat di Grammarly agar draft tetap akademik, runtut, dan minim repetisi sejak awal.",
    toolIds: [5, 6, 2],
  },
  {
    id: 4, title: "Parafrase", status: "next", estimasi: "3–5 hari", kategori: "Writing",
    deskripsi: "Setelah draft selesai, pastikan setiap kalimat yang bersumber dari referensi sudah diparafrase dengan baik agar tidak terdeteksi sebagai plagiarisme. Parafrase bukan sekadar mengganti kata, tapi menyampaikan ulang ide dengan struktur kalimat yang berbeda.",
    tips: "Pakai QuillBot mode Formal untuk variasi struktur kalimat, lalu revisi manual agar istilah teknis tetap akurat. Hindari copy-paste mentah agar gaya tulis tetap konsisten.",
    toolIds: [5],
  },
  {
    id: 5, title: "Cek Similaritas", status: "next", estimasi: "1 hari", kategori: "Academic",
    deskripsi: "Sebelum submit ke dosen pembimbing, wajib cek similaritas menggunakan Turnitin atau tools serupa. Target persentase similaritas untuk skripsi Teknik Informatika umumnya di bawah 20%. Jika lebih, identifikasi bagian merah dan parafrase ulang.",
    tips: "Cek dulu dengan Copyleaks/PlagScan untuk skrining awal, lalu validasi final di Turnitin akun kampus. Fokus perbaikan pada blok teks merah yang panjang dan sitasi yang belum rapi.",
    toolIds: [3],
  },
];

export const mockSavedTools = [
  { id: 1, name: "Perplexity AI", url: "perplexity.ai", priority: "Prioritas Tinggi", priorityKey: "high", pricingType: "freemium", category: "Research", keywords: ["literature review", "sumber terverifikasi", "riset cepat", "academic search", "AI search"], savedAt: "3 Apr 2026", note: "Digunakan untuk bab 2 skripsi" },
  { id: 2, name: "Scite.ai", url: "scite.ai", priority: "Sangat Bagus", priorityKey: "good", pricingType: "freemium", category: "Academic", keywords: ["jurnal", "sitasi", "peer review", "referensi", "paper"], savedAt: "3 Apr 2026", note: "Alternatif Google Scholar yang lebih kontekstual" },
  { id: 3, name: "Notion AI", url: "notion.so", priority: "Prioritas Tinggi", priorityKey: "high", pricingType: "freemium", category: "Productivity", keywords: ["catatan", "outline", "workspace", "template", "organisir"], savedAt: "1 Apr 2026", note: "Untuk template BAB I skripsi" },
  { id: 4, name: "GitHub Copilot", url: "github.com/copilot", priority: "Prioritas Tinggi", priorityKey: "high", pricingType: "paid", category: "Coding", keywords: ["coding", "autocomplete", "debug", "python", "javascript"], savedAt: "28 Mar 2026", note: "Wajib untuk praktikum" },
  { id: 5, name: "Grammarly", url: "grammarly.com", priority: "Sangat Bagus", priorityKey: "good", pricingType: "freemium", category: "Writing", keywords: ["grammar", "parafrase", "writing", "english", "editing"], savedAt: "25 Mar 2026", note: "Untuk proofreading tulisan berbahasa Inggris" },
  { id: 6, name: "Julius AI", url: "julius.ai", priority: "Coba Nanti", priorityKey: "later", pricingType: "freemium", category: "Data", keywords: ["data analysis", "visualisasi", "spreadsheet", "chart", "statistik"], savedAt: "20 Mar 2026", note: "Mau coba untuk analisis data skripsi" },
];

export const historyTasks = [
  { id: 1, title: "Bantu saya susun skripsi", subtaskCount: 5, date: "5 Apr 2026", isActive: true },
  { id: 2, title: "Gimana cara belajar koding dari 0", subtaskCount: 4, date: "3 Apr 2026" },
  { id: 3, title: "Ajarkan saya kalkulus OSN", subtaskCount: 6, date: "1 Apr 2026" },
  { id: 4, title: "Resume review untuk magang", subtaskCount: 3, date: "28 Mar 2026" },
  { id: 5, title: "Analisis jurnal hukum tata negara", subtaskCount: 5, date: "25 Mar 2026" },
];
