<script setup lang="ts">
import * as z from 'zod'
import { format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import type { TableColumn } from '@nuxt/ui'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { Database } from '~/types/database.types'

type CategoryRow = Database['public']['Tables']['category']['Row']
type CategoryExpertRow = Database['public']['Tables']['category_expert']['Row']
type CategoryMarketsRow = Database['public']['Tables']['category_markets']['Row']
type CategoryNewsRow = Database['public']['Tables']['category_news']['Row']

// Unified shape used throughout this page
type AnyCategory = {
  id: string
  name: string
  value?: string | null
  created_at: string
  updated_at: string
  deleted_at?: string | null
}

useHead({ title: 'Tags – Jurutani Admin' })

const UButton = resolveComponent('UButton')
const UBadge = resolveComponent('UBadge')
const UDropdownMenu = resolveComponent('UDropdownMenu')

const supabase = useSupabase()
const toast = useToast()

// ─── Tabs ─────────────────────────────────────────────────────────────────────
type TabKey = 'category' | 'category_news' | 'category_markets' | 'category_expert'

const tabDefs = [
  { label: 'Umum', value: 'category' as TabKey, icon: 'i-lucide-tag', hasValue: false },
  { label: 'Berita', value: 'category_news' as TabKey, icon: 'i-lucide-newspaper', hasValue: true },
  { label: 'Pasar', value: 'category_markets' as TabKey, icon: 'i-lucide-shopping-bag', hasValue: true },
  { label: 'Pakar', value: 'category_expert' as TabKey, icon: 'i-lucide-user-check', hasValue: true }
]

const activeTab = ref<TabKey>('category')
const activeTabMeta = computed(() => tabDefs.find(t => t.value === activeTab.value)!)

// ─── Data ─────────────────────────────────────────────────────────────────────
const search = ref('')
const loading = ref(false)
const rows = ref<AnyCategory[]>([])

async function fetchData() {
  loading.value = true
  const { data, error } = await supabase
    .from(activeTab.value)
    .select('*')
    .is('deleted_at', null)
    .order('name')
  loading.value = false
  if (error) {
    toast.add({ title: 'Gagal memuat data', description: error.message, color: 'error' })
    return
  }
  rows.value = (data ?? []) as AnyCategory[]
}

await fetchData()

watch(activeTab, async () => {
  search.value = ''
  await fetchData()
})

const filteredRows = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return rows.value
  return rows.value.filter(r =>
    r.name.toLowerCase().includes(q) ||
    (r.value && r.value.toLowerCase().includes(q))
  )
})

// ─── Add / Edit modal ─────────────────────────────────────────────────────────
const modalOpen = ref(false)
const editingRow = ref<AnyCategory | null>(null)
const saving = ref(false)

const modalTitle = computed(() => editingRow.value ? 'Edit Kategori' : 'Tambah Kategori')
const modalDesc = computed(() =>
  editingRow.value
    ? 'Perbarui data kategori ini.'
    : `Tambah kategori baru untuk tab ${activeTabMeta.value.label}.`
)

const schemaWithValue = z.object({
  name: z.string().min(2, 'Minimal 2 karakter').max(100),
  value: z.string()
    .min(2, 'Minimal 2 karakter')
    .max(100)
    .regex(/^[a-z0-9_-]+$/, 'Hanya huruf kecil, angka, tanda _ dan -')
})

const schemaNoValue = z.object({
  name: z.string().min(2, 'Minimal 2 karakter').max(100)
})

const activeSchema = computed(() =>
  activeTabMeta.value.hasValue ? schemaWithValue : schemaNoValue
)

type FormState = { name: string; value: string }
const formState = reactive<FormState>({ name: '', value: '' })

// Auto-generate value slug from name when adding new
watch(() => formState.name, (val) => {
  if (!editingRow.value && activeTabMeta.value.hasValue) {
    formState.value = val
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_-]/g, '')
  }
})

function openAdd() {
  editingRow.value = null
  formState.name = ''
  formState.value = ''
  modalOpen.value = true
}

function openEdit(row: AnyCategory) {
  editingRow.value = row
  formState.name = row.name
  formState.value = row.value ?? ''
  modalOpen.value = true
}

async function onSubmit(event: FormSubmitEvent<any>) {
  saving.value = true
  const payload: Record<string, string> = { name: event.data.name }
  if (activeTabMeta.value.hasValue) payload.value = event.data.value

  const { error } = editingRow.value
    ? await supabase.from(activeTab.value).update(payload as any).eq('id', editingRow.value.id)
    : await supabase.from(activeTab.value).insert(payload as any)

  saving.value = false

  if (error) {
    toast.add({ title: 'Gagal menyimpan', description: error.message, color: 'error' })
    return
  }

  toast.add({
    title: editingRow.value ? 'Kategori diperbarui' : 'Kategori ditambahkan',
    color: 'success'
  })
  modalOpen.value = false
  await fetchData()
}

// ─── Delete ───────────────────────────────────────────────────────────────────
const deleteOpen = ref(false)
const deleteTarget = ref<AnyCategory | null>(null)
const deleting = ref(false)

function openDelete(row: AnyCategory) {
  deleteTarget.value = row
  deleteOpen.value = true
}

async function confirmDelete() {
  if (!deleteTarget.value) return
  deleting.value = true
  const { error } = await supabase
    .from(activeTab.value)
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', deleteTarget.value.id)
  deleting.value = false
  if (error) {
    toast.add({ title: 'Gagal menghapus', description: error.message, color: 'error' })
    return
  }
  toast.add({ title: 'Kategori dihapus', color: 'success' })
  deleteOpen.value = false
  deleteTarget.value = null
  await fetchData()
}

// ─── Table columns ────────────────────────────────────────────────────────────
const columns = computed((): TableColumn<AnyCategory>[] => {
  const cols: TableColumn<AnyCategory>[] = [
    {
      accessorKey: 'name',
      header: 'Nama',
      cell: ({ row }) =>
        h('span', { class: 'font-medium text-highlighted' }, row.original.name)
    }
  ]

  if (activeTabMeta.value.hasValue) {
    cols.push({
      accessorKey: 'value',
      header: 'Nilai (Value)',
      cell: ({ row }) =>
        h(UBadge, {
          variant: 'soft',
          color: 'neutral',
          class: 'font-mono text-xs'
        }, () => row.original.value ?? '-')
    })
  }

  cols.push({
    accessorKey: 'created_at',
    header: 'Dibuat',
    cell: ({ row }) =>
      h('span', { class: 'text-sm text-muted whitespace-nowrap' },
        format(new Date(row.original.created_at), 'dd MMM yyyy', { locale: localeId })
      )
  })

  cols.push({
    id: 'actions',
    enableHiding: false,
    cell: ({ row }) =>
      h(
        'div',
        { class: 'text-right' },
        h(UDropdownMenu, {
          items: [
            [
              {
                label: 'Edit',
                icon: 'i-lucide-pencil',
                onSelect: () => openEdit(row.original)
              }
            ],
            [
              {
                label: 'Hapus',
                icon: 'i-lucide-trash-2',
                color: 'error' as const,
                onSelect: () => openDelete(row.original)
              }
            ]
          ],
          content: { align: 'end' }
        }, () => h(UButton, {
          icon: 'i-lucide-ellipsis-vertical',
          color: 'neutral',
          variant: 'ghost',
          class: 'ml-auto'
        }))
      )
  })

  return cols
})
</script>

<template>
  <UDashboardPanel id="tags">
    <template #header>
      <UDashboardNavbar title="Tags" :ui="{ right: 'gap-2' }">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UButton
            icon="i-lucide-refresh-cw"
            color="neutral"
            variant="outline"
            :loading="loading"
            @click="fetchData()"
          />
          <UButton
            icon="i-lucide-plus"
            label="Tambah Kategori"
            @click="openAdd"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <!-- Tab selector -->
      <UTabs
        v-model="activeTab"
        :items="tabDefs"
        :content="false"
        class="mb-4"
      />

      <!-- Search bar -->
      <div class="flex items-center gap-2 mb-4">
        <UInput
          v-model="search"
          icon="i-lucide-search"
          placeholder="Cari kategori..."
          class="min-w-52"
        />
        <UBadge
          :label="`${filteredRows.length} item`"
          variant="soft"
          color="neutral"
          size="md"
          class="ml-auto"
        />
      </div>

      <!-- Table -->
      <UTable
        :data="filteredRows"
        :columns="columns"
        :loading="loading"
        :ui="{
          base: 'table-fixed border-separate border-spacing-0',
          thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none',
          tbody: '[&>tr]:last:[&>td]:border-b-0',
          th: 'py-2 first:rounded-l-lg last:rounded-r-lg border-y border-default first:border-l last:border-r',
          td: 'border-b border-default'
        }"
        :empty-state="{
          icon: 'i-lucide-tag',
          label: 'Belum ada kategori',
          description: 'Klik Tambah Kategori untuk menambahkan data pertama.'
        }"
      />
    </template>
  </UDashboardPanel>

  <!-- Add / Edit Modal -->
  <UModal
    v-model:open="modalOpen"
    :title="modalTitle"
    :description="modalDesc"
  >
    <template #body>
      <UForm
        :schema="activeSchema"
        :state="formState"
        class="space-y-4"
        @submit="onSubmit"
      >
        <UFormField label="Nama" name="name">
          <UInput
            v-model="formState.name"
            placeholder="Contoh: Pertanian"
            class="w-full"
          />
        </UFormField>

        <UFormField
          v-if="activeTabMeta.hasValue"
          label="Nilai (Value)"
          name="value"
          hint="Digunakan sebagai key di database"
        >
          <UInput
            v-model="formState.value"
            placeholder="contoh: pertanian"
            class="w-full font-mono"
          />
        </UFormField>

        <div class="flex justify-end gap-2 pt-2">
          <UButton
            label="Batal"
            color="neutral"
            variant="subtle"
            :disabled="saving"
            @click="modalOpen = false"
          />
          <UButton
            :label="editingRow ? 'Simpan Perubahan' : 'Tambah'"
            color="primary"
            type="submit"
            :loading="saving"
          />
        </div>
      </UForm>
    </template>
  </UModal>

  <!-- Delete Confirmation Modal -->
  <UModal
    v-model:open="deleteOpen"
    title="Hapus Kategori?"
    :description="`Hapus kategori &quot;${deleteTarget?.name}&quot;? Tindakan ini tidak dapat dibatalkan.`"
  >
    <template #body>
      <div class="flex justify-end gap-2">
        <UButton
          label="Batal"
          color="neutral"
          variant="subtle"
          :disabled="deleting"
          @click="deleteOpen = false"
        />
        <UButton
          label="Hapus"
          color="error"
          variant="solid"
          icon="i-lucide-trash-2"
          :loading="deleting"
          @click="confirmDelete"
        />
      </div>
    </template>
  </UModal>
</template>
