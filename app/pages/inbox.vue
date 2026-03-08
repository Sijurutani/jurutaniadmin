<script setup lang="ts">
import { breakpointsTailwind } from '@vueuse/core'
import type { Database } from '~/types/database.types'

useHead({ title: 'Inbox - Jurutani Admin' })

type Profile = Database['public']['Tables']['profiles']['Row']
type Conversation = Database['public']['Tables']['conversations']['Row']

export type ConversationWithProfiles = Conversation & {
  participant1: Pick<Profile, 'id' | 'full_name' | 'username' | 'avatar_url' | 'role'>
  participant2: Pick<Profile, 'id' | 'full_name' | 'username' | 'avatar_url' | 'role'>
}

const auth = useAuth()
const supabase = useSupabase()
const myId = computed(() => auth.profile?.id ?? '')

// ─── Conversations ────────────────────────────────────────────────────────────
const { data: conversations, refresh: refreshConversations } = await useAsyncData(
  'inbox-conversations',
  async () => {
    if (!myId.value) return []
    const { data, error } = await supabase
      .from('conversations')
      .select(`
        *,
        participant1:profiles!participant1_id(id, full_name, username, avatar_url, role),
        participant2:profiles!participant2_id(id, full_name, username, avatar_url, role)
      `)
      .or(`participant1_id.eq.${myId.value},participant2_id.eq.${myId.value}`)
      .order('last_message_at', { ascending: false })
    if (error) throw error
    return (data ?? []) as ConversationWithProfiles[]
  },
  { default: () => [] as ConversationWithProfiles[] }
)

// ─── Unread counts per conversation ──────────────────────────────────────────
const unreadCounts = ref<Record<string, number>>({})

async function fetchUnreadCounts() {
  if (!myId.value) return
  const { data } = await supabase
    .from('messages')
    .select('conversation_id')
    .eq('is_read', false)
    .neq('sender_id', myId.value)
  if (data) {
    unreadCounts.value = data.reduce((acc: Record<string, number>, row) => {
      acc[row.conversation_id] = (acc[row.conversation_id] ?? 0) + 1
      return acc
    }, {})
  }
}

async function refreshAll() {
  await refreshConversations()
  await fetchUnreadCounts()
}

watch(conversations, () => fetchUnreadCounts(), { immediate: true })

function getOtherUser(conv: ConversationWithProfiles) {
  return conv.participant1_id === myId.value ? conv.participant2 : conv.participant1
}

// ─── Selected conversation ────────────────────────────────────────────────────
const selectedConvId = ref<string | null>(null)
const selectedConv = computed(() =>
  conversations.value.find(c => c.id === selectedConvId.value) ?? null
)
const otherUser = computed(() =>
  selectedConv.value ? getOtherUser(selectedConv.value) : null
)

// ─── New chat modal ───────────────────────────────────────────────────────────
const newChatOpen = ref(false)

function onConversationCreated(convId: string) {
  newChatOpen.value = false
  refreshAll()
  selectedConvId.value = convId
}

// ─── Realtime: update conversation list when last_message changes ─────────────
onMounted(() => {
  if (!myId.value) return
  const channel = supabase
    .channel('inbox-conversations-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => {
      refreshAll()
    })
    .subscribe()
  onUnmounted(() => { supabase.removeChannel(channel) })
})

// ─── Mobile ───────────────────────────────────────────────────────────────────
const breakpoints = useBreakpoints(breakpointsTailwind)
const isMobile = breakpoints.smaller('lg')
</script>

<template>
  <UDashboardPanel
    id="inbox-list"
    :default-size="28"
    :min-size="22"
    :max-size="35"
    resizable
  >
    <UDashboardNavbar title="Pesan" :ui="{ right: 'gap-1' }">
      <template #leading>
        <UDashboardSidebarCollapse />
      </template>
      <template #right>
        <UTooltip text="Mulai chat baru">
          <UButton
            icon="i-lucide-pencil-line"
            color="neutral"
            variant="ghost"
            square
            size="sm"
            @click="newChatOpen = true"
          />
        </UTooltip>
      </template>
    </UDashboardNavbar>

    <InboxList
      v-model:selected-id="selectedConvId"
      :conversations="conversations"
      :my-id="myId"
      :unread-counts="unreadCounts"
    />
  </UDashboardPanel>

  <InboxMail
    v-if="selectedConvId && otherUser"
    :key="selectedConvId"
    :conversation-id="selectedConvId"
    :other-user="otherUser"
    :my-id="myId"
    @close="selectedConvId = null"
    @refresh-list="refreshAll"
  />
  <div
    v-else
    class="hidden lg:flex flex-1 flex-col items-center justify-center gap-4 text-center"
  >
    <div class="size-20 rounded-2xl bg-elevated flex items-center justify-center">
      <UIcon name="i-lucide-message-circle" class="size-10 text-dimmed" />
    </div>
    <div>
      <p class="font-semibold text-highlighted mb-1">
        Belum ada percakapan dipilih
      </p>
      <p class="text-sm text-muted">
        Pilih percakapan di sebelah kiri atau mulai chat baru
      </p>
    </div>
    <UButton
      icon="i-lucide-pencil-line"
      label="Mulai Chat Baru"
      size="sm"
      variant="soft"
      @click="newChatOpen = true"
    />
  </div>

  <InboxNewChatModal
    v-model:open="newChatOpen"
    :my-id="myId"
    @created="onConversationCreated"
  />
</template>
