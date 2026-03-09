<script setup lang="ts">
import { formatDistanceToNow } from 'date-fns'
import { id } from 'date-fns/locale'

const supabase = useSupabaseClient()

type ActivityItem = {
  id: string
  type: 'user' | 'product' | 'news' | 'course'
  label: string
  sub: string
  icon: string
  color: string
  time: string
  to: string
}

const { data: activities } = await useAsyncData('dashboard-recent', async () => {
  const [usersRes, productsRes, newsRes, coursesRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, email, created_at')
      .not('role', 'in', '("admin","superadmin")')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(3),
    supabase
      .from('product_markets')
      .select('id, name, created_at')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(3),
    supabase
      .from('news_updated')
      .select('id, title, created_at')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(3),
    supabase
      .from('learning_courses')
      .select('id, title, created_at')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(3)
  ])

  const items: ActivityItem[] = []

  for (const u of usersRes.data ?? []) {
    items.push({
      id: u.id,
      type: 'user',
      label: u.full_name ?? u.email ?? 'Pengguna baru',
      sub: 'Pengguna baru terdaftar',
      icon: 'i-lucide-user-plus',
      color: 'text-blue-500',
      time: u.created_at,
      to: '/users'
    })
  }
  for (const p of productsRes.data ?? []) {
    items.push({
      id: p.id,
      type: 'product',
      label: p.name,
      sub: 'Produk baru di pasar',
      icon: 'i-lucide-package-plus',
      color: 'text-green-500',
      time: p.created_at,
      to: '/markets'
    })
  }
  for (const n of newsRes.data ?? []) {
    items.push({
      id: n.id,
      type: 'news',
      label: n.title,
      sub: 'Berita baru',
      icon: 'i-lucide-newspaper',
      color: 'text-orange-500',
      time: n.created_at,
      to: '/news'
    })
  }
  for (const c of coursesRes.data ?? []) {
    items.push({
      id: c.id,
      type: 'course',
      label: c.title,
      sub: 'Kursus baru ditambahkan',
      icon: 'i-lucide-book-plus',
      color: 'text-purple-500',
      time: c.created_at,
      to: '/courses'
    })
  }

  return items.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 10)
}, { default: () => [] })

function timeAgo(dateStr: string) {
  return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: id })
}
</script>

<template>
  <UCard :ui="{ body: 'p-0 sm:p-0', header: 'px-4 py-3 sm:px-4 sm:py-3' }">
    <template #header>
      <p class="font-semibold text-highlighted">
        Aktivitas Terbaru
      </p>
    </template>

    <ul
      role="list"
      class="divide-y divide-default"
    >
      <li
        v-for="item in activities"
        :key="`${item.type}-${item.id}`"
        class="flex items-start gap-3 px-4 py-3"
      >
        <div :class="['mt-0.5 rounded-lg p-2 bg-default shrink-0', item.color]">
          <UIcon
            :name="item.icon"
            class="size-4"
          />
        </div>
        <div class="min-w-0 flex-1">
          <NuxtLink
            :to="item.to"
            class="text-sm font-medium text-highlighted hover:text-primary truncate block"
          >
            {{ item.label }}
          </NuxtLink>
          <p class="text-xs text-muted">
            {{ item.sub }} · {{ timeAgo(item.time) }}
          </p>
        </div>
      </li>
      <li
        v-if="!activities?.length"
        class="px-4 py-8 text-center text-sm text-muted"
      >
        Belum ada aktivitas.
      </li>
    </ul>
  </UCard>
</template>
