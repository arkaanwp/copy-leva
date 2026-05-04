# Kontrak API Leva — Dokumen Lengkap

> **Versi:** 1.1.0 (diselaraskan dengan spesifikasi IEEE Leva)  
> **Tanggal:** 2026-05-04  
> **Base URL:** `http://localhost:8000/api`  
> **Format respons:** JSON  
> **Autentikasi:** Laravel Sanctum (Bearer Token)  
> **Referensi Spesifikasi:** Dokumen Konsep Dasar dan SRS Proyek Leva (IEEE 830-1998)

---

## Konvensi Umum

### Format Respons Sukses
```json
{
  "message": "Keterangan operasi",
  "data": { ... }
}
```

### Format Respons Error Validasi (HTTP 422)
```json
{
  "message": "The given data was invalid.",
  "errors": {
    "field_name": ["Pesan error spesifik."]
  }
}
```

### Status User
| Nilai | Keterangan |
|-------|-----------|
| `PENDING` | Baru registrasi, belum menyelesaikan onboarding (profil kosong) |
| `ACTIVE` | Onboarding selesai — profil tersimpan ke Qdrant sebagai vector parameter |

### Kuadran Prioritas Bookmark (REQ-F05, Bagian 4.4 Spesifikasi)
| Nilai DB | Label UI | Keterangan |
|----------|----------|-----------|
| `must_try` | 🔴 Wajib Dicoba | Fungsionalitas inti yang mengubah permainan untuk jurusan tersebut |
| `very_good` | 🟢 Sangat Bagus | Efisiensi tinggi, direkomendasikan kuat |
| `niche` | 🟡 Bagus/Niche | Situasional atau untuk tugas spesifik |
| `optional` | ⚪ Opsional/Alternatif | Duplikasi fungsional dari alat yang lebih kuat |

---

## A. Autentikasi

---

### POST /api/auth/register

**Nama:** Registrasi Pengguna Baru  
**Fitur:** Fondasi Sistem  
**Auth:** Public  
**Status:** ⚠️ Perlu Dimodifikasi (route saat ini: `/api/register`, perlu prefix `/auth`)

#### Request Body
```json
{
  "name": "string",               // Nama lengkap, maks 255 karakter
  "email": "string",              // Format email valid, unik
  "password": "string",           // Min 8 karakter
  "password_confirmation": "string"
}
```

#### Response Sukses (HTTP 201)
```json
{
  "message": "User registered successfully",
  "data": {
    "id": "uuid",
    "name": "Renisa Assyifa Putri",
    "email": "renisa@example.com",
    "status": "PENDING"
  }
}
```

#### Response Error
| HTTP Code | Kondisi | Contoh Pesan |
|-----------|---------|--------------|
| 422 | Email sudah terdaftar | `"The email has already been taken."` |
| 422 | Password tidak cocok | `"The password field confirmation does not match."` |

#### Catatan Implementasi
- Status user otomatis `PENDING` → user harus selesaikan onboarding (POST /api/profile) untuk akses dashboard
- Token belum diberikan saat registrasi — harus login dulu
- Data profil dari onboarding nantinya disimpan sebagai **atribut vektor berparameter** di Qdrant (REQ-F01)

---

### POST /api/auth/login

**Nama:** Login dan Dapatkan Bearer Token  
**Auth:** Public  
**Status:** ⚠️ Perlu Dimodifikasi (route saat ini: `/api/login`)

#### Request Body
```json
{
  "email": "string",
  "password": "string"
}
```

#### Response Sukses (HTTP 200)
```json
{
  "message": "Login successful",
  "data": {
    "user": {
      "id": "uuid",
      "name": "Renisa Assyifa Putri",
      "email": "renisa@example.com",
      "status": "ACTIVE"
    },
    "token": "1|abc123tokenstring..."
  }
}
```

#### Response Error
| HTTP Code | Kondisi | Pesan |
|-----------|---------|-------|
| 401 | Email/password salah | `"Invalid credentials"` |
| 422 | Field wajib kosong | `"The email field is required."` |

#### Catatan Implementasi
- Cek `status` setelah login: jika `PENDING` → redirect ke onboarding; jika `ACTIVE` → redirect ke dashboard

---

### POST /api/auth/logout

**Nama:** Logout dan Cabut Token  
**Auth:** Bearer Token (Sanctum)  
**Status:** 🔧 Perlu Dibuat

#### Response Sukses (HTTP 200)
```json
{
  "message": "Logged out successfully"
}
```

#### Catatan Implementasi
- Gunakan `$request->user()->currentAccessToken()->delete()` — hanya cabut token aktif saat ini
- Frontend hapus token dari `localStorage` dan redirect ke halaman login

---

### GET /api/auth/me

**Nama:** Ambil Data User yang Sedang Login  
**Auth:** Bearer Token (Sanctum)  
**Status:** ⚠️ Perlu Dimodifikasi (route saat ini: `/api/me`)

#### Response Sukses (HTTP 200)
```json
{
  "message": "Current user retrieved successfully",
  "data": {
    "user": {
      "id": "uuid",
      "name": "Renisa Assyifa Putri",
      "email": "renisa@example.com",
      "status": "ACTIVE",
      "profile": {
        "major": "Teknik Informatika",
        "semester": 6,
        "language_preference": "id",
        "learning_style": "visual"
      }
    }
  }
}
```

Jika profil belum diisi (`status: PENDING`): field `profile` akan `null`.

---

## B. Profil Pengguna — REQ-F01 (Profiling Kontekstual)

> **Konteks Spesifikasi:** Data profil (jurusan, semester, preferensi bahasa) disimpan sebagai atribut vektor berparameter dalam instance Qdrant untuk memfasilitasi operasi pemfilteran kueri secara real-time.

---

### POST /api/profile

**Nama:** Buat Profil Kontekstual (Onboarding)  
**Fitur:** REQ-F01  
**Auth:** Bearer Token (Sanctum)  
**Status:** ⚠️ Perlu Dimodifikasi (route saat ini: `/api/onboarding`)

#### Request Body
```json
{
  "major": "string",              // Nama jurusan, maks 255 karakter
  "semester": 6,                  // Integer 1–14
  "language_preference": "id",    // "id" (Indonesia) atau "en" (English)
  "learning_style": "visual"      // "visual", "auditory", "kinesthetic"
}
```

> **⚠️ Catatan Mismatch Frontend:** Frontend mengirim field `jurusan` (→ `major`) dan `bahasa` (→ `language_preference`). Perlu mapping di layer service frontend.

#### Response Sukses (HTTP 200)
```json
{
  "message": "Onboarding completed successfully",
  "data": {
    "user": {
      "id": "uuid",
      "name": "Renisa Assyifa Putri",
      "email": "renisa@example.com",
      "status": "ACTIVE",
      "profile": {
        "major": "Teknik Informatika",
        "semester": 6,
        "language_preference": "id",
        "learning_style": "visual"
      }
    }
  }
}
```

#### Response Error
| HTTP Code | Kondisi | Pesan |
|-----------|---------|-------|
| 409 | Profil sudah pernah dibuat | `"User already completed onboarding."` |
| 422 | Validasi gagal | `"The major field is required."` |

#### Catatan Implementasi
- Setelah profil tersimpan ke MySQL, trigger async job untuk upsert profil ke Qdrant sebagai payload filter
- Status user berubah `PENDING` → `ACTIVE` dalam satu transaksi database

---

### GET /api/profile

**Nama:** Ambil Profil Pengguna  
**Fitur:** REQ-F01  
**Auth:** Bearer Token (Sanctum)  
**Status:** 🔧 Perlu Dibuat

#### Response Sukses (HTTP 200)
```json
{
  "message": "Profile retrieved successfully",
  "data": {
    "profile": {
      "id": "uuid",
      "major": "Teknik Informatika",
      "semester": 6,
      "language_preference": "id",
      "learning_style": "visual",
      "updated_at": "2026-04-15T07:30:00Z"
    }
  }
}
```

---

### PUT /api/profile

**Nama:** Update Profil Pengguna  
**Fitur:** REQ-F01  
**Auth:** Bearer Token (Sanctum)  
**Status:** 🔧 Perlu Dibuat

#### Request Body (semua field opsional)
```json
{
  "major": "string",
  "semester": 7,
  "language_preference": "en",
  "learning_style": "auditory"
}
```

#### Catatan Implementasi
- Jika `major` berubah, trigger job async untuk update payload filter di Qdrant
- Dipakai oleh `ProfileView.jsx` saat user menekan "Simpan Perubahan"

---

## C. Alat AI / Scraped Tools — REQ-F02 & REQ-F04

---

### GET /api/tools

**Nama:** Ambil Daftar Alat AI  
**Fitur:** REQ-F02 (data dari scraper), REQ-F04 (filter per profil)  
**Auth:** Bearer Token (Sanctum)  
**Status:** 🔧 Perlu Dibuat

#### Query Parameters
| Parameter | Tipe | Default | Keterangan |
|-----------|------|---------|-----------|
| `page` | integer | 1 | Nomor halaman |
| `per_page` | integer | 12 | Maks 50 |
| `category` | string | — | `Research`, `Writing`, `Coding`, `Data`, `Academic`, `Productivity` |
| `pricing` | string | — | `free`, `freemium`, `paid`, `opensource` |

#### Response Sukses (HTTP 200)
```json
{
  "message": "Tools retrieved successfully",
  "data": {
    "tools": [
      {
        "id": 1,
        "name": "Perplexity AI",
        "url": "perplexity.ai",
        "description": "Mesin pencari berbasis AI dengan sumber terverifikasi.",
        "category": "Research",
        "pricing_type": "freemium",
        "rating": 4.8,
        "qdrant_uuid": "uuid-string"
      }
    ],
    "pagination": {
      "current_page": 1,
      "per_page": 12,
      "total": 12,
      "last_page": 1
    }
  }
}
```

#### Catatan Implementasi
- Idealnya filter berdasarkan `major` user dari profil untuk personalisasi (Dashboard)
- Data diisi oleh Python scraper via webhook internal setiap 24 jam (REQ-F02)

---

### GET /api/tools/{id}

**Nama:** Detail Satu Alat AI  
**Auth:** Bearer Token (Sanctum)  
**Status:** 🔧 Perlu Dibuat

#### Response Sukses (HTTP 200)
```json
{
  "message": "Tool retrieved successfully",
  "data": {
    "tool": {
      "id": 1,
      "name": "Perplexity AI",
      "url": "perplexity.ai",
      "description": "...",
      "category": "Research",
      "pricing_type": "freemium",
      "rating": 4.8,
      "qdrant_uuid": "uuid-string",
      "scraped_at": "2026-05-04T00:00:00Z"
    }
  }
}
```

---

### GET /api/tools/search

**Nama:** Cari Alat AI via Hybrid Search Qdrant  
**Fitur:** REQ-F04 — Rekomendasi Terkonteks  
**Auth:** Bearer Token (Sanctum)  
**Status:** 🔧 Perlu Dibuat

> **Konteks Spesifikasi:** Sistem melakukan pencarian hibrida di Qdrant: dense vector similarity (cosine) + sparse vector filtering berdasarkan profil user (major, language). Skor relevansi minimum hasil teratas: **0.85** (REQ-F04).

#### Query Parameters
| Parameter | Tipe | Wajib | Keterangan |
|-----------|------|-------|-----------|
| `q` | string | Ya | Query teks bebas dari user |
| `limit` | integer | Tidak | Default 5, maks 20 |

#### Response Sukses (HTTP 200)
```json
{
  "message": "Search completed successfully",
  "data": {
    "query": "tools untuk literature review skripsi",
    "results": [
      {
        "id": 1,
        "name": "Perplexity AI",
        "url": "perplexity.ai",
        "description": "Mesin pencari berbasis AI...",
        "category": "Research",
        "pricing_type": "freemium",
        "score": 0.94,
        "why_recommended": "Relevan untuk mahasiswa Teknik Informatika yang membutuhkan alat riset akademik terverifikasi."
      }
    ]
  }
}
```

#### Response Error
| HTTP Code | Kondisi | Pesan |
|-----------|---------|-------|
| 422 | Query kosong | `"The q field is required."` |
| 503 | Qdrant tidak tersedia | `"Search service temporarily unavailable."` |

#### Catatan Implementasi
- Embed query menggunakan OpenAI `text-embedding-3-small` (dimensi 1536)
- Query ke koleksi Qdrant: `tools_semantic_vectors`
- Filter Qdrant: `category_filter` = kategori jurusan user (parameterized index)
- Fallback ke MySQL `LIKE` query jika Qdrant tidak tersedia (REQ-NF02: latency < 50ms)

---

## D. Dekomposisi Tugas / PDF — REQ-F03

> **Konteks Spesifikasi:** LLM menggunakan paradigma KERNEL prompt engineering. Output JSON wajib berisi: `judul_tugas`, `estimasi_waktu`, `kategori_alat_ai_yang_rekomendasi`. PDF di-parse oleh `spatie/pdf-to-text`. Pemrosesan < 5 detik (REQ-F03).

---

### POST /api/tasks

**Nama:** Submit Tugas untuk Dekomposisi Async  
**Fitur:** REQ-F03  
**Auth:** Bearer Token (Sanctum)  
**Status:** 🔧 Perlu Dibuat

#### Request (multipart/form-data atau JSON)

**Opsi A — Upload PDF (maks 10MB):**
```
pdf_file: [file binary .pdf]
description: "Deskripsi opsional" (opsional)
```

**Opsi B — Teks Mentah:**
```json
{
  "text": "Bantu aku susun skripsi tentang machine learning untuk deteksi penyakit",
  "description": "Opsional"
}
```

#### Response Sukses (HTTP 202 Accepted)
```json
{
  "message": "Task submitted for processing",
  "data": {
    "task_id": "uuid",
    "status": "processing",
    "estimated_seconds": 25,
    "poll_url": "/api/tasks/uuid/status"
  }
}
```

#### Catatan Implementasi
- HTTP 202 (bukan 200) — proses async via Laravel Queue + Redis (REQ dari spesifikasi)
- Job pipeline: ekstrak teks PDF (`spatie/pdf-to-text`) → chunk → LLM → parse JSON → query Qdrant per sub-task → simpan ke `tasks_master` + `atomic_sub_tasks`
- Format JSON dari LLM yang diharapkan:
```json
[
  {
    "judul_tugas": "Cari Topik",
    "estimasi_waktu": "1–2 hari",
    "kategori_alat_ai_yang_rekomendasi": "Research"
  }
]
```
- PDF disimpan sementara di `tmpfs`, dihapus otomatis setelah ekstraksi (REQ-NF03)
- Simpan `source_pdf_hash` (SHA-256) untuk deduplication

---

### GET /api/tasks

**Nama:** Daftar Semua Task Milik User  
**Auth:** Bearer Token (Sanctum)  
**Status:** 🔧 Perlu Dibuat

#### Response Sukses (HTTP 200)
```json
{
  "message": "Tasks retrieved successfully",
  "data": {
    "tasks": [
      {
        "task_id": "uuid",
        "title": "Menyusun Skripsi Teknik Informatika",
        "status": "completed",
        "sub_tasks_count": 5,
        "completed_count": 2,
        "source_type": "text",
        "created_at": "2026-05-04T10:00:00Z"
      }
    ],
    "pagination": {
      "current_page": 1,
      "total": 5,
      "last_page": 1
    }
  }
}
```

---

### GET /api/tasks/{taskId}

**Nama:** Detail Task Beserta Sub-Tasks  
**Auth:** Bearer Token (Sanctum)  
**Status:** 🔧 Perlu Dibuat

#### Response Sukses (HTTP 200)
```json
{
  "message": "Task retrieved successfully",
  "data": {
    "task": {
      "task_id": "uuid",
      "title": "Menyusun Skripsi Teknik Informatika",
      "status": "completed",
      "source_type": "text",
      "created_at": "2026-05-04T10:00:00Z",
      "sub_tasks": [
        {
          "sub_task_id": "uuid",
          "actionable_title": "Cari Topik",
          "description": "Langkah pertama dan sangat krusial...",
          "tips": "Gunakan Perplexity AI untuk riset cepat...",
          "status": "done",
          "category": "Research",
          "estimated_duration": "1–2 hari",
          "order": 1,
          "recommended_tools": [
            {
              "id": 1,
              "name": "Perplexity AI",
              "url": "perplexity.ai",
              "category": "Research"
            }
          ]
        }
      ]
    }
  }
}
```

---

### PATCH /api/tasks/{taskId}/sub-tasks/{subTaskId}

**Nama:** Update Status Sub-Task  
**Fitur:** REQ-F03 (Atomic Habits — loop kebiasaan)  
**Auth:** Bearer Token (Sanctum)  
**Status:** 🔧 Perlu Dibuat

#### Request Body
```json
{
  "status": "done"    // "done" atau "next"
}
```

#### Response Sukses (HTTP 200)
```json
{
  "message": "Sub-task updated successfully",
  "data": {
    "sub_task": {
      "sub_task_id": "uuid",
      "actionable_title": "Cari Topik",
      "status": "done"
    }
  }
}
```

---

### DELETE /api/tasks/{taskId}

**Nama:** Hapus Task Beserta Sub-Tasks  
**Auth:** Bearer Token (Sanctum)  
**Status:** 🔧 Perlu Dibuat

#### Response Sukses (HTTP 200)
```json
{
  "message": "Task deleted successfully"
}
```

---

### GET /api/tasks/{taskId}/status

**Nama:** Polling Status Pemrosesan Task Async  
**Fitur:** REQ-F03 (fallback polling jika WebSocket belum aktif)  
**Auth:** Bearer Token (Sanctum)  
**Status:** 🔧 Perlu Dibuat

#### Response Sukses (HTTP 200)
```json
{
  "message": "Task status retrieved",
  "data": {
    "task_id": "uuid",
    "status": "completed",
    "progress_message": "Sub-tasks berhasil dibuat",
    "sub_tasks_count": 5,
    "ready": true
  }
}
```

| Status | Keterangan |
|--------|-----------|
| `processing` | Job sedang berjalan di queue |
| `completed` | Dekomposisi selesai |
| `failed` | Gagal — sertakan `error_message` |

#### Catatan Implementasi
- Frontend polling setiap 2 detik
- Alternatif: WebSocket via Laravel Broadcasting (event `TaskCompleted`, channel `private-user.{userId}`)

---

## E. Rekomendasi Chat / RAG — REQ-F04

> **Konteks Spesifikasi:** Sistem menggunakan Agentic RAG. LLM hanya boleh mensintesis respons dari data yang disuntikkan dari Qdrant — dilarang keras membuat rekomendasi yang tidak ada di database (anti-halusinasi).

---

### POST /api/chat

**Nama:** Kirim Pesan dan Dapatkan Respons RAG  
**Fitur:** REQ-F04  
**Auth:** Bearer Token (Sanctum)  
**Status:** 🔧 Perlu Dibuat

#### Request Body
```json
{
  "message": "Bantu aku cari tools untuk analisis data statistik",
  "context_task_id": "uuid"   // Opsional: link ke task yang sedang aktif
}
```

#### Response Sukses (HTTP 200)
```json
{
  "message": "Chat response generated",
  "data": {
    "reply": "Untuk analisis data statistik, saya rekomendasikan Julius AI karena kemampuannya menganalisis spreadsheet dengan bahasa natural...",
    "recommended_tools": [
      {
        "id": 4,
        "name": "Julius AI",
        "url": "julius.ai",
        "description": "Analisis data dengan bahasa natural.",
        "category": "Data",
        "pricing_type": "freemium",
        "score": 0.95
      }
    ],
    "conversation_id": "uuid"
  }
}
```

#### Catatan Implementasi
- Pipeline RAG:
  1. Embed query user → vektor 1536 dimensi (OpenAI `text-embedding-3-small`)
  2. Hybrid search Qdrant collection `tools_semantic_vectors`
  3. Filter parametrik: `category_filter` sesuai `major` user
  4. Ambil 3–5 entri skor tertinggi (min score 0.85 per REQ-F04)
  5. Suntikkan ke prompt LLM sebagai konteks
  6. Simpan conversation + messages ke DB
- ⚠️ Terapkan `throttle:30,1` untuk endpoint ini (cegah abuse ke API LLM)

---

### GET /api/chat/history

**Nama:** Ambil Riwayat Percakapan  
**Auth:** Bearer Token (Sanctum)  
**Status:** 🔧 Perlu Dibuat

#### Response Sukses (HTTP 200)
```json
{
  "message": "Chat history retrieved successfully",
  "data": {
    "conversations": [
      {
        "id": "uuid",
        "title": "Bantu saya susun skripsi",
        "last_message": "Untuk subtask Cari Topik, saya sarankan Perplexity AI...",
        "created_at": "2026-04-05T10:00:00Z"
      }
    ],
    "pagination": {
      "current_page": 1,
      "total": 5,
      "last_page": 1
    }
  }
}
```

---

### DELETE /api/chat/history

**Nama:** Hapus Semua Riwayat Chat  
**Auth:** Bearer Token (Sanctum)  
**Status:** 🔧 Perlu Dibuat

#### Response Sukses (HTTP 200)
```json
{
  "message": "Chat history cleared successfully"
}
```

---

## F. Smart Bookmarks — REQ-F05 (Penanda Pintar & Tagging)

> **Konteks Spesifikasi:** LLM berperan sebagai agen auditor. Memilih kuadran prioritas (4 level) dan menghasilkan **tepat 5 kata kunci semantik**. Proses tagging async via Redis Queue.

---

### POST /api/bookmarks

**Nama:** Simpan Alat ke Library Pribadi  
**Fitur:** REQ-F05  
**Auth:** Bearer Token (Sanctum)  
**Status:** 🔧 Perlu Dibuat

#### Request Body
```json
{
  "tool_id": 1,
  "note": "Digunakan untuk bab 2 skripsi"
}
```

#### Response Sukses (HTTP 202 Accepted)
```json
{
  "message": "Tool saved. AI tagging in progress.",
  "data": {
    "bookmark_id": "uuid",
    "tool_id": 1,
    "tool_name": "Perplexity AI",
    "tagging_status": "pending",
    "note": "Digunakan untuk bab 2 skripsi"
  }
}
```

#### Catatan Implementasi
- HTTP 202 — LLM tagging async via Queue Worker
- Prompt ke LLM (KERNEL pattern): evaluasi korelasi tool dengan `major` user → output kuadran + 5 keywords
- Setelah tagging selesai, update `utility_priority`, `semantic_keywords`, `tagging_status: completed`
- Broadcast event `BookmarkTagged` ke frontend jika WebSocket aktif

---

### GET /api/bookmarks

**Nama:** Daftar Bookmark dengan Filter  
**Fitur:** REQ-F05  
**Auth:** Bearer Token (Sanctum)  
**Status:** 🔧 Perlu Dibuat

#### Query Parameters
| Parameter | Tipe | Keterangan |
|-----------|------|-----------|
| `priority` | string | `must_try`, `very_good`, `niche`, `optional` |
| `category` | string | Kategori tool |
| `q` | string | Cari nama/keyword/note |
| `sort` | string | `latest`, `oldest`, `rating`, `az`, `za` |
| `page` | integer | Default: 1 |

#### Response Sukses (HTTP 200)
```json
{
  "message": "Bookmarks retrieved successfully",
  "data": {
    "bookmarks": [
      {
        "id": "uuid",
        "tool": {
          "id": 1,
          "name": "Perplexity AI",
          "url": "perplexity.ai",
          "category": "Research",
          "pricing_type": "freemium",
          "rating": 4.8
        },
        "utility_priority": "must_try",
        "priority_label": "Wajib Dicoba",
        "semantic_keywords": ["literature review", "sumber terverifikasi", "riset cepat", "academic search", "AI search"],
        "tagging_status": "completed",
        "note": "Digunakan untuk bab 2 skripsi",
        "saved_at": "2026-04-03T00:00:00Z"
      }
    ],
    "pagination": {
      "current_page": 1,
      "total": 6,
      "last_page": 1
    }
  }
}
```

---

### DELETE /api/bookmarks/{toolId}

**Nama:** Hapus Bookmark  
**Auth:** Bearer Token (Sanctum)  
**Status:** 🔧 Perlu Dibuat

#### Response Sukses (HTTP 200)
```json
{
  "message": "Bookmark removed successfully"
}
```

---

### GET /api/bookmarks/tags

**Nama:** Daftar Semua Tag Semantik Unik Milik User  
**Fitur:** REQ-F05 (cloud tag navigasi dinamis)  
**Auth:** Bearer Token (Sanctum)  
**Status:** 🔧 Perlu Dibuat

#### Response Sukses (HTTP 200)
```json
{
  "message": "Tags retrieved successfully",
  "data": {
    "tags": [
      "literature review",
      "jurnal",
      "sitasi",
      "peer review",
      "coding",
      "autocomplete"
    ]
  }
}
```

---

## G. Webhook Internal — REQ-F02

---

### POST /api/internal/scraper-webhook

**Nama:** Penerima Data Python Scraper (theresanaiforthat.com/timeline/)  
**Fitur:** REQ-F02 — Ekstraksi Data Otomatis setiap 24 jam  
**Auth:** Secret Key (Header `X-Scraper-Secret`)  
**Status:** 🔧 Perlu Dibuat

> **Konteks Spesifikasi:** Python scraper menggunakan `curl_cffi` + BoringSSL untuk bypass Cloudflare WAF (REQ-NF01). Setelah data diterima, backend trigger embed via OpenAI `text-embedding-3-small` (1536 dim) dan upsert ke koleksi Qdrant `tools_semantic_vectors`.

#### Request Headers
```
X-Scraper-Secret: {SCRAPER_SECRET_KEY dari .env}
Content-Type: application/json
```

#### Request Body
```json
{
  "tools": [
    {
      "name": "Perplexity AI",
      "url": "perplexity.ai",
      "description": "Mesin pencari berbasis AI dengan sumber terverifikasi.",
      "category": "Research",
      "pricing_type": "freemium"
    }
  ],
  "scraped_at": "2026-05-04T00:00:00Z",
  "source": "theresanaiforthat.com/timeline/"
}
```

#### Response Sukses (HTTP 200)
```json
{
  "message": "Scraper data received",
  "data": {
    "upserted_count": 12,
    "skipped_count": 3
  }
}
```

#### Catatan Implementasi
- Validasi `X-Scraper-Secret` dari `.env` — jangan gunakan Sanctum token
- ⚠️ **Peringatan Keamanan:** Tambahkan IP whitelist server scraper di middleware
- Setelah upsert ke MySQL: trigger async job → generate embedding → upsert ke Qdrant dengan payload: `tool_mysql_id`, `category_filter`, `extracted_description`
- Rate: 24 jam sekali (Laravel Scheduler)

---

## H. Struktur Qdrant (Referensi)

### Koleksi: `tools_semantic_vectors`

| Parameter | Nilai |
|-----------|-------|
| Dimensi vektor | 1536 |
| Model embedding | `text-embedding-3-small` (OpenAI) |
| Fungsi metrik | Cosine Similarity |
| Indeks payload | `tool_mysql_id` (Integer, parameterized), `category_filter` (Keyword), `extracted_description` (Text) |

**Payload per point:**
```json
{
  "tool_mysql_id": 1,
  "category_filter": "Research",
  "extracted_description": "Mesin pencari berbasis AI dengan sumber terverifikasi..."
}
```

**Contoh query hybrid Qdrant:**
```python
client.search(
    collection_name="tools_semantic_vectors",
    query_vector=embedding_vector,
    query_filter=Filter(
        must=[FieldCondition(key="category_filter", match=MatchValue(value="Research"))]
    ),
    limit=5,
    score_threshold=0.85  # REQ-F04: min relevance score
)
```

---

## Lampiran: Tabel Enum Lengkap

| Field | Nilai Valid |
|-------|------------|
| `users.status` | `PENDING`, `ACTIVE` |
| `tasks_master.status` | `processing`, `completed`, `failed` |
| `tasks_master.source_type` | `text`, `pdf` |
| `atomic_sub_tasks.status` | `done`, `next` |
| `saved_libraries.utility_priority` | `must_try`, `very_good`, `niche`, `optional` |
| `saved_libraries.tagging_status` | `pending`, `completed`, `failed` |
| `chat_messages.role` | `user`, `assistant` |
| `scraped_tools.pricing_type` | `free`, `freemium`, `paid`, `opensource` |
| `scraped_tools.category` | `Research`, `Writing`, `Coding`, `Data`, `Academic`, `Productivity` |
| `user_profiles.language_preference` | `id`, `en` |
| `user_profiles.learning_style` | `visual`, `auditory`, `kinesthetic` |
