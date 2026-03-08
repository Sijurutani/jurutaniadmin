<script setup lang="ts">
const links = [
  {
    label: 'Berita',
    description: 'Kelola artikel & konten berita',
    icon: 'i-lucide-newspaper',
    to: '/news',
    color: 'bg-orange-50 dark:bg-orange-950 text-orange-500'
  },
  {
    label: 'Pasar',
    description: 'Produk & transaksi marketplace',
    icon: 'i-lucide-shopping-cart',
    to: '/markets',
    color: 'bg-green-50 dark:bg-green-950 text-green-500'
  },
  {
    label: 'Kursus',
    description: 'Materi & pelajaran kursus',
    icon: 'i-lucide-book-open',
    to: '/courses',
    color: 'bg-purple-50 dark:bg-purple-950 text-purple-500'
  },
  {
    label: 'Meeting',
    description: 'Jadwal & pertemuan online',
    icon: 'i-lucide-calendar',
    to: '/meetings',
    color: 'bg-blue-50 dark:bg-blue-950 text-blue-500'
  },
  {
    label: 'Pengguna',
    description: 'Manajemen akun pengguna',
    icon: 'i-lucide-users',
    to: '/users',
    color: 'bg-indigo-50 dark:bg-indigo-950 text-indigo-500'
  },
  {
    label: 'Pakar',
    description: 'Daftar & manajemen pakar',
    icon: 'i-lucide-brain',
    to: '/experts',
    color: 'bg-red-50 dark:bg-red-950 text-red-500'
  },
  {
    label: 'Penyuluh',
    description: 'Data & manajemen penyuluh',
    icon: 'i-lucide-graduation-cap',
    to: '/instructors',
    color: 'bg-teal-50 dark:bg-teal-950 text-teal-500'
  },
  {
    label: 'Video',
    description: 'Konten video edukasi',
    icon: 'i-lucide-video',
    to: '/videos',
    color: 'bg-pink-50 dark:bg-pink-950 text-pink-500'
  },
  {
    label: 'Konten',
    description: 'Banner, carousel, hero',
    icon: 'i-lucide-layout-template',
    to: '/contents',
    color: 'bg-yellow-50 dark:bg-yellow-950 text-yellow-600'
  },
  {
    label: 'Inbox',
    description: 'Pesan & komunikasi',
    icon: 'i-lucide-inbox',
    to: '/inbox',
    color: 'bg-gray-50 dark:bg-gray-900 text-gray-500'
  }
]
</script>

<template>
  <div>
    <p class="text-sm font-semibold text-muted uppercase tracking-wide mb-3">
      Akses Cepat
    </p>
    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      <NuxtLink
        v-for="link in links"
        :key="link.to"
        :to="link.to"
        class="group"
      >
        <UCard :ui="{ body: 'flex flex-col items-center text-center gap-2 py-4 px-3' }" class="h-full hover:ring-2 hover:ring-primary transition-all">
          <div :class="['rounded-xl p-3', link.color]">
            <UIcon
              :name="link.icon"
              class="size-6"
            />
          </div>
          <div>
            <p class="text-sm font-semibold text-highlighted group-hover:text-primary transition-colors">
              {{ link.label }}
            </p>
            <p class="text-xs text-muted mt-0.5 hidden sm:block">
              {{ link.description }}
            </p>
          </div>
        </UCard>
      </NuxtLink>
    </div>
  </div>
</template>
