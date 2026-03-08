<script setup lang="ts">
import { formatDistanceToNow } from 'date-fns'
import { id } from 'date-fns/locale'

const supabase = useSupabase()

type PendingItem = {
  id: string
  title: string
  module: string
  icon: string
  color: string
  time: string
  to: string
}

const { data: items } = await useAsyncData('dashboard-pending', async () => {
  const [newsRes, coursesRes, productsRes] = await Promise.all([
    supabase
      .from('news_updated')
      .select('id, title, created_at')
      .eq('status_news', 'pending')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(4),
    supabase
      .from('learning_courses')
      .select('id, title, created_at')
      .eq('status', 'pending')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(4),
    supabase
      .from('product_markets')
      .select('id, name, created_at')
      .eq('status', 'pending')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(4)
  ])

  const all: PendingItem[] = []

  for (const n of newsRes.data ?? []) {
    all.push({
      id: n.id,
      title: n.title,
      module: 'Berita',
      icon: 'i-lucide-newspaper',
      color: 'text-orange-500 bg-orange-50 dark:bg-orange-950',
      time: n.created_at,
      to: '/news'
    })
  }
  for (const c of coursesRes.data ?? []) {
    all.push({
      id: c.id,
      title: c.title,
      module: 'Kursus',
      icon: 'i-lucide-book-open',
      color: 'text-purple-500 bg-purple-50 dark:bg-purple-950',
      time: c.created_at,
      to: '/courses'
    })
  }
  for (const p of productsRes.data ?? []) {
    all.push({
      id: p.id,
      title: p.name,
      module: 'Produk',
      icon: 'i-lucide-shopping-cart',
      color: 'text-green-500 bg-green-50 dark:bg-green-950',
      time: p.created_at,
      to: '/markets'
    })
  }

  return all.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
}, { default: () => [] })

function timeAgo(t: string) {
  return formatDistanceToNow(new Date(t), { addSuffix: true, locale: id })
}
</script>

<template>
  <UCard
    :ui="{
      body: 'p-0 sm:p-0',
      header: 'px-4 py-3 sm:px-4 sm:py-3 flex items-center justify-between'
    }"
    class="h-full"
  >
    <template #header>
      <div class="flex items-center gap-2">
        <UIcon
          name="i-lucide-clock"
          class="size-4 text-orange-500"
        />
        <p class="font-semibold text-highlighted">
          Menunggu Review
        </p>
      </div>
      <UBadge
        v-if="items?.length"
        :label="String(items.length)"
        color="warning"
        variant="subtle"
      />
    </template>

    <div
      v-if="!items?.length"
      class="flex flex-col items-center justify-center py-12 gap-3 text-muted"
    >
      <UIcon
        name="i-lucide-check-circle"
        class="size-10 text-green-400"
      />
      <p class="text-sm font-medium">
        Semua konten sudah diproses!
      </p>
    </div>

    <ul
      v-else
      role="list"
      class="divide-y divide-default"
    >
      <li
        v-for="item in items"
        :key="item.id"
        class="flex items-start gap-3 px-4 py-3 hover:bg-elevated/50 transition-colors"
      >
        <div :class="['mt-0.5 rounded-lg p-2 shrink-0', item.color]">
          <UIcon
            :name="item.icon"
            class="size-3.5"
          />
        </div>
        <div class="min-w-0 flex-1">
          <p class="text-sm font-medium text-highlighted truncate">
            {{ item.title }}
          </p>
          <p class="text-xs text-muted">
            {{ item.module }} · {{ timeAgo(item.time) }}
          </p>
        </div>
        <NuxtLink :to="item.to">
          <UButton
            size="xs"
            color="warning"
            variant="soft"
            label="Review"
            trailing-icon="i-lucide-arrow-right"
          />
        </NuxtLink>
      </li>
    </ul>
  </UCard>
</template>
