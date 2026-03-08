<script setup lang="ts">
import { format, isToday, isYesterday } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import type { ConversationWithProfiles } from '~/pages/inbox.vue'

const props = defineProps<{
  conversations: ConversationWithProfiles[]
  myId: string
  unreadCounts: Record<string, number>
}>()

const selectedId = defineModel<string | null>('selectedId', { default: null })

const search = ref('')
const filterMode = ref<'all' | 'unread'>('all')

const totalUnread = computed(() =>
  Object.values(props.unreadCounts).reduce((a, b) => a + b, 0)
)

const filtered = computed(() => {
  let list = props.conversations
  if (filterMode.value === 'unread') {
    list = list.filter(c => (props.unreadCounts[c.id] ?? 0) > 0)
  }
  const q = search.value.trim().toLowerCase()
  if (!q) return list
  return list.filter(c => {
    const other = getOther(c)
    const name = (other.full_name || other.username || '').toLowerCase()
    return name.includes(q) || (c.last_message ?? '').toLowerCase().includes(q)
  })
})

function getOther(conv: ConversationWithProfiles) {
  return conv.participant1_id === props.myId ? conv.participant2 : conv.participant1
}

function formatTime(t: string | null) {
  if (!t) return ''
  const d = new Date(t)
  if (isToday(d)) return format(d, 'HH:mm')
  if (isYesterday(d)) return 'Kemarin'
  return format(d, 'd MMM', { locale: idLocale })
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
  <div class="flex flex-col h-full overflow-hidden">
    <!-- Search + Filter -->
    <div class="px-3 pt-2.5 pb-2 border-b border-default shrink-0 space-y-1.5">
      <!-- Plain search bar -->
      <div class="flex items-center gap-2 bg-elevated/80 rounded-lg px-2.5 py-1.5 border border-default/50">
        <UIcon name="i-lucide-search" class="size-3.5 text-dimmed shrink-0" />
        <input
          v-model="search"
          class="flex-1 min-w-0 text-sm bg-transparent outline-none placeholder:text-dimmed text-default"
          placeholder="Cari percakapan..."
        />
        <button
          v-if="search"
          type="button"
          class="text-dimmed hover:text-default transition-colors"
          @click="search = ''"
        >
          <UIcon name="i-lucide-x" class="size-3" />
        </button>
      </div>
      <!-- Filter tabs -->
      <div class="flex gap-1">
        <button
          type="button"
          class="flex-1 text-xs px-2 py-1 rounded-md font-medium transition-colors"
          :class="filterMode === 'all'
            ? 'bg-primary/10 text-primary'
            : 'text-muted hover:bg-elevated hover:text-default'"
          @click="filterMode = 'all'"
        >
          Semua
        </button>
        <button
          type="button"
          class="flex-1 text-xs px-2 py-1 rounded-md font-medium transition-colors flex items-center justify-center gap-1"
          :class="filterMode === 'unread'
            ? 'bg-primary/10 text-primary'
            : 'text-muted hover:bg-elevated hover:text-default'"
          @click="filterMode = 'unread'"
        >
          Belum Dibaca
          <span
            v-if="totalUnread > 0"
            class="min-w-4 h-4 rounded-full px-1 text-[9px] font-bold flex items-center justify-center"
            :class="filterMode === 'unread' ? 'bg-primary text-white' : 'bg-error/15 text-error'"
          >{{ totalUnread > 99 ? '99+' : totalUnread }}</span>
        </button>
      </div>
    </div>

    <!-- Empty state -->
    <div
      v-if="!filtered.length"
      class="flex-1 flex flex-col items-center justify-center gap-3 text-muted p-6"
    >
      <UIcon name="i-lucide-message-circle-off" class="size-10 text-dimmed" />
      <p class="text-sm text-center">
        {{ search
          ? 'Tidak ada percakapan ditemukan'
          : filterMode === 'unread'
            ? 'Tidak ada pesan belum dibaca'
            : 'Belum ada percakapan' }}
      </p>
    </div>

    <!-- List -->
    <div v-else class="flex-1 overflow-y-auto divide-y divide-default">
      <button
        v-for="conv in filtered"
        :key="conv.id"
        type="button"
        class="w-full text-left p-3 flex items-start gap-3 border-l-2 transition-colors hover:bg-elevated/60"
        :class="selectedId === conv.id ? 'border-primary bg-primary/8' : 'border-transparent'"
        @click="selectedId = conv.id"
      >
        <!-- Avatar with unread dot -->
        <div class="relative shrink-0">
          <UAvatar
            :src="getOther(conv).avatar_url ?? undefined"
            :alt="getOther(conv).full_name ?? getOther(conv).username ?? ''"
            size="md"
          />
          <span
            v-if="(unreadCounts[conv.id] ?? 0) > 0"
            class="absolute -top-0.5 -right-0.5 size-3 rounded-full bg-primary border-2 border-background"
          />
        </div>

        <!-- Content -->
        <div class="min-w-0 flex-1">
          <div class="flex items-center justify-between gap-1 mb-0.5">
            <p
              class="text-sm truncate leading-tight"
              :class="(unreadCounts[conv.id] ?? 0) > 0 ? 'font-bold text-highlighted' : 'font-semibold text-highlighted'"
            >
              {{ getOther(conv).full_name || getOther(conv).username || 'Pengguna' }}
            </p>
            <div class="flex items-center gap-1 shrink-0">
              <span
                v-if="(unreadCounts[conv.id] ?? 0) > 0"
                class="min-w-[18px] h-[18px] rounded-full bg-primary text-white text-[9px] font-bold flex items-center justify-center px-1"
              >{{ (unreadCounts[conv.id] ?? 0) > 99 ? '99+' : unreadCounts[conv.id] }}</span>
              <span class="text-xs text-muted">{{ formatTime(conv.last_message_at) }}</span>
            </div>
          </div>
          <div class="flex items-center gap-1.5">
            <UBadge
              v-if="getOther(conv).role"
              :label="roleLabel[getOther(conv).role!] ?? getOther(conv).role!"
              color="neutral"
              variant="subtle"
              size="xs"
              class="shrink-0"
            />
            <p
              class="text-xs truncate"
              :class="(unreadCounts[conv.id] ?? 0) > 0 ? 'text-default font-medium' : 'text-muted'"
            >
              {{ conv.last_message ?? 'Mulai percakapan...' }}
            </p>
          </div>
        </div>
      </button>
    </div>
  </div>
</template>

