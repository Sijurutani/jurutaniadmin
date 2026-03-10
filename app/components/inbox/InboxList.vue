<script setup lang="ts">
import { format, isToday, isYesterday } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import type { DropdownMenuItem } from '@nuxt/ui'
import type { ConversationWithProfiles } from '~/pages/inbox.vue'

const props = defineProps<{
  conversations: ConversationWithProfiles[]
  myId: string
  unreadCounts: Record<string, number>
  total: number
  loading?: boolean
}>()

const emit = defineEmits<{
  'mark-read': [convId: string]
  'delete-conv': [convId: string]
}>()

const selectedId = defineModel<string | null>('selectedId', { default: null })
const filterMode = defineModel<string>('filterMode', { default: 'all' })
const page = defineModel<number>('page', { default: 1 })
const limit = defineModel<number>('limit', { default: 20 })

const search = ref('')

const totalUnread = computed(() =>
  Object.values(props.unreadCounts).reduce((a, b) => a + b, 0)
)

// Client-side search on current page data
const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return props.conversations
  return props.conversations.filter(c => {
    const other = getOther(c)
    const name = (other.full_name || other.username || '').toLowerCase()
    return name.includes(q) || (c.last_message ?? '').toLowerCase().includes(q)
  })
})

// Reset to page 1 when search changes
watch(search, () => { page.value = 1 })

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

const filterTabs = [
  { label: 'Semua', value: 'all' },
  { label: 'Belum Dibaca', value: 'unread', slot: 'unread' }
]

function convActions(conv: ConversationWithProfiles): DropdownMenuItem[][] {
  const hasUnread = (props.unreadCounts[conv.id] ?? 0) > 0
  return [
    [
      {
        label: 'Buka Percakapan',
        icon: 'i-lucide-message-circle',
        onSelect: () => { selectedId.value = conv.id }
      }
    ],
    [
      ...(hasUnread
        ? [{
            label: 'Tandai Sudah Dibaca',
            icon: 'i-lucide-check-check',
            onSelect: () => emit('mark-read', conv.id)
          }]
        : []
      ),
      {
        label: 'Hapus Percakapan',
        icon: 'i-lucide-trash-2',
        color: 'error' as const,
        onSelect: () => emit('delete-conv', conv.id)
      }
    ]
  ]
}
</script>

<template>
  <div class="flex flex-col h-full overflow-hidden">
    <!-- Search + Filter -->
    <div class="px-3 pt-2.5 pb-0 border-b border-default shrink-0">
      <!-- UInput search bar -->
      <UInput
        v-model="search"
        icon="i-lucide-search"
        placeholder="Cari percakapan..."
        size="sm"
        class="w-full mb-2"
        variant="none"
        :trailing-icon="search ? 'i-lucide-x' : undefined"
        @click:trailing="search = ''"
      />
    </div>
    <!-- Search + Filter -->
    <div class="px-3 pt-2.5 pb-0 border-b border-default shrink-0">
      <UTabs
        v-model="filterMode"
        :items="filterTabs"
        :content="false"
        size="sm"
        variant="link"
        class="w-full"
        :ui="{ list: 'w-full', trigger: 'flex-1 justify-center' }"
      >
        <template #unread="{ item }">
          <span class="flex items-center gap-1.5">
            {{ item.label }}
            <UBadge
              v-if="totalUnread > 0"
              :label="totalUnread > 99 ? '99+' : String(totalUnread)"
              color="error"
              variant="solid"
              size="xs"
            />
          </span>
        </template>
      </UTabs>
      
    </div>

    <!-- Loading -->
    <div v-if="loading && !conversations.length" class="flex-1 flex items-center justify-center">
      <UIcon name="i-lucide-loader-circle" class="size-5 text-muted animate-spin" />
    </div>

    <!-- Empty state -->
    <div
      v-else-if="!filtered.length"
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
      <div
        v-for="conv in filtered"
        :key="conv.id"
        class="flex items-start gap-3 p-3 border-l-2 transition-colors hover:bg-elevated/60 cursor-pointer group"
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
                class="min-w-4.5 h-4.5 rounded-full bg-primary text-white text-[9px] font-bold flex items-center justify-center px-1"
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

        <!-- 3-dot dropdown action -->
        <div
          class="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
          @click.stop
        >
          <UDropdownMenu
            :items="convActions(conv)"
            :content="{ align: 'end' }"
          >
            <UButton
              icon="i-lucide-ellipsis-vertical"
              color="neutral"
              variant="ghost"
              size="xs"
              square
            />
          </UDropdownMenu>
        </div>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="total > 0" class="shrink-0">
      <Pagination
        v-model:page="page"
        v-model:limit="limit"
        :total="total"
        label="percakapan"
      />
    </div>
  </div>
</template>

