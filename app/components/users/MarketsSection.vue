<script setup lang="ts">
import { format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import type { TableColumn } from '@nuxt/ui'
import type { Database } from '~/types/database.types'

type MarketRow = Database['public']['Tables']['product_markets']['Row']

const props = defineProps<{ userId: string }>()

const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')

const supabase = useSupabaseClient()
const toast = useToast()

const page = ref(1)
const limit = 10

const { data: marketsData, refresh, pending } = await useAsyncData(`user-markets-${props.userId}`, async () => {
  const { data, count, error } = await supabase
    .from('product_markets')
    .select('*', { count: 'exact' })
    .eq('user_id', props.userId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .range((page.value - 1) * limit, page.value * limit - 1)
  if (error) throw error
  return { data: (data ?? []) as MarketRow[], count: count ?? 0 }
}, {
  default: () => ({ data: [] as MarketRow[], count: 0 }),
  watch: [page]
})

function getThumb(url: string | null) {
  if (!url) return null
  if (url.startsWith('http')) return url
  try {
    return supabase.storage.from('product-markets').getPublicUrl(url).data.publicUrl
  } catch { return null }
}

async function softDelete(item: MarketRow) {
  const { error } = await supabase.from('product_markets').update({
    deleted_at: new Date().toISOString()
  }).eq('id', item.id)
  if (error) { toast.add({ title: 'Error', description: error.message, color: 'error' }); return }
  toast.add({ title: 'Produk dihapus', color: 'success', duration: 2000 })
  await refresh()
}

const columns: TableColumn<MarketRow>[] = [
  {
    accessorKey: 'name',
    header: 'Produk',
    cell: ({ row }) => {
      const thumb = getThumb(row.original.thumbnail_url)
      return h('div', { class: 'flex items-center gap-3' }, [
        thumb
          ? h('img', {
              src: thumb,
              alt: row.original.name,
              class: 'size-10 rounded object-cover shrink-0 bg-muted'
            })
          : h('div', { class: 'size-10 rounded bg-elevated flex items-center justify-center shrink-0' },
              h(resolveComponent('UIcon'), { name: 'i-lucide-shopping-basket', class: 'size-4 text-muted' })),
        h('div', [
          h('p', { class: 'font-medium text-highlighted truncate max-w-xs' }, row.original.name),
          row.original.category
            ? h('p', { class: 'text-xs text-muted capitalize' }, row.original.category)
            : null
        ])
      ])
    }
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const s = Enum.StatusMarkets.find(x => x.value === row.original.status)
      const colorMap: Record<string, any> = { neutral: 'neutral', success: 'success', warning: 'warning', error: 'error' }
      return h(UBadge, { variant: 'soft', color: colorMap[s?.color ?? 'neutral'], class: 'capitalize' }, () => s?.label ?? row.original.status ?? 'Draft')
    }
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
        h(UButton, { to: `/markets/${row.original.id}/edit`, icon: 'i-lucide-pencil', size: 'xs', color: 'neutral', variant: 'ghost' }),
        h(UButton, {
          icon: 'i-lucide-trash-2', size: 'xs', color: 'error', variant: 'ghost',
          onClick: () => softDelete(row.original)
        })
      ])
  }
]

const totalPages = computed(() => Math.ceil((marketsData.value?.count ?? 0) / limit))
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <div>
          <p class="font-semibold text-highlighted">
            Produk Pasar
          </p>
          <p class="text-xs text-muted mt-0.5">
            {{ marketsData?.count ?? 0 }} produk yang diposting
          </p>
        </div>
        <UButton
          to="/markets/create"
          icon="i-lucide-plus"
          label="Buat Produk"
          size="sm"
          color="neutral"
          variant="soft"
        />
      </div>
    </template>

    <div v-if="!marketsData?.count && !pending" class="flex flex-col items-center justify-center py-8 gap-3 text-center">
      <div class="size-12 rounded-full bg-muted/50 flex items-center justify-center">
        <UIcon name="i-lucide-shopping-basket" class="size-6 text-muted" />
      </div>
      <p class="text-sm text-muted">
        Pengguna ini belum memposting produk pasar
      </p>
    </div>

    <UTable
      v-else
      :data="marketsData?.data ?? []"
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
