<script setup lang="ts">
const supabase = useSupabaseClient()
const toast = useToast()

const q = ref('')
const loading = ref(true)

const { data: members, refresh } = await useAsyncData('admin-members', async () => {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, username, email, avatar_url, role, created_at')
    .in('role', ['admin', 'superadmin'])
    .is('deleted_at', null)
    .order('created_at', { ascending: true })

  if (error) {
    toast.add({ title: 'Error', description: error.message, color: 'error' })
    return []
  }
  return data ?? []
}, { default: () => [] })

loading.value = false

const filteredMembers = computed(() => {
  const keyword = q.value.toLowerCase()
  if (!keyword) return members.value
  return members.value.filter(m =>
    (m.full_name ?? '').toLowerCase().includes(keyword)
    || (m.username ?? '').toLowerCase().includes(keyword)
    || (m.email ?? '').toLowerCase().includes(keyword)
  )
})
</script>

<template>
  <div>
    <UPageCard
      title="Admin"
      description="Daftar pengguna yang memiliki akses ke dashboard admin."
      variant="naked"
      orientation="horizontal"
      class="mb-4"
    />

    <UPageCard
      variant="subtle"
      :ui="{ container: 'p-0 sm:p-0 gap-y-0', wrapper: 'items-stretch', header: 'p-4 mb-0 border-b border-default' }"
    >
      <template #header>
        <UInput
          v-model="q"
          icon="i-lucide-search"
          placeholder="Cari admin..."
          autofocus
          class="w-full"
        />
      </template>

      <div
        v-if="loading"
        class="py-10 flex justify-center"
      >
        <UIcon
          name="i-lucide-loader-circle"
          class="animate-spin text-muted"
          size="24"
        />
      </div>

      <ul
        v-else
        role="list"
        class="divide-y divide-default"
      >
        <li
          v-for="member in filteredMembers"
          :key="member.id"
          class="flex items-center justify-between gap-3 py-3 px-4 sm:px-6"
        >
          <div class="flex items-center gap-3 min-w-0">
            <UAvatar
              :src="member.avatar_url ?? undefined"
              :alt="member.full_name ?? member.email ?? ''"
              size="md"
            />
            <div class="text-sm min-w-0">
              <p class="text-highlighted font-medium truncate">
                {{ member.full_name || member.username || '(no name)' }}
              </p>
              <p class="text-muted truncate">
                {{ member.email }}
              </p>
            </div>
          </div>

          <UBadge
            :label="member.role ?? 'admin'"
            color="neutral"
            variant="subtle"
            class="capitalize"
          />
        </li>

        <li
          v-if="filteredMembers.length === 0"
          class="py-8 text-center text-muted text-sm"
        >
          Tidak ada admin ditemukan.
        </li>
      </ul>
    </UPageCard>
  </div>
</template>
