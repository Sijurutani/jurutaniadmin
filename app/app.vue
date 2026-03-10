<script setup lang="ts">
useHead({
  meta: [
    { charset: 'utf-8' },
    { name: 'viewport', content: 'width=device-width, initial-scale=1' },
    { key: 'theme-color', name: 'theme-color', content: 'white' }
  ],
  link: [
    { rel: 'icon', href: '/favicon.ico' }
  ],
  htmlAttrs: {
    lang: 'en'
  }
})

const title = 'Jurutani Admin'
const description = 'Admin Dashboard for Jurutani'

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  ogImage: '',
  twitterImage: '',
  twitterCard: 'summary_large_image'
})

const supabase = useSupabaseClient()

onMounted(() => {
  // Fix for Supabase hanging (stuck lock promise/deadlock) when tab inactive
  // We stop the auto-refresher when the tab is hidden so it doesn't get suspended mid-refresh
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      // Resume token refresher & fetch session immediately
      supabase.auth.startAutoRefresh()
      supabase.auth.getSession()

      // Restart realtime listeners
      if (typeof supabase.realtime?.connect === 'function') {
        supabase.realtime.connect()
      }
    } else {
      // Pause refreshing while tab is asleep to prevent deadlocks
      supabase.auth.stopAutoRefresh()
    }
  })
})
</script>

<template>
  <UApp>
    <NuxtLoadingIndicator />

    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>

<style>

</style>
