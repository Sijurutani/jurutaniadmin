# Learning Courses — Implementation Plan (Admin UI)

> Tanggal: 9 Maret 2026  
> Status: **Siap Implementasi**  
> Route utama: `/courses` (replace `courses.vue` lama — ComingSoon)

---

## Keputusan Arsitektur

| Keputusan | Pilihan | Alasan |
|---|---|---|
| Route | `/courses` (replace total) | Clean naming, breaking change sebelum app besar |
| Lesson management | Subpage `/courses/[id]/lessons` | TipTap + Embeds + Drip terlalu berat untuk inline |
| Lesson editor pattern | Master-Detail (list kiri, editor kanan) | Fokus penuh tanpa pindah halaman |
| Publish panel | Sticky (desktop) | Save button selalu terlihat saat scroll TipTap |
| Lesson content loading | Lazy (metadata-only di list, full content saat klik) | TipTap jsonb bisa sangat berat |
| Order management | `@sortablejs/vue3` drag & drop | Mudah untuk penyuluh/petani |
| Autosave | Debounced 3s ke localStorage | Koneksi drop ≠ kehilangan progres |
| Export completions | PDF + Excel via `exportToPdf` / `exportToExcel` | Laporan ke stakeholder (Polbangtan) |

---

## File Structure

```
app/
├── pages/
│   ├── courses.vue                        ← [REPLACE] Index: daftar learning_courses
│   └── courses/
│       ├── create.vue                     ← Form header course baru
│       ├── [id]/
│       │   ├── edit.vue                   ← Edit metadata course
│       │   ├── lessons.vue                ← Master-detail lesson manager
│       │   └── preview.vue                ← Detail/Preview + tabs
│
├── components/
│   └── courses/
│       ├── StatusBadge.vue                ← Badge reusable: status + drip countdown
│       ├── CategoryBadge.vue              ← Badge kategori dengan icon
│       ├── PublishPanel.vue               ← Sticky sidebar: status, published_at, save
│       ├── LessonListItem.vue             ← Item draggable di lesson manager
│       ├── LessonForm.vue                 ← Form editor detail lesson (kanan)
│       ├── RatingsSummary.vue             ← Summary card: avg rating + bintang visual
│       ├── CompletionsTable.vue           ← Tabel completions + export + invalidate
│       ├── CommentsPanel.vue              ← Threaded comments + moderasi
│       └── DeleteModal.vue                ← Confirm hapus course / lesson
│
└── utils/
    └── storage.ts                         ← [TAMBAH] uploadCourseFile() + bucket courses-images
```

---

## Enum Updates (`app/utils/enum.ts`)

Tambahkan ke objek `Enum`:

```typescript
// Status courses & lessons (shared)
StatusLearning: [
  { value: 'pending',  label: 'Pending',  color: 'neutral' },
  { value: 'approved', label: 'Approved', color: 'success' },
  { value: 'rejected', label: 'Rejected', color: 'error' },
  { value: 'archived', label: 'Archived', color: 'warning' },
  { value: 'deleted',  label: 'Deleted',  color: 'error' }
],

// Kategori course
CourseCategories: [
  { value: 'pertanian_pangan', label: 'Pertanian Pangan', icon: 'i-lucide-wheat' },
  { value: 'perkebunan',       label: 'Perkebunan',       icon: 'i-lucide-tree-palm' },
  { value: 'peternakan',       label: 'Peternakan',       icon: 'i-lucide-tangent' },
  { value: 'perikanan',        label: 'Perikanan',        icon: 'i-lucide-fish' },
  { value: 'hortikultura',     label: 'Hortikultura',     icon: 'i-lucide-flower' },
  { value: 'kehutanan',        label: 'Kehutanan',        icon: 'i-lucide-trees' },
  { value: 'agroteknologi',    label: 'Agroteknologi',    icon: 'i-lucide-flask-conical' }
],

// Platform embed untuk lessons (berbeda dengan EmbedPlatforms meeting)
LessonEmbedPlatforms: [
  { value: 'youtube',       label: 'YouTube',            icon: 'i-simple-icons-youtube',     color: 'error' },
  { value: 'gdrive_doc',    label: 'Google Docs',        icon: 'i-simple-icons-googledocs',  color: 'info' },
  { value: 'gdrive_sheet',  label: 'Google Sheets',      icon: 'i-simple-icons-googlesheets',color: 'success' },
  { value: 'gdrive_slide',  label: 'Google Slides',      icon: 'i-simple-icons-googleslides',color: 'warning' },
  { value: 'gdrive_video',  label: 'Google Drive Video', icon: 'i-simple-icons-googledrive', color: 'neutral' },
  { value: 'gdrive_pdf',    label: 'Google Drive PDF',   icon: 'i-simple-icons-adobeacrobatreader', color: 'error' }
],
```

---

## Storage Setup

Buat bucket baru di Supabase: **`courses-images`**

```typescript
// app/utils/storage.ts — tambahkan fungsi baru
export async function uploadCourseFile(
  folder: 'covers',
  courseId: string,
  file: File
): Promise<string>
```

---

## Phase 1 — Fondasi (Enum + Utils + SQL)

- [ ] Update `app/utils/enum.ts` — tambah `StatusLearning`, `CourseCategories`, `LessonEmbedPlatforms`
- [ ] Update `app/utils/storage.ts` — tambah `uploadCourseFile()`
- [ ] Buat bucket `courses-images` di Supabase (Storage)
- [ ] Run `pnpm types:generate` setelah migration dijalankan

---

## Phase 2 — Index Page (`courses.vue`)

**Replace `courses.vue` (ComingSoon → full table)**

### Layout
```
[Navbar: "Courses"] [+ Buat Course]

[Filter bar]
  Search | Status (multi) | Category (multi) | Sort

[UTable]
  □  Cover  Title + slug  Category  Status  Lessons  Completion%  Author  Dibuat  ⋮
```

### Kolom UTable

| Kolom | Render | Catatan |
|---|---|---|
| Checkbox | `UCheckbox` | Row selection |
| Cover | 40×40 `img` rounded | Fallback placeholder icon |
| Title + slug | Bold + `text-muted-400 text-xs slug` | truncate title |
| Category | `CategoryBadge` | Icon + label |
| Status | `UBadge` via `Enum.StatusLearning` | color coded |
| Lessons | `N lesson` count | Query `count` dari `course_lessons` |
| Completion % | Progress bar kecil + `X%` | Hitung dari completions/enrolled |
| Author | `UAvatar` + nama | join profiles |
| Dibuat | `format(date)` | date-fns id locale |
| Actions | `UDropdownMenu` | Edit, Lihat, Approve, Archive, Hapus |

### Query Strategy

```typescript
// Satu query: select metadata + count lessons
supabase
  .from('learning_courses')
  .select(`
    id, title, slug, cover_image, category, status, author_id,
    published_at, created_at,
    author:profiles(id, full_name, username, avatar_url),
    lessons:course_lessons(count),
    completions:course_completions(count)
  `, { count: 'exact' })
```

> Completion % = `completions.count / enrolled` — untuk MVP cukup tampilkan `completions.count` saja di kolom.

### Bulk Actions
- Approve selected
- Archive selected  
- Hapus selected (confirm modal)

---

## Phase 3 — Create Page (`courses/create.vue`)

### Layout: 2-column
```
┌─────────────────────────────┬──────────────────┐
│  [2/3] Form Utama           │ [1/3] Publish     │
│                             │  Panel (sticky)   │
│  Title                      │                   │
│  Slug preview               │  Status select    │
│  Category select            │  Published at     │
│  Description (TipTap)       │  ─────────────    │
│  Cover Image upload         │  [Save Draft]     │
│                             │  [Publish]        │
└─────────────────────────────┴──────────────────┘
```

### Form Fields

**Kiri:**
- `title` — UInput, `@input` → auto-generate slug
- `slug` — UInput disabled+editable, preview: `jurutani.id/courses/{slug}` real-time
- `category` — USelect dari `Enum.CourseCategories`
- `description` — UEditor (TipTap, reuse config dari news/create.vue)
- `cover_image` — UInput[type=file] + preview thumbnail

**Kanan (PublishPanel.vue — sticky):**
- Status `USelect` — `Enum.StatusLearning`
- Published At — `UInput[type=datetime-local]`
- Tombol: `Save Draft` (status=pending) | `Publish` (status=approved)
- Setelah save: muncul link "→ Kelola Lesson (0)"

### Schema Zod
```typescript
const schema = z.object({
  title: z.string().min(1).max(200),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/),
  category: z.string().min(1, 'Kategori wajib dipilih'),
  status: z.enum(['pending', 'approved', 'rejected', 'archived', 'deleted']),
  published_at: z.string().optional()
})
```

### Autosave
- `localStorage` key: `course_draft_create`
- Debounce 3s setelah ada perubahan di form
- Banner "Draft tersimpan otomatis" saat autosave
- Clear localStorage setelah berhasil submit

---

## Phase 4 — Edit Page (`courses/[id]/edit.vue`)

Sama dengan create, tapi:
- Pre-fill dari DB
- `localStorage` key: `course_draft_{id}`
- Panel kanan menampilkan shortcut "Kelola Lesson (N lessons)" yang link ke `/courses/[id]/lessons`
- Tombol "Lihat Preview" link ke `/courses/[id]/preview`

---

## Phase 5 — Lesson Manager (`courses/[id]/lessons.vue`)

### Layout: Master-Detail

```
┌──────────────────┬────────────────────────────────┐
│ [Kiri] Lesson    │ [Kanan] Editor Lesson Aktif     │
│ List             │                                 │
│                  │ Title                           │
│ ≡ Lesson 1  ●   │ Slug                            │
│ ≡ Lesson 2  ⏰  │ Status + Published At (drip)    │
│ ≡ Lesson 3  ○   │ ──────────────────────────      │
│                  │ Content (TipTap)                │
│ [+ Tambah]       │                                 │
│                  │ Embeds (LessonEmbedManager)     │
│                  │                                 │
│                  │ [Save Lesson]                   │
└──────────────────┴────────────────────────────────┘
```

### Lesson List (Kiri)

**`LessonListItem.vue`:**
- Drag handle icon (`i-lucide-grip-vertical`)
- Nomor urut (order_index + 1)
- Title (truncated)
- Status icon kecil: `●` approved, `○` pending, `⏰` drip scheduled, `✕` rejected
- Drip countdown: "Rilis dalam 2 hari" jika `status=approved AND published_at > now()`
- Klik → load form di kanan (lazy: fetch full content saat diklik)
- Tombol delete (trash icon, hover only)

**Drag & Drop:**
```typescript
// Pakai @vueuse/core useSortable atau @sortablejs/vue3
// Setelah drag selesai → batch update order_index ke Supabase
async function saveOrder(newOrder: string[]) {
  const updates = newOrder.map((id, index) => ({ id, order_index: index }))
  // Batch upsert
  for (const u of updates) {
    await supabase.from('course_lessons').update({ order_index: u.order_index }).eq('id', u.id)
  }
}
```

### Lesson Form (Kanan) — `LessonForm.vue`

Fields:
- `title` — UInput
- `slug` — UInput auto-generate dari title, unique per course
- `status` — USelect `Enum.StatusLearning`
- `published_at` — `UInput[type=datetime-local]` + label "Drip: Lesson rilis otomatis pada tanggal ini"
- `content` — UEditor (TipTap)
- `embeds` — LessonEmbedManager (baru, mirip EmbedManager meetings tapi dengan `LessonEmbedPlatforms`)

**Loading strategy:**
```typescript
// Saat lesson diklik di list kiri:
// 1. Tampilkan skeleton di kanan
// 2. Fetch: select id, title, slug, status, published_at, content, embeds
// 3. Render form
// BUKAN load semua lesson content sekaligus saat page mount
```

**Autosave:**
- `localStorage` key: `lesson_draft_{lessonId}`
- Debounce 3s
- "Perubahan belum disimpan" indicator di header form

---

## Phase 6 — Preview/Detail Page (`courses/[id]/preview.vue`)

### Layout

```
[Back: ← Semua Course]          [Edit Course] [Kelola Lesson]

┌──────────────────────────────────────────────────────┐
│ [Cover Image 16:9]                                   │
│                                                      │
│ [Category Badge]  [Status Badge]          ★ 4.5/5   │
│ Judul Course                                         │
│ by AuthorName · Dibuat 9 Mar 2025 · 12 lessons      │
└──────────────────────────────────────────────────────┘

[Tab: Lessons (12)] [Tab: Completions (48)] [Tab: Comments (21)] [Tab: Ratings (18)]

── Tab: Lessons ──────────────────────────────────────
  Card list: Nomor | Title | Status | Drip date | Komentar count | [Edit]

── Tab: Completions ──────────────────────────────────
  [Export PDF] [Export Excel]
  UTable: Nama User | Selesai Pada | Jumlah Lesson | Invalidated | [Invalidate]

── Tab: Comments ─────────────────────────────────────
  Filter: Lesson (select) | Tampilkan hidden
  Threaded list (max 3 level visual)
  Per comment: [Hide] [Delete] (admin actions)

── Tab: Ratings ──────────────────────────────────────
  RatingsSummary card:
  ┌─────────────────┐
  │  ★ 4.5 / 5      │
  │  ★★★★☆          │
  │  18 ulasan      │
  │  ─────────────  │
  │  ★★★★★  10 |||  │
  │  ★★★★   5  ||   │
  │  ★★★    2  |    │
  │  ★★     1  |    │
  │  ★      0      │
  └─────────────────┘
  List review lengkap: Avatar + Nama + Bintang + Review text + Tanggal
```

### Query Strategy

```typescript
// Page mount: metadata only
const { data: course } = supabase
  .from('learning_courses')
  .select('id, title, slug, cover_image, category, status, published_at, author:profiles(*)')
  .eq('id', courseId)
  .single()

// Tab: Lessons — metadata only (NO content/embeds)
const { data: lessons } = supabase
  .from('course_lessons')
  .select('id, title, slug, status, published_at, order_index')
  .eq('course_id', courseId)
  .is('deleted_at', null)
  .order('order_index')

// Tab: Completions
const { data: completions } = supabase
  .from('course_completions')
  .select('user_id, completed_at, lesson_count, invalidated_at, user:profiles(full_name, username, avatar_url)')
  .eq('course_id', courseId)

// Tab: Comments (top-level + nested)
const { data: comments } = supabase
  .from('course_comments')
  .select('*, user:profiles(full_name, username, avatar_url)')
  .eq('course_id', courseId)
  .is('deleted_at', null)
  .order('created_at')

// Tab: Ratings
const { data: ratings } = supabase
  .from('course_ratings')
  .select('rating, review, created_at, user:profiles(full_name, username, avatar_url)')
  .eq('course_id', courseId)
  .order('created_at', { ascending: false })
```

### Export Completions

```typescript
// Reuse exportToPdf / exportToExcel dari utils/export.ts
const exportColumns = [
  { key: 'name',         header: 'Nama User' },
  { key: 'username',     header: 'Username' },
  { key: 'completed_at', header: 'Selesai Pada' },
  { key: 'lesson_count', header: 'Jumlah Lesson' },
  { key: 'invalidated',  header: 'Status' }
]
```

---

## Phase 7 — Components Detail

### `courses/PublishPanel.vue`
**Props:** `modelValue: { status, published_at }`, `loading`, `courseId?`  
**Emits:** `update:modelValue`, `save`  
**Features:**
- `position: sticky; top: 1rem` via Tailwind `sticky top-4`
- Status badges color preview di samping select
- Date picker untuk `published_at`
- Slot footer untuk "→ Kelola Lesson" link (only when courseId exists)

### `courses/LessonListItem.vue`
**Props:** `lesson`, `active`, `dragHandle`  
**Features:**
- Drip label: computed dari `published_at` vs `now()` → "Rilis dalam X hari" / "Live" / "Belum dijadwalkan"
- Status dot: warna dari `Enum.StatusLearning`
- Hover reveal delete button

### `courses/RatingsSummary.vue`
**Props:** `ratings: { rating: number }[]`  
**Computed:**
- `average` = `AVG(rating)` dibulatkan 1 desimal
- `breakdown` = count per bintang 1-5
- `maxCount` untuk normalisasi bar width

### `courses/CompletionsTable.vue`
**Props:** `completions`, `courseTitle`  
**Features:**
- `exportToPdf` + `exportToExcel` buttons
- Tombol "Invalidate" → update `invalidated_at = now()` via service role / admin RLS
- Badge "Dicabut" merah jika `invalidated_at IS NOT NULL`

### `courses/CommentsPanel.vue`
**Props:** `courseId`, `lessons: { id, title }[]`  
**Features:**
- Filter per lesson (`USelect`)
- Toggle "Tampilkan yang disembunyikan"
- Rekursi render max 3 level
- Per comment action: `Hide/Show`, `Delete`
- Admin-only actions via `is_admin()` check di frontend

---

## Phase 8 — Navigation Update

Update `app/layouts/default.vue` — sidebar sudah ada `Courses → /courses`.  
Tidak perlu perubahan, karena `/courses` akan di-replace.

---

## Urutan Pengerjaan

```
[1] Enum + Storage utils              ← fondasi, tidak ada dependency
[2] courses.vue (index)               ← paling sering dilihat
[3] courses/create.vue                ← + PublishPanel.vue
[4] courses/[id]/edit.vue             ← reuse create
[5] courses/[id]/lessons.vue          ← + LessonListItem, LessonForm, LessonEmbedManager
[6] courses/[id]/preview.vue          ← + RatingsSummary, CompletionsTable, CommentsPanel
[7] DeleteModal.vue                   ← shared untuk course & lesson
```

---

## Dependencies

Cek apakah sudah terinstall:

```bash
# Drag & drop untuk lesson reorder
pnpm add sortablejs @types/sortablejs
# atau
pnpm add @vueuse/integrations  # include useSortable
```

`jspdf` + `jspdf-autotable` sudah ada (dipakai di `utils/export.ts`).  
TipTap editor sudah ada (dipakai di news/create.vue).  
`@sortablejs/vue3` atau `useSortable` dari `@vueuse/integrations` — **perlu di-install**.

---

## Catatan Penting

1. **Jangan load `content` dan `embeds` lesson saat list mount** — hanya load saat lesson diklik
2. **Slug unique per course** — validasi di form: check `UNIQUE(course_id, slug)` dengan query sebelum save
3. **Autosave** — simpan ke `localStorage`, clear setelah berhasil submit, restore saat page re-open
4. **Completion export** — gunakan `exportToPdf` / `exportToExcel` yang sudah ada di `utils/export.ts`
5. **courses.vue lama** — hapus isi (ComingSoon), langsung replace dengan implementasi baru
6. **Drip scheduling** — admin bisa input `published_at` di masa depan, lesson otomatis visible saat waktunya tiba (DB-level via RLS policy `published_at <= now()`)
