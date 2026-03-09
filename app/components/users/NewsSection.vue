<script setup lang="ts">
import { format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import type { TableColumn } from '@nuxt/ui'
import type { Database } from '~/types/database.types'

type NewsRow = Database['public']['Tables']['news_updated']['Row']

const props = defineProps<{ userId: string }>()

const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')

const supabase = useSupabaseClient()
const toast = useToast()

const page = ref(1)
const limit = 10

const { data: newsData, refresh, pending } = await useAsyncData(`user-news-${props.userId}`, async () => {
  const { data, count, error } = await supabase
    .from('news_updated')
    .select('*', { count: 'exact' })
    .eq('user_id', props.userId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .range((page.value - 1) * limit, page.value * limit - 1)
  if (error) throw error
  return { data: (data ?? []) as NewsRow[], count: count ?? 0 }
}, {
  default: () => ({ data: [] as NewsRow[], count: 0 }),
  watch: [page]
})

async function softDelete(item: NewsRow) {
  const { error } = await supabase.from('news_updated').update({
    deleted_at: new Date().toISOString()
  }).eq('id', item.id)
  if (error) { toast.add({ title: 'Error', description: error.message, color: 'error' }); return }
  toast.add({ title: 'Berita dihapus', color: 'success', duration: 2000 })
  await refresh()
}

const columns: TableColumn<NewsRow>[] = [
  {
    accessorKey: 'title',
    header: 'Judul',
    cell: ({ row }) =>
      h('div', [
        h('p', { class: 'font-medium text-highlighted truncate max-w-xs' }, row.original.title),
        row.original.sub_title
          ? h('p', { class: 'text-xs text-muted truncate max-w-xs' }, row.original.sub_title)
          : null
      ])
  },
  {
    accessorKey: 'status_news',
    header: 'Status',
    cell: ({ row }) => {
      const s = Enum.StatusNews.find(x => x.value === row.original.status_news)
      const colorMap: Record<string, any> = { neutral: 'neutral', success: 'success', warning: 'warning', error: 'error' }
      return h(UBadge, { variant: 'soft', color: colorMap[s?.color ?? 'neutral'], class: 'capitalize' }, () => s?.label ?? row.original.status_news)
    }
  },
  {
    accessorKey: 'category',
    header: 'Kategori',
    cell: ({ row }) =>
      h(UBadge, { variant: 'soft', color: 'primary', class: 'capitalize' }, () => row.original.category)
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
    cell: ({ row }) =>
      h('div', { class: 'flex items-center justify-end gap-1' }, [
        h(UButton, { to: `/news/${row.original.id}/edit`, icon: 'i-lucide-pencil', size: 'xs', color: 'neutral', variant: 'ghost' }),
        h(UButton, {
          icon: 'i-lucide-trash-2', size: 'xs', color: 'error', variant: 'ghost',
          onClick: () => softDelete(row.original)
        })
      ])
  }
]

const totalPages = computed(() => Math.ceil((newsData.value?.count ?? 0) / limit))
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <div>
          <p class="font-semibold text-highlighted">
            Berita
          </p>
          <p class="text-xs text-muted mt-0.5">
            {{ newsData?.count ?? 0 }} artikel yang ditulis
          </p>
        </div>
        <UButton
          to="/news/create"
          icon="i-lucide-plus"
          label="Buat Berita"
          size="sm"
          color="neutral"
          variant="soft"
        />
      </div>
    </template>

    <div v-if="!newsData?.count && !pending" class="flex flex-col items-center justify-center py-8 gap-3 text-center">
      <div class="size-12 rounded-full bg-muted/50 flex items-center justify-center">
        <UIcon name="i-lucide-newspaper" class="size-6 text-muted" />
      </div>
      <p class="text-sm text-muted">
        Pengguna ini belum membuat berita
      </p>
    </div>

    <UTable
      v-else
      :data="newsData?.data ?? []"
      :columns="columns"
      :loading="pending"
      :ui="{
        base: 'table-fixed border-separate border-spacing-0',
        thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none',
        tbody: '[&>tr]:last:[&>td]:border-b-0',
        th: 'py-2 first:rounded-l-lg last:rounded-r-lg border-y border-default first:border-l last:border-r',
        td: 'border-b border-default'
      }"
    />

    <template v-if="totalPages > 1" #footer>
      <div class="flex items-center justify-between px-2 py-1 text-xs text-muted">
        <span>Halaman {{ page }} dari {{ totalPages }}</span>
        <div class="flex gap-1">
          <UButton
            :disabled="page <= 1"
            icon="i-lucide-chevron-left"
            size="xs"
            color="neutral"
            variant="ghost"
            @click="page--"
          />
          <UButton
            :disabled="page >= totalPages"
            icon="i-lucide-chevron-right"
            size="xs"
            color="neutral"
            variant="ghost"
            @click="page++"
          />
        </div>
      </div>
    </template>
  </UCard>
</template>
