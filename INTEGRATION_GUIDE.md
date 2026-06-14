# Panduan Integrasi Frontend–Backend — Leva

> **Versi:** 1.1.0 (diselaraskan dengan SRS IEEE Leva)  
> **Tanggal:** 2026-05-04

---

## 1. Jalankan Migration dan Seed Dummy Data

Sebelum mulai integrasi, pastikan database sudah siap:

```bash
# Di direktori leva-backend/
php artisan migrate
php artisan db:seed
```

**Apa yang di-seed:**
- 12 AI tools dummy (Perplexity AI, GitHub Copilot, Scite.ai, dst.)
- 1 user demo: `renisa@demo.leva.id` / password: `password123`
- 1 task dengan 5 sub-tasks
- 6 bookmark dengan semantic keywords
- 1 riwayat percakapan chat

---

## 2. Konfigurasi Base URL dan Environment

### Frontend — `.env` di root `leva-frontend/`
```env
VITE_API_BASE_URL=http://localhost:8000/api
```

### Backend — tambahkan ke `leva-backend/.env`
```env
# Database (ganti sqlite ke MySQL untuk production)
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=leva_db
DB_USERNAME=root
DB_PASSWORD=

# Queue (ganti ke redis untuk production — sesuai spesifikasi)
QUEUE_CONNECTION=database

# Qdrant Vector DB (Sprint 3+)
QDRANT_HOST=http://localhost:6333
QDRANT_API_KEY=
QDRANT_COLLECTION=tools_semantic_vectors

# OpenAI — untuk LLM + embedding 1536 dimensi
OPENAI_API_KEY=
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
OPENAI_CHAT_MODEL=gpt-4o-mini

# Secret key webhook Python scraper (REQ-F02)
SCRAPER_SECRET_KEY=ganti-dengan-secret-panjang-acak-min-32-karakter

# Frontend URL untuk CORS
FRONTEND_URL=http://localhost:5173
```

---

## 3. CORS — Konfigurasi Laravel

Edit `leva-backend/config/cors.php`:

```php
return [
    'paths'           => ['api/*', 'sanctum/csrf-cookie'],
    'allowed_methods' => ['*'],
    'allowed_origins' => [
        'http://localhost:5173',  // Vite dev server frontend
        'http://localhost:3000',  // Alternatif
        // env('FRONTEND_URL', 'http://localhost:5173'),
    ],
    'allowed_headers' => ['*'],
    'supports_credentials' => false,
];
```

---

## 4. Axios Instance + Token Management

### Install Axios
```bash
# Di direktori leva-frontend/
npm install axios
```

### Buat `src/services/api.js`
```js
import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
})

// Auto-inject Bearer Token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('leva_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Handle 401 global
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('leva_token')
      window.location.href = '/' // redirect ke onboarding/login
    }
    return Promise.reject(err)
  }
)

export default api
```

---

## 5. Alur Autentikasi Lengkap

```js
// src/services/authService.js
import api from './api'

export const authService = {
  async register(name, email, password) {
    const { data } = await api.post('/auth/register', {
      name, email, password, password_confirmation: password,
    })
    return data.data
  },

  async login(email, password) {
    const { data } = await api.post('/auth/login', { email, password })
    localStorage.setItem('leva_token', data.data.token)
    return data.data.user  // { id, name, email, status }
  },

  async logout() {
    await api.post('/auth/logout')
    localStorage.removeItem('leva_token')
  },

  async me() {
    const { data } = await api.get('/auth/me')
    return data.data.user
  },
}
```

### Alur di OnboardingView (ganti handleStart mock)
```js
// Step 1: Register
const user = await authService.register(form.name, form.email, form.password)

// Step 2: Login → dapat token
const loggedUser = await authService.login(form.email, form.password)

// Step 3: Submit profil (jika status PENDING)
if (loggedUser.status === 'PENDING') {
  await profileService.create({
    major: form.jurusan,                           // ← mapping field
    semester: parseInt(form.semester),              // ← parse ke integer
    language_preference: form.bahasa === 'Indonesia' ? 'id' : 'en', // ← konversi
    learning_style: form.learningStyle ?? 'visual', // ← field baru di form
  })
}

// Step 4: Redirect ke dashboard
setActiveView('dashboard')
```

---

## 6. Mapping Field Wajib (Frontend → Backend)

Karena nama field di prototype React berbeda dengan backend, buat helper mapping:

```js
// src/utils/fieldMapper.js
export function mapOnboardingToApi(form) {
  return {
    major: form.jurusan,
    semester: parseInt(form.semester, 10),
    language_preference: form.bahasa === 'Indonesia' ? 'id' : 'en',
    learning_style: form.learning_style ?? 'visual',
  }
}

// Konversi priority backend → label UI
export const PRIORITY_LABELS = {
  must_try: { label: 'Wajib Dicoba', color: '#DC2626', bg: '#FEE2E2' },
  very_good: { label: 'Sangat Bagus', color: '#059669', bg: '#D1FAE5' },
  niche:     { label: 'Bagus/Niche',  color: '#B45309', bg: '#FEF3C7' },
  optional:  { label: 'Opsional',     color: '#64748B', bg: '#F1F5F9' },
}
```

---

## 7. Polling Task Async (REQ-F03)

```js
// src/services/taskService.js
import api from './api'

export const taskService = {
  async submit(text, file = null) {
    const formData = new FormData()
    if (file) {
      formData.append('pdf_file', file)
    } else {
      formData.append('text', text)
    }
    const { data } = await api.post('/tasks', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data.data // { task_id, status: 'processing', estimated_seconds, poll_url }
  },

  pollStatus(taskId, onComplete, onError, intervalMs = 2000, timeoutMs = 60000) {
    const startTime = Date.now()
    const interval = setInterval(async () => {
      if (Date.now() - startTime > timeoutMs) {
        clearInterval(interval)
        onError(new Error('timeout'))
        return
      }
      try {
        const { data } = await api.get(`/tasks/${taskId}/status`)
        if (data.data.status === 'completed') {
          clearInterval(interval)
          const { data: taskData } = await api.get(`/tasks/${taskId}`)
          onComplete(taskData.data.task)
        } else if (data.data.status === 'failed') {
          clearInterval(interval)
          onError(new Error(data.data.error_message ?? 'Processing failed'))
        }
      } catch (e) {
        clearInterval(interval)
        onError(e)
      }
    }, intervalMs)
    return () => clearInterval(interval) // return cleanup function
  },

  async updateSubTask(taskId, subTaskId, status) {
    const { data } = await api.patch(`/tasks/${taskId}/sub-tasks/${subTaskId}`, { status })
    return data.data.sub_task
  },
}
```

### Penggunaan di ChatWorkspaceView (ganti runMockRag)
```js
// Ganti submitTaskToRag:
const submitTaskToRag = async (payload) => {
  setIsLoading(true)
  try {
    const result = await taskService.submit(payload.text, payload.attachedFile)
    const cleanup = taskService.pollStatus(
      result.task_id,
      (task) => {
        setTaskTitle(task.title)
        setSubTasks(task.sub_tasks)
        setIsLoading(false)
      },
      (err) => {
        setRagError('Gagal memproses tugasmu. Coba lagi.')
        setIsLoading(false)
      }
    )
    return cleanup
  } catch {
    setRagError('Gagal mengirim tugas.')
    setIsLoading(false)
  }
}
```

---

## 8. Package Backend yang Perlu Diinstall

```bash
# Di direktori leva-backend/

# PDF text extraction (REQ-F03, Section 4.3 Spesifikasi)
# Membutuhkan pdftotext terinstall di OS: apt install poppler-utils
composer require spatie/pdf-to-text

# PHP client Qdrant (Sprint 3+)
composer require mcpuishor/qdrant-laravel

# OpenAI PHP client (untuk LLM + embedding)
composer require openai-php/laravel
php artisan vendor:publish --provider="OpenAI\Laravel\ServiceProvider"
```

---

## 9. Rekomendasi Infrastructure (REQ-NF02)

Sesuai spesifikasi Bagian 6.2 — target user di Purwokerto, Jawa Tengah:

| Komponen | Rekomendasi | Alasan |
|----------|-------------|--------|
| Backend Laravel | GCP `asia-southeast2` (Jakarta) | RTT dari Purwokerto 15–30ms via IndiHome/Telkomsel → OpenIXP Jakarta |
| Database MySQL | GCP Cloud SQL (same region) | Latency minimal |
| Qdrant | GCP Compute Engine (same region) | Kueri Qdrant < 50ms (REQ-NF02) |
| Frontend static | Cloudflare CDN | PoP terdekat di Jawa Tengah; load instan tanpa tunggu DB |
| Python scraper | Server terpisah (bisa VPS murah) | Satu kali 24 jam, tidak perlu high availability |

---

## 10. Checklist Integrasi Per Sprint

### Sprint 1 ✅ Target
- [ ] `php artisan migrate && php artisan db:seed` berhasil
- [ ] `config/cors.php` dikonfigurasi untuk `localhost:5173`
- [ ] Route direfactor ke prefix `/api/auth/*` dan `/api/profile`
- [ ] `POST /api/auth/logout` tersedia
- [ ] Frontend: `src/services/api.js` dibuat
- [ ] Frontend: alur register → login → onboarding → dashboard terhubung API
- [ ] Frontend: field mapping `jurusan→major`, `bahasa→id/en` diterapkan
- [ ] Frontend: field `learning_style` ditambahkan ke OnboardingView

### Sprint 2 ✅ Target
- [ ] `GET /api/tools` mengembalikan 12 tools dari seed
- [ ] `POST /api/tasks` mendispatch job, kembalikan task_id
- [ ] `GET /api/tasks/{id}/status` polling bekerja
- [ ] Frontend: Dashboard ambil tools dari API
- [ ] Frontend: ChatWorkspace polling loop aktif

### Sprint 3 ✅ Target
- [ ] Qdrant berjalan di Docker: `docker run -p 6333:6333 qdrant/qdrant`
- [ ] Tools dari seed di-embed dan di-upsert ke Qdrant
- [ ] `POST /api/chat` mengembalikan respons RAG
- [ ] `GET /api/bookmarks` mengembalikan data dengan 4-level priority
- [ ] Frontend: Library tampil data dari API; priority label sesuai spec
- [ ] Frontend: Tombol "Simpan" + "Hapus" di bookmark terhubung API
