<script setup lang="ts">
import type { Database } from '~/types/database.types'

type Profile = Pick<
  Database['public']['Tables']['profiles']['Row'],
  'id' | 'full_name' | 'username' | 'email' | 'avatar_url' | 'role'
>

const props = defineProps<{
  myId: string
}>()

const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ created: [conversationId: string] }>()

const supabase = useSupabaseClient()
const toast = useToast()

const search = ref('')
const results = ref<Profile[]>([])
const searching = ref(false)
const creating = ref(false)
const selected = ref<Profile | null>(null)

const debouncedSearch = useDebounceFn(async () => {
  const q = search.value.trim()
  if (!q) {
    results.value = []
    return
  }
  searching.value = true
  const { data } = await supabase.rpc('search_users', { search_term: q, user_limit: 10 })
  results.value = ((data ?? []) as unknown as Profile[]).filter(u => u.id !== props.myId)
  searching.value = false
}, 300)

watch(search, debouncedSearch)

function selectUser(user: Profile) {
  selected.value = user
  search.value = ''
  results.value = []
}

async function startChat() {
  if (!selected.value) return
  creating.value = true
  try {
    const conversationId = await supabase.rpc('create_or_get_conversation', {
      other_user_id: selected.value.id
    })
    if (conversationId.error) throw new Error(conversationId.error.message)
    emit('created', conversationId.data as string)
    selected.value = null
    search.value = ''
  } catch (err: any) {
    toast.add({ title: 'Gagal membuat percakapan', description: err?.message, color: 'error' })
  } finally {
    creating.value = false
  }
}

function onClose() {
  open.value = false
  selected.value = null
  search.value = ''
  results.value = []
}

const roleLabel: Record<string, string> = {
  petani: 'Petani',
  pakar: 'Pakar',
  penyuluh: 'Penyuluh',
  admin: 'Admin',
  superadmin: 'Superadmin'
}
</script>

<template>
  <UModal
    v-model:open="open"
    title="Mulai Chat Baru"
    description="Cari pengguna untuk memulai percakapan."
    :ui="{ content: 'max-w-sm' }"
    @close="onClose"
  >
    <template #body>
      <div class="space-y-4">
        <!-- Selected user chip -->
        <div
          v-if="selected"
          class="flex items-center gap-3 rounded-xl border border-default bg-elevated p-3"
        >
          <UAvatar
            :src="selected.avatar_url ?? undefined"
            :alt="selected.full_name ?? ''"
            size="sm"
          />
          <div class="min-w-0 flex-1">
            <p class="text-sm font-semibold text-highlighted truncate">
              {{ selected.full_name || selected.username }}
            </p>
            <p class="text-xs text-muted truncate">
              {{ selected.email }}
            </p>
          </div>
          <UButton
            icon="i-lucide-x"
            color="neutral"
            variant="ghost"
            square
            size="xs"
            @click="selected = null"
          />
        </div>

        <!-- Search input -->
        <div v-else>
          <UInput
            v-model="search"
            icon="i-lucide-search"
            placeholder="Cari nama atau username..."
            autofocus
            :loading="searching"
            class="w-full"
          />

          <!-- Results dropdown -->
          <div
            v-if="results.length"
            class="mt-1.5 rounded-xl border border-default bg-default shadow-lg overflow-hidden divide-y divide-default"
          >
            <button
              v-for="user in results"
              :key="user.id"
              type="button"
              class="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-elevated transition-colors text-left"
              @mousedown.prevent="selectUser(user)"
            >
              <UAvatar
                :src="user.avatar_url ?? undefined"
                :alt="user.full_name ?? ''"
                size="sm"
              />
              <div class="min-w-0 flex-1">
                <p class="text-sm font-medium text-highlighted truncate">
                  {{ user.full_name || user.username || 'Pengguna' }}
                </p>
                <p class="text-xs text-muted truncate">
                  {{ roleLabel[user.role ?? ''] ?? user.role ?? '' }}
                  {{ user.email ? '· ' + user.email : '' }}
                </p>
              </div>
            </button>
          </div>

          <p
            v-else-if="search && !searching"
            class="text-xs text-muted mt-2 text-center"
          >
            Tidak ada pengguna ditemukan
          </p>
        </div>

        <!-- Actions -->
        <div class="flex justify-end gap-2">
          <UButton
            label="Batal"
            color="neutral"
            variant="ghost"
            :disabled="creating"
            @click="onClose"
          />
          <UButton
            label="Mulai Chat"
            icon="i-lucide-message-circle"
            :loading="creating"
            :disabled="!selected"
            @click="startChat"
          />
        </div>
      </div>
    </template>
  </UModal>
</template>
