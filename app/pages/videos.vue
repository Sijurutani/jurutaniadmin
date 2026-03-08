<script setup lang="ts">
import { format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import type { TableColumn } from '@nuxt/ui'
import type { Row } from '@tanstack/table-core'
import type { Database } from '~/types/database.types'

type VideoRow = Database['public']['Tables']['videos']['Row']

const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')
const UDropdownMenu = resolveComponent('UDropdownMenu')
const UCheckbox = resolveComponent('UCheckbox')

useHead({ title: 'Videos – Jurutani Admin' })

const supabase = useSupabase()
const toast = useToast()
const table = useTemplateRef('table')

// ─── State ────────────────────────────────────────────────────────────────────
const rowSelection = ref<Record<string, boolean>>({})
const columnVisibility = ref<Record<string, boolean>>({})

const search = useRouteQuery<string | undefined>('search', undefined, { resetKeys: ['page'] })
const sortValue = useRouteQuery('sort', 'created_at-desc', { resetKeys: ['page'] })
const page = useRouteQuery('page', 1)
const limit = useRouteQuery('limit', 15, { resetKeys: ['page'] })

// ─── Derived ──────────────────────────────────────────────────────────────────
const selectedCount = computed(() => Object.values(rowSelection.value).filter(Boolean).length)

function getSelectedRows(): VideoRow[] {
  return table.value?.tableApi
    ?.getFilteredSelectedRowModel()
    .rows.map((r: Row<VideoRow>) => r.original) ?? []
}

function clearSelection() {
  rowSelection.value = {}
}

// ─── Data ─────────────────────────────────────────────────────────────────────
const videoQuery = computed(() => {
  const [field, dir] = sortValue.value.split('-') as [string, string]
  const dbField = field === 'name' ? 'title' : field
  let q = supabase
    .from('videos')
    .select('*', { count: 'exact' })
    .is('deleted_at', null)
    .order(dbField, { ascending: dir === 'asc' })

  if (search.value) q = q.ilike('title', `%${search.value}%`)
  return q
})

const { data: videoData, refresh, pending } = await useAsyncData('video-list', async () => {
  const { data, count, error } = await videoQuery.value
    .range((page.value - 1) * limit.value, page.value * limit.value - 1)
  if (error) throw error
  return { data: (data ?? []) as VideoRow[], count: count ?? 0 }
}, {
  default: () => ({ data: [] as VideoRow[], count: 0 }),
  watch: [sortValue, page, limit]
})

watchDebounced([search], async () => {
  page.value = 1
  await refresh()
}, { debounce: 400 })

// ─── Modal state ──────────────────────────────────────────────────────────────
const addEditOpen = ref(false)
const editTarget = ref<VideoRow | null>(null)

const previewOpen = ref(false)
const previewTarget = ref<VideoRow | null>(null)

const deleteOpen = ref(false)
const deleteTargetRows = ref<VideoRow[]>([])

function openAdd() {
  editTarget.value = null
  addEditOpen.value = true
}

function openEdit(video: VideoRow) {
  editTarget.value = video
  addEditOpen.value = true
}

function openPreview(video: VideoRow) {
  previewTarget.value = video
  previewOpen.value = true
}

function openDelete(rows: VideoRow[]) {
  deleteTargetRows.value = rows
  deleteOpen.value = true
}

async function onSaved() {
  await refresh()
}

async function onDeleted() {
  clearSelection()
  await refresh()
}

// ─── YouTube utils ─────────────────────────────────────────────────────────────
function extractYoutubeId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([^&?\s]{11})/)
  return match ? match[1]! : null
}

function getYoutubeThumbnail(url: string): string | null {
  const id = extractYoutubeId(url)
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null
}

// ─── Row actions ──────────────────────────────────────────────────────────────
function rowActions(item: VideoRow) {
  return [
    [
      { label: 'Preview', icon: 'i-lucide-eye', onSelect: () => openPreview(item) },
      { label: 'Edit', icon: 'i-lucide-pencil', onSelect: () => openEdit(item) }
    ],
    [
      {
        label: 'Hapus Permanen',
        icon: 'i-lucide-trash-2',
        color: 'error' as const,
        onSelect: () => openDelete([item])
      }
    ]
  ]
}

// ─── Table columns ─────────────────────────────────────────────────────────────
const columns: TableColumn<VideoRow>[] = [
  {
    id: 'select',
    enableHiding: false,
    header: ({ table: t }) =>
      h(UCheckbox, {
        id: 'video-select-all',
        modelValue: t.getIsSomePageRowsSelected() ? 'indeterminate' : t.getIsAllPageRowsSelected(),
        'onUpdate:modelValue': (v: boolean | 'indeterminate') => t.toggleAllPageRowsSelected(!!v),
        ariaLabel: 'Select all'
      }),
    cell: ({ row }) =>
      h(UCheckbox, {
        id: `video-select-${row.id}`,
        modelValue: row.getIsSelected(),
        'onUpdate:modelValue': (v: boolean | 'indeterminate') => row.toggleSelected(!!v),
        ariaLabel: 'Select row'
      })
  },
  {
    id: 'thumbnail',
    header: '',
    cell: ({ row }) => {
      const thumb = getYoutubeThumbnail(row.original.link_yt)
      return h(
        'div',
        {
          class: 'relative w-24 h-14 rounded-md overflow-hidden bg-muted flex items-center justify-center shrink-0 cursor-pointer group',
          onClick: () => openPreview(row.original)
        },
        [
          thumb
            ? h('img', { src: thumb, class: 'w-full h-full object-cover group-hover:scale-105 transition-transform duration-200' })
            : h('span', { class: 'i-lucide-video text-muted w-5 h-5' }),
          h('div', { class: 'absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30' },
            h('span', { class: 'i-lucide-play-circle text-white w-8 h-8' })
          )
        ]
      )
    }
  },
  {
    accessorKey: 'title',
    header: 'Judul',
    cell: ({ row }) =>
      h('div', { class: 'min-w-0' }, [
        h('p', { class: 'font-medium text-highlighted truncate max-w-xs' }, row.original.title),
        row.original.description
          ? h('p', { class: 'text-xs text-muted truncate max-w-xs' }, row.original.description)
          : null
      ])
  },
  {
    accessorKey: 'category',
    header: 'Kategori',
    cell: ({ row }) =>
      row.original.category
        ? h(UBadge, { variant: 'soft', color: 'primary', class: 'capitalize' }, () => row.original.category)
        : h('span', { class: 'text-muted text-sm' }, '-')
  },
  {
    accessorKey: 'slug',
    header: 'Slug',
    cell: ({ row }) =>
      h('span', { class: 'text-sm text-muted font-mono truncate max-w-32 block' }, row.original.slug ?? '-')
  },
  {
    accessorKey: 'created_at',
    header: 'Dibuat',
    cell: ({ row }) =>
      h('span', { class: 'text-sm text-muted whitespace-nowrap' },
        format(new Date(row.original.created_at), 'dd MMM yyyy', { locale: localeId }))
  },
  {
    id: 'actions',
    enableHiding: false,
    cell: ({ row }) =>
      h('div', { class: 'text-right' },
        h(UDropdownMenu, {
          items: rowActions(row.original),
          content: { align: 'end' }
        }, () => h(UButton, { icon: 'i-lucide-ellipsis-vertical', color: 'neutral', variant: 'ghost', class: 'ml-auto' }))
      )
  }
]

const columnLabels: Record<string, string> = {
  thumbnail: 'Thumbnail',
  title: 'Judul',
  category: 'Kategori',
  slug: 'Slug',
  created_at: 'Dibuat'
}
</script>

<template>
  <UDashboardPanel id="videos">
    <template #header>
      <UDashboardNavbar title="Videos" :ui="{ right: 'gap-2' }">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UButton
            icon="i-lucide-plus"
            label="Tambah Video"
            @click="openAdd"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <!-- Filters -->
      <div class="flex flex-wrap items-center gap-2 mb-4">
        <UInput
          v-model="search"
          icon="i-lucide-search"
          placeholder="Cari judul video..."
          class="min-w-52"
        />
        <USelect
          v-model="sortValue"
          :items="Enum.SortOptions"
          value-key="value"
          label-key="label"
          class="min-w-36"
        />
        <div class="ml-auto flex items-center gap-2">
          <UDropdownMenu
            :items="table?.tableApi?.getAllColumns()
              .filter((col: any) => col.getCanHide())
              .map((col: any) => ({
                label: columnLabels[col.id] ?? col.id,
                type: 'checkbox' as const,
                checked: col.getIsVisible(),
                onUpdateChecked(checked: boolean) {
                  table?.tableApi?.getColumn(col.id)?.toggleVisibility(!!checked)
                },
                onSelect(e: Event) { e.preventDefault() }
              }))"
            :content="{ align: 'end' }"
          >
            <UButton
              color="neutral"
              variant="outline"
              icon="i-lucide-columns-3"
              trailing-icon="i-lucide-chevron-down"
              label="Kolom"
            />
          </UDropdownMenu>
          <UButton
            color="neutral"
            variant="outline"
            icon="i-lucide-refresh-cw"
            :loading="pending"
            @click="refresh()"
          />
        </div>
      </div>

      <!-- Table -->
      <UTable
        ref="table"
        v-model:row-selection="rowSelection"
        v-model:column-visibility="columnVisibility"
        :data="videoData?.data ?? []"
        :columns="columns"
        :loading="pending"
        :ui="{
          base: 'table-fixed border-separate border-spacing-0',
          thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none',
          tbody: '[&>tr]:last:[&>td]:border-b-0',
          th: 'py-2 first:rounded-l-lg last:rounded-r-lg border-y border-default first:border-l last:border-r',
          td: 'border-b border-default',
        }"
      />
    </template>

    <template #footer>
      <Pagination
        v-model:page="page"
        v-model:limit="limit"
        :total="videoData?.count ?? 0"
        :query="videoQuery"
        label="video"
      />
    </template>
  </UDashboardPanel>

  <!-- Bulk actions bar -->
  <Transition
    enter-active-class="transition ease-out duration-200"
    enter-from-class="translate-y-4 opacity-0"
    leave-active-class="transition ease-in duration-150"
    leave-to-class="translate-y-4 opacity-0"
  >
    <div
      v-if="selectedCount > 0"
      class="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2.5 rounded-xl shadow-xl bg-elevated border border-default backdrop-blur"
    >
      <span class="text-sm font-medium text-highlighted">
        {{ selectedCount }} dipilih
      </span>
      <USeparator orientation="vertical" class="h-5" />
      <UButton
        color="error"
        variant="soft"
        icon="i-lucide-trash-2"
        label="Hapus"
        size="sm"
        @click="openDelete(getSelectedRows())"
      />
      <USeparator orientation="vertical" class="h-5" />
      <UButton
        color="neutral"
        variant="ghost"
        icon="i-lucide-x"
        size="sm"
        @click="clearSelection"
      />
    </div>
  </Transition>

  <!-- Add / Edit Modal -->
  <VideosAddEditModal
    v-model:open="addEditOpen"
    :video="editTarget"
    @saved="onSaved"
  />

  <!-- Preview Modal -->
  <VideosPreviewModal
    v-model:open="previewOpen"
    :video="previewTarget"
  />

  <!-- Delete Modal -->
  <VideosDeleteModal
    v-model:open="deleteOpen"
    :rows="deleteTargetRows"
    @deleted="onDeleted"
  />
</template>
