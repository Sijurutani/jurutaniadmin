<script setup lang="ts">
definePageMeta({
  layout: 'plain'
})

const authStore = useAuthStore()
const toast = useToast()

onMounted(async () => {
  const { error } = await authStore.handleOAuthCallback()

  if (error) {
    toast.add({
      title: error.includes('Access denied') ? 'Access Denied' : 'Authentication Failed',
      description: error.includes('Access denied')
        ? 'Only admins can access this dashboard.'
        : 'Could not complete sign in. Please try again.',
      color: 'error'
    })
    await navigateTo('/signin')
    return
  }

  await navigateTo('/')
})
</script>

<template>
  <div class="h-screen flex items-center justify-center">
    <div class="flex flex-col items-center gap-3">
      <UIcon name="i-lucide-loader-circle" class="animate-spin size-8 text-primary" />
      <p class="text-sm text-muted">
        Verifying your access...
      </p>
    </div>
  </div>
</template>
