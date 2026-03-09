<script setup lang="ts">
const emit = defineEmits<{ saved: [] }>()
const open = defineModel<boolean>('open', { default: false })

const supabase = useSupabaseClient()
const toast = useToast()

// ─── Steps ────────────────────────────────────────────────────────────────────
const step = ref<1 | 2>(1)
watch(open, (v) => { if (!v) { step.value = 1; resetImport() } })

// ─── Import state ─────────────────────────────────────────────────────────────
type ImportRow = {
  rowNum: number
  email: string
  provinces: string
  district: string
  note: string
  status: 'valid' | 'email_not_found' | 'already_instructor'
  statusLabel: string
  userId?: string
}

const fileRef = ref<HTMLInputElement>()
const parsedRows = ref<ImportRow[]>([])
const parsing = ref(false)
const importing = ref(false)

function resetImport() {
  if (fileRef.value) fileRef.value.value = ''
  parsedRows.value = []
  parsing.value = false
  importing.value = false
}

const validRows = computed(() => parsedRows.value.filter(r => r.status === 'valid'))
const invalidRows = computed(() => parsedRows.value.filter(r => r.status !== 'valid'))

// ─── Template download ────────────────────────────────────────────────────────
async function downloadTemplate() {
  const XLSX = await import('xlsx')
  const sampleData = [
    ['email', 'provinces', 'district', 'note'],
    ['user@example.com', 'Jawa Barat', 'Bandung', 'Contoh catatan opsional']
  ]
  const ws = XLSX.utils.aoa_to_sheet(sampleData)
  ws['!cols'] = [{ wch: 32 }, { wch: 24 }, { wch: 24 }, { wch: 44 }]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Instructors')
  XLSX.writeFile(wb, 'template-import-instructors.xlsx')
}

// ─── Parse file ───────────────────────────────────────────────────────────────
async function handleFileChange(files: FileList | File[] | null) {
  const file = Array.isArray(files) ? files[0] : files?.[0]
  if (!file) return
  parsing.value = true
  parsedRows.value = []
  try {
    const XLSX = await import('xlsx')
    const buf = await file.arrayBuffer()
    const wb = XLSX.read(buf)
    const ws = wb.Sheets[wb.SheetNames[0]!]!
    const raw = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: '' })

    const normalize = (r: Record<string, any>) => {
      const out: Record<string, string> = {}
      for (const k of Object.keys(r)) out[k.toLowerCase().trim()] = String(r[k] ?? '').trim()
      return out
    }
    const rows = raw.slice(0, 500).map(normalize)

    const emails = [...new Set(rows.map(r => r['email']).filter(Boolean))] as string[]
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email')
      .in('email', emails)
    const profileMap = new Map((profiles ?? []).map(p => [p.email?.toLowerCase(), p.id]))

    const userIds = [...profileMap.values()]
    const { data: existing } = userIds.length
      ? await supabase.from('instructors').select('user_id').in('user_id', userIds).is('deleted_at', null)
      : { data: [] }
    const existingSet = new Set((existing ?? []).map(e => e.user_id))

    parsedRows.value = rows.map((r, i) => {
      const email = r['email']?.toLowerCase()
      const provinces = r['provinces'] ?? ''
      const district = r['district'] ?? ''
      const note = r['note'] ?? ''
      const userId = profileMap.get(email)

      let status: ImportRow['status'] = 'valid'
      let statusLabel = 'Valid'

      if (!email || !userId) {
        status = 'email_not_found'; statusLabel = 'Email tidak ditemukan'
      } else if (existingSet.has(userId)) {
        status = 'already_instructor'; statusLabel = 'Sudah terdaftar'
      }

      return { rowNum: i + 2, email: r['email'] ?? '', provinces, district, note, status, statusLabel, userId }
    })
  } catch (err: any) {
    toast.add({ title: 'Gagal membaca file', description: err.message, color: 'error' })
  } finally {
    parsing.value = false
  }
}

// ─── Execute import ───────────────────────────────────────────────────────────
async function executeImport() {
  const rows = validRows.value
  if (!rows.length) return
  importing.value = true
  try {
    const { error } = await supabase.from('instructors').insert(
      rows.map(r => ({
        user_id: r.userId!,
        provinces: r.provinces || null,
        district: r.district || null,
        note: r.note || null
      }))
    )
    if (error) throw error
    toast.add({ title: `${rows.length} penyuluh berhasil diimport`, color: 'success', duration: 3000 })
    open.value = false
    emit('saved')
  } catch (err: any) {
    toast.add({ title: 'Gagal mengimport', description: err.message, color: 'error' })
  } finally {
    importing.value = false
  }
}

const statusColor: Record<string, any> = {
  valid: 'success',
  email_not_found: 'error',
  already_instructor: 'warning'
}

const rules = [
  {
    title: 'Format file yang diterima',
    desc: 'File harus berformat .xlsx atau .csv. Baris pertama adalah header kolom (nama kolom).',
    slot: null
  },
  {
    title: 'Kolom yang diperlukan',
    desc: 'Kolom email bersifat wajib. Kolom lainnya opsional dan bisa dikosongkan.',
    slot: 'columns'
  },
  {
    title: 'Aturan email',
    desc: 'Email harus cocok dengan akun yang sudah terdaftar di platform. User yang belum mendaftar tidak dapat didaftarkan melalui import ini.',
    slot: null
  },
  {
    title: 'Isi provinsi & kabupaten/kota',
    desc: 'Gunakan nama wilayah dalam Bahasa Indonesia yang lengkap dan benar. Contoh: "Jawa Barat" untuk kolom provinces, "Kabupaten Bandung" untuk kolom district.',
    slot: null
  },
  {
    title: 'Batas data & duplikat',
    desc: 'Maksimal 500 baris per sekali import. User yang sudah terdaftar sebagai penyuluh akan dilewati dan ditampilkan di preview dengan status "Sudah terdaftar".',
    slot: null
  }
]
</script>

<template>
  <UModal v-model:open="open" :ui="{ content: 'max-w-2xl' }">
    <template #header>
      <div class="flex items-center gap-3">
        <div class="size-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <UIcon name="i-lucide-file-up" class="size-5 text-primary" />
        </div>
        <div>
          <p class="font-semibold text-highlighted">Import Data Penyuluh</p>
          <p class="text-xs text-muted">
            {{ step === 1 ? 'Langkah 1: Panduan sebelum import' : 'Langkah 2: Upload & preview data' }}
          </p>
        </div>
      </div>
    </template>

    <template #body>
      <!-- Step 1: Rules -->
      <div v-if="step === 1" class="space-y-3">
        <UAlert
          icon="i-lucide-info"
          color="info"
          variant="soft"
          title="Baca panduan berikut sebelum mengimport data penyuluh"
        />

        <div class="space-y-2">
          <div v-for="(rule, i) in rules" :key="i" class="flex gap-3 p-3 rounded-lg bg-elevated">
            <div class="size-6 rounded-full bg-primary flex items-center justify-center shrink-0 mt-0.5 text-white text-xs font-bold">
              {{ i + 1 }}
            </div>
            <div class="min-w-0">
              <p class="text-sm font-medium text-highlighted">{{ rule.title }}</p>
              <p class="text-xs text-muted mt-0.5">{{ rule.desc }}</p>
              <div v-if="rule.slot === 'columns'" class="flex flex-wrap gap-1.5 mt-2">
                <UBadge color="error" variant="soft">
                  email <span class="opacity-60 ml-1">(wajib)</span>
                </UBadge>
                <UBadge color="neutral" variant="soft">provinces</UBadge>
                <UBadge color="neutral" variant="soft">district</UBadge>
                <UBadge color="neutral" variant="soft">note</UBadge>
              </div>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-3 pt-1 border-t border-default">
          <UButton
            label="Download Template"
            icon="i-lucide-download"
            color="neutral"
            variant="outline"
            @click="downloadTemplate"
          />
          <p class="text-xs text-muted">Template berisi contoh data yang sudah terisi</p>
        </div>
      </div>

      <!-- Step 2: Upload + Preview -->
      <div v-else class="space-y-4">
        <div
          class="border-2 border-dashed border-default rounded-lg p-6 text-center hover:border-primary/50 transition-colors cursor-pointer"
          @dragover.prevent
          @drop.prevent="handleFileChange(($event as DragEvent).dataTransfer?.files ?? null)"
          @click="fileRef?.click()"
        >
          <input
            ref="fileRef"
            type="file"
            accept=".xlsx,.csv"
            class="hidden"
            @change="handleFileChange(($event.target as HTMLInputElement).files)"
          />
          <UIcon name="i-lucide-file-spreadsheet" class="size-10 mx-auto text-muted mb-2" />
          <p class="text-sm text-highlighted font-medium">Klik atau drag & drop file di sini</p>
          <p class="text-xs text-muted mt-1">Mendukung .xlsx dan .csv · Maksimal 500 baris</p>
        </div>

        <div v-if="parsing" class="flex items-center justify-center gap-2 py-4">
          <UIcon name="i-lucide-loader-2" class="size-5 text-primary animate-spin" />
          <span class="text-sm text-muted">Memvalidasi data...</span>
        </div>

        <div v-if="parsedRows.length > 0 && !parsing">
          <div class="flex items-center gap-3 mb-3">
            <UBadge color="success" variant="soft" leading-icon="i-lucide-check-circle">
              {{ validRows.length }} valid
            </UBadge>
            <UBadge v-if="invalidRows.length" color="error" variant="soft" leading-icon="i-lucide-x-circle">
              {{ invalidRows.length }} bermasalah
            </UBadge>
            <span class="text-xs text-muted ml-auto">Total: {{ parsedRows.length }} baris</span>
          </div>

          <div class="overflow-auto max-h-60 rounded-lg border border-default">
            <table class="w-full text-xs">
              <thead class="bg-elevated sticky top-0">
                <tr>
                  <th class="px-3 py-2 text-left font-medium text-muted w-10">#</th>
                  <th class="px-3 py-2 text-left font-medium text-muted">Email</th>
                  <th class="px-3 py-2 text-left font-medium text-muted">Provinsi</th>
                  <th class="px-3 py-2 text-left font-medium text-muted">Kab/Kota</th>
                  <th class="px-3 py-2 text-left font-medium text-muted">Note</th>
                  <th class="px-3 py-2 text-left font-medium text-muted">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="row in parsedRows"
                  :key="row.rowNum"
                  class="border-t border-default"
                  :class="row.status !== 'valid' ? 'bg-error/5' : ''"
                >
                  <td class="px-3 py-2 text-muted font-mono">{{ row.rowNum }}</td>
                  <td class="px-3 py-2 text-highlighted max-w-35 truncate">{{ row.email }}</td>
                  <td class="px-3 py-2 text-muted max-w-25 truncate">{{ row.provinces || '-' }}</td>
                  <td class="px-3 py-2 text-muted max-w-25 truncate">{{ row.district || '-' }}</td>
                  <td class="px-3 py-2 text-muted max-w-25 truncate">{{ row.note || '-' }}</td>
                  <td class="px-3 py-2">
                    <UBadge :color="statusColor[row.status]" variant="soft" size="sm">
                      {{ row.statusLabel }}
                    </UBadge>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex items-center justify-between w-full">
        <UButton
          v-if="step === 2"
          label="Kembali"
          icon="i-lucide-arrow-left"
          color="neutral"
          variant="ghost"
          @click="step = 1; resetImport()"
        />
        <div v-else />

        <div class="flex gap-2">
          <UButton label="Tutup" color="neutral" variant="subtle" @click="open = false" />
          <UButton
            v-if="step === 1"
            label="Lanjutkan"
            trailing-icon="i-lucide-arrow-right"
            color="primary"
            @click="step = 2"
          />
          <UButton
            v-else-if="validRows.length > 0"
            :label="`Import ${validRows.length} Data`"
            icon="i-lucide-upload"
            color="primary"
            :loading="importing"
            @click="executeImport"
          />
        </div>
      </div>
    </template>
  </UModal>
</template>
