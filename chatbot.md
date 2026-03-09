# Chatbot Admin Jurutani — Rencana & Diskusi

> Dokumen ini membahas fungsi, desain, dan rencana implementasi chatbot AI untuk dashboard admin Jurutani.

---

## 1. Latar Belakang & Tujuan

Jurutani adalah platform penyuluhan digital pertanian dari Polbangtan Yogyakarta Magelang. Dashboard admin mengelola berbagai entitas: pengguna, kursus, berita, pasar, ahli, pertemuan, dan video. Seorang admin perlu:

- Mengambil keputusan berdasarkan data (statistik, tren, laporan)
- Mengelola konten dalam jumlah besar
- Merespons laporan pengguna dan moderasi
- Memonitor aktivitas platform secara real-time

**Chatbot hadir sebagai asisten AI pribadi admin** — bisa menjawab pertanyaan tentang data, membantu menulis konten, dan mempercepat pekerjaan rutin.

---

## 2. Target Pengguna

| Peran | Kebutuhan Utama |
|-------|----------------|
| Super Admin | Insight platform menyeluruh, laporan eksekutif |
| Admin Konten | Bantuan menulis kursus, berita, deskripsi produk |
| Admin Pengguna | Moderasi, cari user, ringkasan aktivitas |
| Admin Pasar | Analisis transaksi, kategori populer |

---

## 3. Fungsi & Kegunaan Chatbot

### 3.1 Data Query (Tanya Data)

Admin bisa bertanya dalam bahasa natural, chatbot menerjemahkan ke query Supabase dan menampilkan hasil.

```
Admin: "Berapa total pengguna yang mendaftar bulan ini?"
Bot:   "Ada 127 pengguna baru di bulan Maret 2026.
        Naik 23% dibanding Februari (103 pengguna)."

Admin: "Kursus apa yang paling banyak selesai minggu lalu?"
Bot:   "Top 3 kursus minggu lalu:
        1. Budidaya Padi Organik — 45 completion
        2. Pengelolaan Hama Terpadu — 38 completion
        3. Pupuk Kompos Mandiri — 29 completion"
```

**Data yang bisa diakses:**
- Statistik pengguna (registrasi, aktif, peran)
- Performa kursus (enrollment, completion, rating)
- Aktivitas marketplace (listing, transaksi)
- Interaksi konten (views, likes, komentar)
- Jadwal pertemuan mendatang
- Laporan pakar dan instruktur

### 3.2 Content Assistant (Bantuan Konten)

Chatbot membantu membuat atau memperbaiki konten platform.

```
Admin: "Buatkan deskripsi singkat untuk kursus 'Hidroponik Dasar'
        target petani pemula, maksimal 150 kata"
Bot:   [menghasilkan deskripsi terstruktur dalam Bahasa Indonesia]

Admin: "Buatkan 5 judul berita menarik tentang panen raya di DIY"
Bot:   [menghasilkan 5 opsi judul dengan gaya jurnalistik]

Admin: "Review dan perbaiki teks pengumuman ini: [teks...]"
Bot:   [mengembalikan teks yang diperbaiki + penjelasan perubahan]
```

**Kemampuan konten:**
- Generate deskripsi kursus / berita / produk
- Buat ringkasan (summary) dari konten panjang
- Koreksi bahasa & tata tulis (Bahasa Indonesia)
- Generate tags/keyword otomatis
- Translate konten ke Bahasa Inggris (dan sebaliknya)

### 3.3 Platform Intelligence (Insight Cerdas)

Chatbot memberikan rekomendasi dan peringatan proaktif.

```
Bot (otomatis): "⚠️ Ada 12 komentar belum dimoderasi lebih dari 48 jam."

Bot (otomatis): "📊 Tren minggu ini: Pengguna dari kategori 'Petani Muda'
                 naik 34%. Mungkin saatnya menambah kursus untuk segmen ini."

Admin: "Apa yang perlu saya lakukan hari ini?"
Bot:   "Prioritas hari ini:
        1. 3 kursus menunggu review publish
        2. 7 laporan pengguna belum ditangani
        3. Pertemuan online 'Penyuluhan Padi' besok — belum ada materi"
```

**Insight yang tersedia:**
- Daily briefing otomatis saat login
- Anomali deteksi (lonjakan traffic, penurunan engagement)
- Rekomendasi aksi berdasarkan data
- Reminder deadline dan task tertunda

### 3.4 Search & Navigation (Pencarian Cerdas)

```
Admin: "Cari user dengan email 'budi@gmail.com'"
Bot:   [menampilkan card user lengkap + shortcut ke halaman detail]

Admin: "Tampilkan semua kursus kategori peternakan yang belum dipublish"
Bot:   [menampilkan tabel hasil filter + tombol "Buka di Halaman Kursus"]
```

### 3.5 Moderasi Assist

```
Admin: "Apakah komentar ini melanggar aturan? '[teks komentar...]'"
Bot:   "Komentar ini mengandung indikasi [spam/ujaran kebencian/dll].
        Rekomendasi: Sembunyikan dan kirim notifikasi ke pengguna.
        [Tombol: Sembunyikan Sekarang | Abaikan]"
```

---

## 4. Arsitektur Teknis

```
┌─────────────────────────────────────┐
│         Dashboard Admin (Nuxt 4)    │
│  ┌──────────────────────────────┐   │
│  │    Chatbot Widget / Panel    │   │
│  │  (Floating Button + Drawer)  │   │
│  └──────────┬───────────────────┘   │
└─────────────┼───────────────────────┘
              │ HTTP / SSE (streaming)
              ▼
┌─────────────────────────────────────┐
│      Server API (Nuxt server/)      │
│   /api/chatbot/chat   (POST)        │
│   /api/chatbot/stream (SSE)         │
│   /api/chatbot/history (GET)        │
└──────┬──────────────────────────────┘
       │
   ┌───┴────────────────────────────┐
   │         Tool Router            │
   │  - parse intent                │
   │  - route ke tool yg sesuai     │
   └───┬────────┬─────────┬─────────┘
       │        │         │
       ▼        ▼         ▼
  Supabase   OpenRouter  Groq
  Queries    (GPT-4o,   (Llama 3.3,
  (data)     Claude)    Gemma2, dll)
```

### 4.1 AI Provider

Tersedia dua provider berdasarkan kebutuhan:

| Provider | Kegunaan | Keunggulan |
|----------|----------|------------|
| **Groq** | Query cepat, intent parsing, summarizer | Sangat cepat (ultra-low latency), free tier besar |
| **OpenRouter** | Konten kompleks, analisis mendalam | Akses banyak model (GPT-4o, Claude 3.5, dll) |

**Strategi Routing:**
- Query data sederhana → **Groq** (llama-3.3-70b atau gemma2-9b)
- Moderasi & analisis konten → **OpenRouter** (claude-3.5-haiku)
- Generate konten panjang → **OpenRouter** (claude-3.5-sonnet / gpt-4o)
- Auto-fallback: jika Groq gagal → OpenRouter, dan sebaliknya

### 4.2 Environment Variables

Tambahkan ke `.env`:

```env
# AI Providers
OPENROUTER_API_KEY=your_openrouter_key
GROQ_API_KEY=your_groq_key

# Chatbot Config
CHATBOT_DEFAULT_MODEL=groq/llama-3.3-70b-versatile
CHATBOT_CONTENT_MODEL=openrouter/anthropic/claude-3.5-haiku
CHATBOT_MAX_TOKENS=2048
```

### 4.3 Nuxt Config (runtimeConfig)

```typescript
// nuxt.config.ts
runtimeConfig: {
  openrouterApiKey: process.env.OPENROUTER_API_KEY,
  groqApiKey: process.env.GROQ_API_KEY,
  chatbotDefaultModel: process.env.CHATBOT_DEFAULT_MODEL,
  // ...existing config
}
```

---

## 5. Desain UI/UX

### 5.1 Floating Chat Widget (Rekomendasi Utama)

```
┌─────────────────────────────────┐
│  Dashboard Admin                │
│                                 │
│  [konten utama...]              │
│                                 │
│                    ┌──────────┐ │
│                    │   AI     │ │  ← Floating button
│                    │  Asisten │ │    di pojok kanan bawah
│                    └──────────┘ │
└─────────────────────────────────┘
```

Saat diklik, muncul **USlideover** dari kanan (tidak mengganggu konten utama):

```
┌─────────────────────────────┐
│ ✦ Asisten Jurutani     [×] │  ← Header
├─────────────────────────────┤
│                             │
│  Selamat datang, Admin!     │
│  Ada yang bisa saya bantu?  │
│                             │
│  💡 Coba tanyakan:          │
│  • "Ringkasan hari ini"     │
│  • "Kursus belum dipublish" │
│  • "Buatkan deskripsi..."   │
│                             │
│  ─────────────────────────  │
│  [Pesan user]               │
│  [Balasan bot]              │
│                             │
├─────────────────────────────┤
│ [Ketik pesan...]  [Kirim ▶] │  ← Input
└─────────────────────────────┘
```

### 5.2 Komponen Vue

```
app/components/
  chatbot/
    ChatbotWidget.vue      ← floating button + trigger
    ChatbotPanel.vue       ← slideover panel utama
    ChatbotMessage.vue     ← render satu message (user/bot)
    ChatbotSuggestions.vue ← chip suggestions
    ChatbotTyping.vue      ← animasi typing indicator
```

### 5.3 Mode Tampilan

| Mode | Deskripsi |
|------|-----------|
| **Floating** | Default — tombol di pojok kanan bawah, buka USlideover |
| **Inline Panel** | Sidebar tetap di sebelah konten (mode wide screen) |
| **Fullscreen** | Untuk sesi analisis data mendalam |

---

## 6. Server API Design

### `POST /api/chatbot/chat`

```typescript
// Request
{
  message: string,          // pesan dari admin
  context?: {
    page: string,           // halaman aktif (courses, users, dll)
    selectedIds?: string[], // item yang sedang dipilih
  },
  history?: Message[],      // riwayat percakapan (max 10 terakhir)
  model?: string            // override model
}

// Response
{
  reply: string,            // balasan AI (Markdown)
  actions?: Action[],       // tombol aksi opsional
  data?: any,               // data terstruktur (tabel, chart)
  model: string,            // model yang digunakan
  usage: { tokens: number }
}
```

### `GET /api/chatbot/stream` (SSE)

Untuk streaming response agar terasa real-time. Admin tidak perlu menunggu full response.

### `GET /api/chatbot/suggestions?page=courses`

Mengembalikan daftar suggestion chips berdasarkan halaman aktif.

---

## 7. System Prompt & Context Injection

Chatbot dibekali **system prompt** yang mencakup:

1. **Identitas**: "Kamu adalah Asisten Admin Jurutani, platform pertanian digital Indonesia..."
2. **Bahasa**: Selalu gunakan Bahasa Indonesia yang formal tapi ramah
3. **Konteks Platform**: Deskripsi singkat fitur & entitas platform
4. **Hak Akses**: Hanya akses data sesuai role admin yang login
5. **Format Output**: Gunakan Markdown, tabel untuk data, selalu sertakan angka aktual
6. **Batasan**: Tidak membocorkan credential, tidak memodifikasi data tanpa konfirmasi eksplisit

**Dynamic Context** yang disuntikkan per request:
- Nama & role admin yang login
- Halaman/fitur yang sedang aktif
- Timestamp sekarang
- Ringkasan statistik harian (di-cache Supabase)

---

## 8. Tool Calling (Function Calling)

Chatbot dilengkapi tools untuk mengakses data real:

```typescript
const tools = [
  {
    name: 'get_platform_stats',
    description: 'Ambil statistik platform (user, kursus, dll)',
    parameters: { period: 'today|week|month|year' }
  },
  {
    name: 'search_users',
    description: 'Cari pengguna berdasarkan nama/email/role',
    parameters: { query: string, role?: string, limit?: number }
  },
  {
    name: 'get_pending_reviews',
    description: 'Daftar item yang menunggu review/approval',
    parameters: { type: 'courses|news|comments|experts' }
  },
  {
    name: 'get_course_analytics',
    description: 'Analitik kursus (enrollment, completion rate, rating)',
    parameters: { courseId?: string, period?: string }
  },
  {
    name: 'generate_report',
    description: 'Generate laporan ringkasan dalam format terstruktur',
    parameters: { type: string, period: string }
  }
]
```

---

## 9. Riwayat & Memori Percakapan

### Session Memory
- Riwayat per-sesi disimpan di **localStorage** (client-side)
- Max 50 pesan per sesi
- Reset otomatis tiap 24 jam atau saat logout

### Persistent Memory (Opsional — Fase 2)
- Simpan insight & preferensi admin di tabel `admin_chatbot_preferences` Supabase
- Bot "ingat" preferensi admin (misal: format laporan favorit, shortcut query)

---

## 10. Rencana Implementasi (Phases)

### Phase 1 — MVP (1–2 minggu)
- [ ] Buat komponen `ChatbotWidget.vue` dan `ChatbotPanel.vue`
- [ ] Buat server API `/api/chatbot/chat` dengan Groq (llama-3.3)
- [ ] Integrasi floating button di `layouts/default.vue`
- [ ] System prompt dasar (identitas + bahasa)
- [ ] Streaming SSE response
- [ ] Fitur: tanya data (hardcoded query → Supabase)

### Phase 2 — Smart Context (2–3 minggu)
- [ ] Tool Calling: get_stats, search_users, get_pending_reviews
- [ ] Page-aware context (bot tahu admin sedang di halaman mana)
- [ ] Suggestion chips per halaman
- [ ] Daily briefing otomatis saat login
- [ ] Routing model: Groq untuk query cepat, OpenRouter untuk konten

### Phase 3 — Content Assistant (2 minggu)
- [ ] Generate/edit deskripsi kursus, berita, produk
- [ ] Bantuan moderasi komentar
- [ ] Auto-tag dan keyword generator
- [ ] Export hasil percakapan (ringkasan ke clipboard/PDF)

### Phase 4 — Advanced (Future)
- [ ] RAG: basis pengetahuan dari dokumentasi Jurutani + regulasi pertanian
- [ ] Voice input (Web Speech API)
- [ ] Persistent memory per admin
- [ ] Analytics percakapan (topik paling sering ditanya)

---

## 11. Keamanan & Privasi

| Aspek | Pendekatan |
|-------|-----------|
| **API Key** | Simpan di server-side saja, tidak pernah expose ke client |
| **Autentikasi** | Chatbot hanya aktif untuk admin yang sudah login (cek session Supabase) |
| **Data Sensitif** | Chatbot tidak menampilkan password, token, atau data PII lengkap |
| **Rate Limiting** | Max 30 request/menit per admin untuk mencegah penyalahgunaan |
| **Audit Log** | Setiap query ke data sensitif dicatat di tabel `admin_activity_logs` |
| **Injection Guard** | Input disanitasi sebelum dikirim ke AI model |
| **RLS Supabase** | Bot hanya akses data sesuai scope role admin, menggunakan service key dengan filter role |

---

## 12. Estimasi Biaya AI

### Groq (Free Tier)
- llama-3.3-70b: **gratis** hingga 14,400 request/hari
- Cocok untuk: query data, summary, intent parsing
- **Estimasi cost: $0 untuk penggunaan normal admin**

### OpenRouter
- Claude 3.5 Haiku: ~$0.001 per 1K token input, $0.005 per 1K output
- Estimasi per interaksi konten: ~2K token = ~$0.012
- Untuk 100 interaksi/hari: ~$1.2/hari → ~$36/bulan
- **Rekomendasi: Batasi konten AI ke Groq dulu, OpenRouter sebagai premium**

---

## 13. Pertanyaan Diskusi (To-Do)

Sebelum implementasi, perlu disepakati:

- [ ] **Model AI mana yang menjadi default?** (Groq llama vs OpenRouter Claude)
- [ ] **Apakah chatbot bisa *memodifikasi* data?** (publish kursus, approve user, dll via konfirmasi)
- [ ] **Seberapa dalam akses data?** (hanya statistik, atau detail individual user?)
- [ ] **Apakah perlu riwayat percakapan persisten** lintas sesi?
- [ ] **Bahasa UI chatbot:** Indonesia saja, atau bisa Inggris?
- [ ] **Apakah daily briefing otomatis** muncul saat login, atau harus dibuka manual?
- [ ] **Integrasi dengan inbox?** (chatbot bisa bantu balas pesan user?)

---

## 14. File yang Akan Dibuat

```
app/
  components/
    chatbot/
      ChatbotWidget.vue       ← floating trigger button
      ChatbotPanel.vue        ← slideover panel
      ChatbotMessage.vue      ← render pesan (markdown support)
      ChatbotSuggestions.vue  ← chip suggestions
      ChatbotTyping.vue       ← animasi loading
  composables/
    useChatbot.ts             ← state & logic chatbot
  types/
    chatbot.d.ts              ← TypeScript types
server/
  api/
    chatbot/
      chat.post.ts            ← main chat endpoint
      stream.get.ts           ← SSE streaming
      suggestions.get.ts      ← context-aware suggestions
  utils/
    ai.ts                     ← Groq + OpenRouter helper
    chatbot-tools.ts          ← tool calling functions
    system-prompt.ts          ← system prompt builder
```

---

*Dokumen ini bersifat living document — update sesuai keputusan diskusi dan progress implementasi.*
