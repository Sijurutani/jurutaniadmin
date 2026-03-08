# Learning Courses — Database Plan

> Tanggal: 9 Maret 2026  
> Status: **Disetujui, siap migrasi**

---

## Ringkasan Arsitektur

```
learning_courses                    ← Container/header course
    │
    ├──< course_lessons             ← Modul/poin dalam course (drip content)
    │        ├── embeds jsonb       ← YouTube + GDrive embeds
    │        ├──< course_lesson_progress   ← Tracking per user per lesson
    │        └──< course_comments         ← Komentar & reply di lesson
    │
    ├──< course_completions         ← Record ketika user selesai 100% semua lesson
    └──< course_ratings             ← Rating bintang per user per course
```

---

## Tables

---

### 1. `learning_courses`

Header/container course. Dibuat oleh admin atau expert.

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| `id` | text | PK DEFAULT generate_prefixed_id('crs') | Contoh: `crs-ab12cd34ef56` |
| `title` | text | NOT NULL | Judul course |
| `slug` | text | UNIQUE | URL-friendly, auto-generated |
| `description` | jsonb | NOT NULL DEFAULT '{}' | Rich text TipTap JSON (overview/pengantar course) |
| `cover_image` | text | | URL thumbnail |
| `category` | text | | Nilai dari enum (lihat §Enum) |
| `status` | text | NOT NULL DEFAULT 'pending' | `pending` \| `approved` \| `archived` \| `rejected` \| `deleted` |
| `author_id` | uuid | FK → profiles(id) | Admin atau expert |
| `published_at` | timestamptz | | Kapan dipublikasi |
| `created_at` | timestamptz | DEFAULT now() | — |
| `updated_at` | timestamptz | DEFAULT now() | Auto-update via trigger |
| `archived_at` | timestamptz | | Soft archive |
| `deleted_at` | timestamptz | | Soft delete |

**Indexes:**
- `idx_learning_courses_deleted_at` (partial WHERE deleted_at IS NULL)
- `idx_learning_courses_status` (status)
- `idx_learning_courses_author_id` (author_id)
- `idx_learning_courses_slug` (slug)
- `idx_learning_courses_description` GIN (description jsonb_path_ops)

**Status values (sama dengan `course_lessons`):**

| Status | Arti | Tampil ke user? |
|---|---|---|
| `pending` | Baru dibuat, menunggu review admin | Tidak |
| `approved` | Disetujui — course aktif & bisa diakses | Ya |
| `rejected` | Ditolak admin | Tidak |
| `archived` | Diarsipkan admin | Tidak |
| `deleted` | Soft-deleted | Tidak |

`published_at` mencatat kapan course pertama kali di-approve/dipublikasi (informasional).

---

Modul/poin dalam sebuah course. Mendukung **drip content** via `published_at`.

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| `id` | text | PK DEFAULT generate_prefixed_id('lsn') | Contoh: `lsn-9f3ae72b1cd4` |
| `course_id` | text | NOT NULL FK → learning_courses(id) ON DELETE CASCADE | — |
| `title` | text | NOT NULL | "Menyiapkan Lahan" |
| `slug` | text | NOT NULL | URL-friendly, UNIQUE per course |
| `content` | jsonb | NOT NULL DEFAULT '{}' | Rich text TipTap JSON (penjelasan/narasi lesson) |
| `embeds` | jsonb | NOT NULL DEFAULT '[]' | Array embed (YouTube + GDrive) |
| `order_index` | int | NOT NULL DEFAULT 0 | Urutan tampil |
| `status` | text | NOT NULL DEFAULT 'pending' | `pending` \| `approved` \| `archived` \| `rejected` \| `deleted` |
| `published_at` | timestamptz | | NULL = belum dijadwalkan (drip scheduling) |
| `created_at` | timestamptz | DEFAULT now() | — |
| `updated_at` | timestamptz | DEFAULT now() | Auto-update via trigger |
| `deleted_at` | timestamptz | | Soft delete |

**Indexes:**
- `idx_course_lessons_course_id` (course_id)
- `idx_course_lessons_published_at` (partial WHERE deleted_at IS NULL)
- `idx_course_lessons_order` (course_id, order_index)
- `idx_course_lessons_embeds` GIN (embeds)
- `idx_course_lessons_content` GIN (content jsonb_path_ops)
- `idx_course_lessons_slug` UNIQUE (course_id, slug)
- `idx_course_lessons_status` (course_id, status)

**Visibility logic (gabungan `status` + `published_at`):**

Lesson tampil ke user hanya jika semua kondisi terpenuhi:
```
status = 'approved'
AND published_at IS NOT NULL AND published_at <= now()
AND deleted_at IS NULL
```

| Status | Arti | Tampil ke user? |
|---|---|---|
| `pending` | Dibuat, menunggu review admin | Tidak |
| `approved` | Disetujui — tampil sesuai `published_at` | Tergantung `published_at` |
| `rejected` | Ditolak admin | Tidak |
| `archived` | Diarsipkan admin | Tidak |
| `deleted` | Soft-deleted | Tidak |

`published_at` berfungsi sebagai **drip scheduler**: admin set tanggal untuk otomatis publish. Jika `approved` tapi `published_at IS NULL` atau masih di masa depan → belum tampil.

---

### 3. `course_lesson_progress`

Tracking lesson mana yang sudah diselesaikan oleh user. Tidak memerlukan kolom `id` tersendiri karena kombinasi `(lesson_id, user_id)` sudah unik.

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| `lesson_id` | text | PK (composite) FK → course_lessons(id) ON DELETE CASCADE | — |
| `user_id` | uuid | PK (composite) FK → profiles(id) ON DELETE CASCADE | — |
| `course_id` | text | NOT NULL FK → learning_courses(id) ON DELETE CASCADE | Denormalized untuk query progress cepat |
| `completed_at` | timestamptz | NOT NULL DEFAULT now() | — |

**Primary Key:** COMPOSITE (`lesson_id`, `user_id`) — tidak perlu kolom `id` tersendiri

**Indexes:**
- `idx_lesson_progress_user_course` (user_id, course_id) — untuk hitung % progress
- `idx_lesson_progress_lesson_id` (lesson_id)

**Logika progress %:**

```
progress = COUNT(progress WHERE user_id = X AND course_id = Y)
         / COUNT(lessons WHERE course_id = Y AND published_at <= now() AND deleted_at IS NULL)
         × 100
```

---

### 4. `course_completions`

Rekam jejak historis ketika user berhasil menyelesaikan 100% semua lesson yang aktif pada saat itu. Completion bersifat **permanen** — tidak auto-invalidasi.

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| `course_id` | text | PK (composite) FK → learning_courses(id) ON DELETE CASCADE | — |
| `user_id` | uuid | PK (composite) FK → profiles(id) ON DELETE CASCADE | — |
| `completed_at` | timestamptz | NOT NULL DEFAULT now() | Waktu completion pertama kali |
| `lesson_count` | int | NOT NULL | Snapshot jumlah lesson yang diselesaikan saat itu |
| `invalidated_at` | timestamptz | | Diisi admin jika completion perlu dicabut manual |

**Primary Key:** COMPOSITE (`course_id`, `user_id`)

**Indexes:**
- `idx_course_completions_course_id` (course_id)
- `idx_course_completions_user_id` (user_id)

**Catatan:**
Completion adalah rekam jejak historis — *"user X menyelesaikan course ini pada tanggal Y dengan N lesson"*. Jika admin menambah lesson baru, completion **tidak dicabut otomatis**. Progress % tetap dihitung dinamis dari `course_lesson_progress` vs jumlah lesson aktif saat ini. Admin dapat mencabut completion secara manual via `invalidated_at`.

---

### 5. `course_comments`

Komentar dan reply pada **lesson** (bukan course). Threaded infinite depth via `parent_id`.

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| `id` | uuid | PK DEFAULT gen_random_uuid() | — |
| `course_id` | text | NOT NULL FK → learning_courses(id) ON DELETE CASCADE | Denormalized untuk filter per course |
| `lesson_id` | text | NOT NULL FK → course_lessons(id) ON DELETE CASCADE | Komentar ditujukan ke lesson |
| `user_id` | uuid | NOT NULL FK → profiles(id) ON DELETE CASCADE | — |
| `parent_id` | uuid | FK → course_comments(id) ON DELETE CASCADE NULL | NULL = top-level, diisi = reply |
| `content` | text | NOT NULL | Isi komentar |
| `is_hidden` | boolean | NOT NULL DEFAULT false | Admin bisa sembunyikan |
| `created_at` | timestamptz | DEFAULT now() | — |
| `updated_at` | timestamptz | DEFAULT now() | — |
| `deleted_at` | timestamptz | | Soft delete oleh author/admin |

**Indexes:**
- `idx_course_comments_lesson_id` (lesson_id)
- `idx_course_comments_parent_id` (parent_id)
- `idx_course_comments_user_id` (user_id)
- `idx_course_comments_active` (partial WHERE deleted_at IS NULL AND is_hidden = false)

**Constraint integritas:**
DB trigger `verify_comment_course_id` (BEFORE INSERT) memverifikasi bahwa `course_comments.course_id` cocok dengan `course_lessons.course_id` untuk `lesson_id` yang diberikan — mencegah data drift jika lesson dipindah (meski jarang terjadi dengan CASCADE).

**Depth limit:**
Tidak dibatasi di DB. Batas kedalaman tampil (max 3 level) diterapkan di app/UI level.

---

### 6. `course_ratings`

Rating bintang per user per **course**. Satu user satu rating per course, bisa diupdate via UPSERT.

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| `course_id` | text | PK (composite) FK → learning_courses(id) ON DELETE CASCADE | Rating ditujukan ke course |
| `user_id` | uuid | PK (composite) FK → profiles(id) ON DELETE CASCADE | — |
| `rating` | smallint | NOT NULL CHECK (rating BETWEEN 1 AND 5) | Bintang 1–5 |
| `review` | text | | Pendapat/komentar singkat (opsional) |
| `created_at` | timestamptz | DEFAULT now() | — |
| `updated_at` | timestamptz | DEFAULT now() | Auto-update via trigger |

**Primary Key:** COMPOSITE (`course_id`, `user_id`) — tidak perlu kolom `id` tersendiri

**Indexes:**
- `idx_course_ratings_course_id` (course_id) — untuk hitung rata-rata per course
- `idx_course_ratings_user_id` (user_id)

---

## Rich Text Format (TipTap/ProseMirror JSON)

Kolom `description` di `learning_courses` dan `content` di `course_lessons` menyimpan dokumen TipTap dalam format JSON — sama persis dengan kolom `content` pada tabel `news_updated`.

**Struktur dasar:**

```json
{
  "type": "doc",
  "content": [
    {
      "type": "heading",
      "attrs": { "level": 2 },
      "content": [{ "type": "text", "text": "Persiapan Lahan" }]
    },
    {
      "type": "paragraph",
      "content": [
        { "type": "text", "text": "Lahan yang baik harus memiliki pH antara " },
        { "type": "text", "marks": [{ "type": "bold" }], "text": "6.0–7.0" },
        { "type": "text", "text"." }
      ]
    },
    {
      "type": "imageUpload",
      "attrs": { "src": "https://...", "alt": "Foto lahan" }
    }
  ]
}
```

**Node types yang didukung (sama dengan news editor):**

| Node | Keterangan |
|---|---|
| `paragraph` | Paragraf teks biasa |
| `heading` | H1–H6 |
| `bulletList` / `orderedList` | List |
| `blockquote` | Kutipan |
| `codeBlock` | Blok kode |
| `imageUpload` | Gambar upload (custom extension) |
| `horizontalRule` | Garis pemisah |

**Default value di DB:** `'{}'` (bukan `null`) — frontend cek `content.type === 'doc'` sebelum render.

---

## Embed Format (course_lessons.embeds)

Array JSON, tiap item:

```json
[
  {
    "id": "uuid-v4",
    "platform": "youtube",
    "url": "https://youtube.com/watch?v=...",
    "order": 0
  },
  {
    "id": "uuid-v4",
    "platform": "gdrive_slide",
    "url": "https://docs.google.com/presentation/d/.../edit",
    "order": 1
  }
]
```

**Platform values untuk lessons:**

| Value | Label | Deteksi URL |
|---|---|---|
| `youtube` | YouTube | `youtube.com` / `youtu.be` |
| `gdrive_doc` | Google Docs | `/document/d/` |
| `gdrive_sheet` | Google Sheets | `/spreadsheets/d/` |
| `gdrive_slide` | Google Slides | `/presentation/d/` |
| `gdrive_video` | Google Drive Video | `drive.google.com/file/` |
| `gdrive_pdf` | Google Drive PDF | `drive.google.com/file/` + ext .pdf |

---

## Enum: Category Courses

Disimpan sebagai string di kolom `category`, nilai valid:

```
pertanian_pangan   → Pertanian Pangan
perkebunan         → Perkebunan
peternakan         → Peternakan
perikanan          → Perikanan
hortikultura       → Hortikultura
kehutanan          → Kehutanan
agroteknologi      → Agroteknologi
```

---

## RLS Policies

### `learning_courses`
- **Public read**: `status = 'approved' AND deleted_at IS NULL`
- **Author read all**: `author_id = auth.uid()`
- **Author insert/update**: `author_id = auth.uid()` — berlaku untuk expert & admin
- **Admin all**: `is_admin()`

### `course_lessons`
- **Public read**: lesson published, course published, tidak dihapus
- **Course author CRUD**: via join ke `learning_courses.author_id = auth.uid()`
- **Admin all**: `is_admin()`

### `course_lesson_progress`
- **User read own**: `user_id = auth.uid()`
- **User insert/delete own**: `user_id = auth.uid()`
- **Admin read all**: `is_admin()`

### `course_completions`
- **User read own**: `user_id = auth.uid()`
- **Admin read all**: `is_admin()`
- *Insert/delete hanya via DB trigger atau service role*

### `course_comments`
- **Public read active**: `deleted_at IS NULL AND is_hidden = false`
- **Authenticated insert**: `user_id = auth.uid()`
- **Author update/delete own**: `user_id = auth.uid()`
- **Admin all** (termasuk set `is_hidden = true`): `is_admin()`

### `course_ratings`
- **Public read**: semua
- **Authenticated upsert own**: `user_id = auth.uid()` — via UPSERT (INSERT ON CONFLICT DO UPDATE)
- **Author delete own**: `user_id = auth.uid()`
- **Admin all**: `is_admin()`

> Rating hanya bisa diberikan setelah user menyelesaikan course (`course_completions` exists) — validasi di app-level.

---

## Custom ID Strategy

Dua tabel utama menggunakan human-readable prefixed ID alih-alih pure UUID:

| Table | Format ID | Contoh |
|---|---|---|
| `learning_courses` | `crs-{12 hex chars}` | `crs-ab12cd34ef56` |
| `course_lessons` | `lsn-{12 hex chars}` | `lsn-9f3ae72b1cd4` |

Tabel tracking/relasi (`course_lesson_progress`, `course_completions`, `course_ratings`) menggunakan **composite PK** tanpa kolom `id` tersendiri — lebih efisien dan self-describing.

Tabel `course_comments` tetap menggunakan `uuid` karena membutuhkan self-referencing `parent_id`.

**Fungsi generator:**
```sql
CREATE OR REPLACE FUNCTION generate_prefixed_id(prefix text)
RETURNS text LANGUAGE sql AS $$
  SELECT prefix || '-' || lower(substring(replace(gen_random_uuid()::text, '-', ''), 1, 12))
$$;
```

---

## DB Triggers & Functions

| Trigger/Function | Table | Event | Aksi |
|---|---|---|---|
| `handle_updated_at` | semua table dengan `updated_at` | BEFORE UPDATE | Set `updated_at = now()` |
| `verify_comment_course_id` | `course_comments` | BEFORE INSERT | Validasi `course_id` cocok dengan `course_lessons.course_id` |

---

## Catatan Implementasi untuk Admin UI

- **Halaman index** `/courses` → list `learning_courses` (search, filter status, sort)
- **Halaman create/edit** → form header course + lesson manager (tambah/reorder/publish lesson)
- **Halaman detail/preview** → tampil semua lesson, embed canvas, list completions, moderasi komentar, rata-rata rating
- Progress % dihitung di frontend dari query `course_lesson_progress` + `course_lessons` count
- Rating rata-rata course = `AVG(rating)` dari `course_ratings` per course_id
