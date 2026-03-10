<script setup lang="ts">
import { format, isToday, isYesterday, isSameDay } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import type { Database } from '~/types/database.types'

type Profile = Pick<Database['public']['Tables']['profiles']['Row'], 'id' | 'full_name' | 'username' | 'avatar_url' | 'role'>
type MessageRow = Database['public']['Tables']['messages']['Row']
type MessageWithSender = MessageRow & { sender: Profile }

const props = defineProps<{
  conversationId: string
  otherUser: Profile
  myId: string
}>()

const emit = defineEmits<{
  close: []
  refreshList: []
}>()

const supabase = useSupabaseClient()
const auth = useAuth()
const toast = useToast()

// ─── Messages ─────────────────────────────────────────────────────────────────
const messages = ref<MessageWithSender[]>([])
const loadingMessages = ref(true)

async function fetchMessages() {
  loadingMessages.value = true
  const { data, error } = await supabase
    .from('messages')
    .select('*, sender:profiles!sender_id(id, full_name, username, avatar_url, role)')
    .eq('conversation_id', props.conversationId)
    .order('created_at', { ascending: true })
    .limit(100)
  if (!error) messages.value = (data ?? []) as MessageWithSender[]
  loadingMessages.value = false
}

// ─── Mark as read ─────────────────────────────────────────────────────────────
// Update pesan dari lawan bicara yang belum dibaca → is_read = true
async function markRead() {
  const unreadFromOther = messages.value.filter(
    m => m.sender_id === props.otherUser.id && !m.is_read
  )
  if (!unreadFromOther.length) return

  // Optimistic: langsung update UI sebelum request selesai
  messages.value.forEach(m => {
    if (m.sender_id === props.otherUser.id && !m.is_read) {
      m.is_read = true
    }
  })

  const { error } = await supabase
    .from('messages')
    .update({ is_read: true })
    .eq('conversation_id', props.conversationId)
    .eq('sender_id', props.otherUser.id)
    .eq('is_read', false)

  if (error) {
    // Rollback optimistic update jika gagal
    const failedIds = new Set(unreadFromOther.map(m => m.id))
    messages.value.forEach(m => {
      if (failedIds.has(m.id)) m.is_read = false
    })
    toast.add({ title: 'Gagal menandai pesan sebagai dibaca', description: error.message, color: 'error' })
    return
  }

  emit('refreshList')
}

// ─── Realtime subscription ────────────────────────────────────────────────────
let channel: ReturnType<typeof supabase.channel> | null = null

function subscribeRealtime() {
  channel = supabase
    .channel(`messages-${props.conversationId}`)
    .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${props.conversationId}` },
      async (payload) => {
        const { data } = await supabase
          .from('messages')
          .select('*, sender:profiles!sender_id(id, full_name, username, avatar_url, role)')
          .eq('id', payload.new.id)
          .single()
        if (data) {
          messages.value.push(data as MessageWithSender)
          if ((data as MessageWithSender).sender_id !== props.myId) markRead()
          await nextTick()
          if (isNearBottom.value) scrollToBottom()
          else newMessageCount.value++
        }
        emit('refreshList')
      }
    )
    .on('postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${props.conversationId}` },
      (payload) => {
        const idx = messages.value.findIndex(m => m.id === (payload.new as MessageRow).id)
        if (idx !== -1) messages.value[idx] = { ...messages.value[idx]!, ...(payload.new as MessageRow) }
      }
    )
    .on('postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${props.conversationId}` },
      (payload) => {
        messages.value = messages.value.filter(m => m.id !== (payload.old as { id: string }).id)
      }
    )
    .subscribe()
}

// ─── Scroll logic ─────────────────────────────────────────────────────────────
const scrollEl = ref<HTMLElement | null>(null)
const isNearBottom = ref(true)
const newMessageCount = ref(0)

function onScroll() {
  if (!scrollEl.value) return
  const { scrollTop, scrollHeight, clientHeight } = scrollEl.value
  isNearBottom.value = scrollHeight - scrollTop - clientHeight < 80
  if (isNearBottom.value) newMessageCount.value = 0
}

function scrollToBottom(smooth = true) {
  nextTick(() => {
    if (!scrollEl.value) return
    scrollEl.value.scrollTo({ top: scrollEl.value.scrollHeight, behavior: smooth ? 'smooth' : 'instant' })
  })
}

// ─── Send message ─────────────────────────────────────────────────────────────
const text = ref('')
const sending = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const pendingFiles = ref<{ file: File, preview: string | null, type: 'image' | 'file' }[]>([])

function isImageFile(file: File) {
  return file.type.startsWith('image/')
}

function onFilePick(event: Event) {
  const files = Array.from((event.target as HTMLInputElement).files ?? [])
  for (const file of files) {
    const preview = isImageFile(file) ? URL.createObjectURL(file) : null
    pendingFiles.value.push({ file, preview, type: isImageFile(file) ? 'image' : 'file' })
  }
  if (fileInput.value) fileInput.value.value = ''
}

function removePendingFile(idx: number) {
  const f = pendingFiles.value[idx]
  if (f?.preview) URL.revokeObjectURL(f.preview)
  pendingFiles.value.splice(idx, 1)
}

async function uploadFile(file: File): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'bin'
  const path = `${props.conversationId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
  const { error } = await supabase.storage
    .from('chat-images')
    .upload(path, file, { upsert: false, contentType: file.type })
  if (error) throw new Error(error.message)
  const { data } = supabase.storage.from('chat-images').getPublicUrl(path)
  return data.publicUrl
}

async function sendMessage() {
  const content = text.value.trim()
  if (!content && pendingFiles.value.length === 0) return
  sending.value = true
  try {
    if (pendingFiles.value.length > 0) {
      // Send each file as a separate message
      for (const pf of pendingFiles.value) {
        const url = await uploadFile(pf.file)
        await supabase.from('messages').insert({
          conversation_id: props.conversationId,
          sender_id: props.myId,
          content: pf.type === 'image' ? '' : pf.file.name,
          image_url: url
        })
      }
      pendingFiles.value = []
    }
    if (content) {
      await supabase.from('messages').insert({
        conversation_id: props.conversationId,
        sender_id: props.myId,
        content
      })
      text.value = ''
    }
    scrollToBottom()
    emit('refreshList')
  } catch (err: any) {
    toast.add({ title: 'Gagal mengirim', description: err?.message, color: 'error' })
  } finally {
    sending.value = false
  }
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    sendMessage()
  }
}

// ─── Date separator helpers ───────────────────────────────────────────────────
function formatDateSeparator(d: Date) {
  if (isToday(d)) return 'Hari ini'
  if (isYesterday(d)) return 'Kemarin'
  return format(d, 'EEEE, d MMMM yyyy', { locale: idLocale })
}

function showDateSeparator(idx: number) {
  if (idx === 0) return true
  const prev = messages.value[idx - 1]!
  const curr = messages.value[idx]!
  return !isSameDay(new Date(prev.created_at ?? 0), new Date(curr.created_at ?? 0))
}

function formatMsgTime(t: string | null) {
  if (!t) return ''
  return format(new Date(t), 'HH:mm')
}

function isEdited(msg: MessageWithSender) {
  return msg.updated_at !== null && msg.updated_at !== msg.created_at
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// --- Edit message -------------------------------------------------------------
const editingMsgId = ref<string | null>(null)
const editText = ref('')
const savingEdit = ref(false)

async function startEdit(msg: MessageWithSender) {
  editingMsgId.value = msg.id
  editText.value = msg.content
  await nextTick()
  const el = document.querySelector(`[data-edit-id="${msg.id}"] textarea`) as HTMLTextAreaElement | null
  el?.focus()
}

function cancelEdit() {
  editingMsgId.value = null
  editText.value = ''
}

async function saveEdit() {
  if (!editingMsgId.value || !editText.value.trim()) return
  savingEdit.value = true
  const now = new Date().toISOString()
  const { error } = await supabase
    .from('messages')
    .update({ content: editText.value.trim(), updated_at: now })
    .eq('id', editingMsgId.value)
  if (!error) {
    const idx = messages.value.findIndex(m => m.id === editingMsgId.value)
    if (idx !== -1) messages.value[idx] = { ...messages.value[idx]!, content: editText.value.trim(), updated_at: now }
    cancelEdit()
  } else {
    toast.add({ title: 'Gagal mengedit pesan', description: error.message, color: 'error' })
  }
  savingEdit.value = false
}

function onEditKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit() }
  if (e.key === 'Escape') cancelEdit()
}

// --- Delete message / conversation --------------------------------------------
const hoveredMsgId = ref<string | null>(null)
const deletingMsgId = ref<string | null>(null)
const deleteAllOpen = ref(false)
const deletingAll = ref(false)
const deleteConvOpen = ref(false)
const deletingConv = ref(false)

async function deleteMessage(msgId: string) {
  deletingMsgId.value = msgId
  const { error } = await supabase.from('messages').delete().eq('id', msgId)
  if (!error) {
    messages.value = messages.value.filter(m => m.id !== msgId)
    emit('refreshList')
  } else {
    toast.add({ title: 'Gagal menghapus pesan', description: error.message, color: 'error' })
  }
  deletingMsgId.value = null
}

async function deleteAllMessages() {
  deletingAll.value = true
  const { error } = await supabase.from('messages').delete().eq('conversation_id', props.conversationId)
  if (!error) {
    messages.value = []
    deleteAllOpen.value = false
    emit('refreshList')
    toast.add({ title: 'Semua pesan telah dihapus', icon: 'i-lucide-check', color: 'success' })
  } else {
    toast.add({ title: 'Gagal menghapus', description: error.message, color: 'error' })
  }
  deletingAll.value = false
}

async function deleteConversation() {
  deletingConv.value = true
  const { error } = await supabase.from('conversations').delete().eq('id', props.conversationId)
  if (!error) {
    deleteConvOpen.value = false
    emit('refreshList')
    emit('close')
    toast.add({ title: 'Percakapan dihapus', icon: 'i-lucide-check', color: 'success' })
  } else {
    toast.add({ title: 'Gagal menghapus percakapan', description: error.message, color: 'error' })
  }
  deletingConv.value = false
}

// --- Image preview ------------------------------------------------------------
const previewImageUrl = ref<string | null>(null)
const previewOpen = ref(false)

function openImagePreview(url: string) {
  previewImageUrl.value = url
  previewOpen.value = true
}

// --- Navbar menu --------------------------------------------------------------
const navMenuItems = [[
  {
    label: 'Hapus Semua Pesan',
    icon: 'i-lucide-eraser',
    color: 'error' as const,
    onSelect: () => { deleteAllOpen.value = true }
  },
  {
    label: 'Hapus Percakapan',
    icon: 'i-lucide-trash-2',
    color: 'error' as const,
    onSelect: () => { deleteConvOpen.value = true }
  }
]]

onMounted(async () => {
  await fetchMessages()
  await markRead()
  await nextTick()
  scrollToBottom(false)
  subscribeRealtime()
})

onUnmounted(() => {
  if (channel) supabase.removeChannel(channel)
  pendingFiles.value.forEach(f => { if (f.preview) URL.revokeObjectURL(f.preview) })
})

// ─── Profile slideover ────────────────────────────────────────────────────────
const profileOpen = ref(false)
const roleLabel: Record<string, { label: string, color: 'success' | 'warning' | 'neutral' | 'info' }> = {
  petani: { label: 'Petani', color: 'neutral' },
  pakar: { label: 'Pakar', color: 'success' },
  penyuluh: { label: 'Penyuluh', color: 'warning' },
  admin: { label: 'Admin', color: 'info' },
  superadmin: { label: 'Superadmin', color: 'info' }
}
function getRoleConf(role: string | null) {
  return roleLabel[role ?? ''] ?? { label: role ?? 'User', color: 'neutral' as const }
}
</script>

<template>
  <UDashboardPanel id="inbox-chat">
    <!-- Header -->
    <UDashboardNavbar :toggle="false" :ui="{ right: 'gap-1' }">
      <template #leading>
        <UButton
          icon="i-lucide-arrow-left"
          color="neutral"
          variant="ghost"
          size="sm"
          class="-ms-1"
          @click="emit('close')"
        />
        <button
          type="button"
          class="flex items-center gap-2.5 hover:opacity-80 transition-opacity ml-1"
          @click="profileOpen = true"
        >
          <UAvatar
            :src="otherUser.avatar_url ?? undefined"
            :alt="otherUser.full_name ?? otherUser.username ?? ''"
            size="sm"
          />
          <div class="text-left">
            <p class="text-sm font-semibold text-highlighted leading-tight">
              {{ otherUser.full_name || otherUser.username || 'Pengguna' }}
            </p>
            <p class="text-xs text-muted leading-none">
              {{ getRoleConf(otherUser.role).label }}
            </p>
          </div>
        </button>
      </template>
      <template #right>
        <UDropdownMenu :items="navMenuItems">
          <UButton
            icon="i-lucide-more-vertical"
            color="neutral"
            variant="ghost"
            size="sm"
            square
          />
        </UDropdownMenu>
      </template>
    </UDashboardNavbar>

    <!-- Messages area -->
    <div
      ref="scrollEl"
      class="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-1 relative"
      @scroll="onScroll"
    >
      <!-- Loading -->
      <div v-if="loadingMessages" class="flex-1 flex items-center justify-center">
        <UIcon name="i-lucide-loader-circle" class="size-6 text-muted animate-spin" />
      </div>

      <!-- Empty -->
      <div
        v-else-if="!messages.length"
        class="flex-1 flex flex-col items-center justify-center gap-3 text-muted"
      >
        <UIcon name="i-lucide-message-circle" class="size-10 text-dimmed" />
        <p class="text-sm">Belum ada pesan. Mulai percakapan!</p>
      </div>

      <template v-else>
        <div
          v-for="(msg, idx) in messages"
          :key="msg.id"
          class="flex flex-col"
        >
          <!-- Date separator -->
          <div
            v-if="showDateSeparator(idx)"
            class="flex items-center gap-3 my-3"
          >
            <div class="flex-1 h-px bg-default" />
            <span class="text-xs text-muted px-2 shrink-0">{{ formatDateSeparator(new Date(msg.created_at ?? 0)) }}</span>
            <div class="flex-1 h-px bg-default" />
          </div>

          <!-- Bubble row with hover actions -->
          <div
            class="flex items-end gap-1 max-w-[80%]"
            :class="msg.sender_id === myId ? 'self-end flex-row-reverse' : 'self-start'"
            @mouseenter="hoveredMsgId = msg.id"
            @mouseleave="hoveredMsgId = null"
          >
            <!-- Avatar (other user only) -->
            <UAvatar
              v-if="msg.sender_id !== myId"
              :src="msg.sender?.avatar_url ?? undefined"
              :alt="msg.sender?.full_name ?? ''"
              size="xs"
              class="mb-1 shrink-0"
            />

            <!-- Action buttons (shown on hover) -->
            <Transition name="fade">
              <div
                v-if="hoveredMsgId === msg.id && editingMsgId !== msg.id"
                class="flex flex-col gap-0.5 shrink-0"
              >
                <UButton
                  v-if="msg.sender_id === myId && !msg.image_url"
                  icon="i-lucide-pencil"
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  square
                  @click.stop="startEdit(msg)"
                />
                <UButton
                  icon="i-lucide-trash-2"
                  color="error"
                  variant="ghost"
                  size="xs"
                  square
                  :loading="deletingMsgId === msg.id"
                  @click.stop="deleteMessage(msg.id)"
                />
              </div>
            </Transition>

            <!-- Bubble content -->
            <div
              class="rounded-2xl px-3.5 py-2 text-sm shadow-xs max-w-full"
              :class="msg.sender_id === myId
                ? 'bg-primary text-white rounded-br-sm'
                : 'bg-elevated border border-default rounded-bl-sm'"
            >
              <!-- Edit mode -->
              <div
                v-if="editingMsgId === msg.id"
                :data-edit-id="msg.id"
                class="min-w-[180px]"
              >
                <UTextarea
                  v-model="editText"
                  :rows="1"
                  autoresize
                  :maxrows="5"
                  size="sm"
                  :ui="{ base: 'resize-none' }"
                  @keydown="onEditKeydown"
                />
                <div class="flex justify-end gap-1 mt-1.5">
                  <UButton size="xs" color="neutral" variant="ghost" icon="i-lucide-x" @click="cancelEdit" />
                  <UButton size="xs" icon="i-lucide-check" :loading="savingEdit" @click="saveEdit" />
                </div>
              </div>

              <!-- Image attachment -->
              <div v-else-if="msg.image_url && (msg.image_url.match(/\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i) || msg.content === '')">
                <button
                  type="button"
                  class="block cursor-zoom-in"
                  @click.stop="openImagePreview(msg.image_url!)"
                >
                  <img
                    :src="msg.image_url"
                    class="max-w-48 max-h-48 rounded-lg object-cover mb-1 hover:opacity-90 transition-opacity"
                    alt="Gambar"
                    loading="lazy"
                  />
                </button>
                <p v-if="msg.content" class="wrap-break-word whitespace-pre-wrap">{{ msg.content }}</p>
              </div>

              <!-- File attachment -->
              <div v-else-if="msg.image_url" class="flex items-center gap-2">
                <div class="size-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                  <UIcon name="i-lucide-file" class="size-4" />
                </div>
                <div class="min-w-0">
                  <a
                    :href="msg.image_url"
                    target="_blank"
                    rel="noopener"
                    class="text-sm font-medium underline truncate block"
                  >{{ msg.content || 'File' }}</a>
                </div>
              </div>

              <!-- Text -->
              <p v-else class="wrap-break-word whitespace-pre-wrap leading-relaxed">{{ msg.content }}</p>

              <!-- Time + edited indicator + read receipt -->
              <div
                class="flex items-center gap-1 mt-0.5"
                :class="msg.sender_id === myId ? 'justify-end' : 'justify-start'"
              >
                <span
                  v-if="isEdited(msg)"
                  class="text-[10px] italic leading-none"
                  :class="msg.sender_id === myId ? 'text-white/50' : 'text-dimmed'"
                >diedit</span>
                <span
                  class="text-[10px] leading-none"
                  :class="msg.sender_id === myId ? 'text-white/60' : 'text-dimmed'"
                >
                  {{ formatMsgTime(msg.created_at) }}
                </span>
                <UIcon
                  v-if="msg.sender_id === myId"
                  :name="msg.is_read ? 'i-lucide-check-check' : 'i-lucide-check'"
                  class="size-3"
                  :class="msg.is_read ? 'text-white' : 'text-white/50'"
                />
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- Scroll to bottom FAB -->
      <Transition name="fade">
        <button
          v-if="!isNearBottom"
          type="button"
          class="sticky bottom-2 self-end size-9 rounded-full bg-primary text-white shadow-lg flex items-center justify-center transition-all hover:bg-primary/90"
          @click="newMessageCount = 0; scrollToBottom()"
        >
          <span
            v-if="newMessageCount > 0"
            class="absolute -top-1.5 -right-1.5 size-4 rounded-full bg-error text-white text-[9px] font-bold flex items-center justify-center"
          >{{ newMessageCount }}</span>
          <UIcon name="i-lucide-chevrons-down" class="size-4" />
        </button>
      </Transition>
    </div>

    <!-- Pending file previews -->
    <div
      v-if="pendingFiles.length"
      class="flex items-center gap-2 px-4 py-2 border-t border-default flex-wrap bg-elevated/50"
    >
      <div
        v-for="(pf, idx) in pendingFiles"
        :key="idx"
        class="relative group"
      >
        <img
          v-if="pf.type === 'image'"
          :src="pf.preview!"
          class="size-14 rounded-lg object-cover border border-default"
        />
        <div
          v-else
          class="size-14 rounded-lg border border-default bg-elevated flex flex-col items-center justify-center gap-0.5"
        >
          <UIcon name="i-lucide-file" class="size-5 text-muted" />
          <span class="text-[9px] text-muted text-center px-1 truncate max-w-full">{{ pf.file.name }}</span>
        </div>
        <button
          type="button"
          class="absolute -top-1.5 -right-1.5 size-4 rounded-full bg-error text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          @click="removePendingFile(idx)"
        >
          <UIcon name="i-lucide-x" class="size-2.5" />
        </button>
      </div>
    </div>

    <!-- Input area -->
    <div class="px-4 py-3 border-t border-default shrink-0">
      <div class="flex items-end gap-2">
        <!-- File attach button -->
        <UTooltip text="Lampirkan file / gambar">
          <UButton
            icon="i-lucide-paperclip"
            color="neutral"
            variant="ghost"
            square
            size="sm"
            class="mb-0.5 shrink-0"
            @click="fileInput?.click()"
          />
        </UTooltip>
        <input
          ref="fileInput"
          type="file"
          multiple
          accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.zip"
          class="sr-only"
          @change="onFilePick"
        />

        <!-- Textarea -->
        <UTextarea
          v-model="text"
          class="flex-1"
          :rows="1"
          autoresize
          :maxrows="6"
          placeholder="Tulis pesan... (Enter kirim, Shift+Enter baris baru)"
          :disabled="sending"
          :ui="{ base: 'resize-none' }"
          @keydown="onKeydown"
        />

        <!-- Send -->
        <UButton
          icon="i-lucide-send"
          :loading="sending"
          :disabled="!text.trim() && !pendingFiles.length"
          square
          size="sm"
          class="mb-0.5 shrink-0"
          @click="sendMessage"
        />
      </div>
    </div>
  </UDashboardPanel>

  <!-- Profile slideover -->
  <USlideover
    v-model:open="profileOpen"
    side="right"
    :ui="{ content: 'max-w-xs' }"
  >
    <template #header>
      <p class="font-semibold text-highlighted">
        Profil Pengguna
      </p>
    </template>
    <template #body>
      <div class="flex flex-col items-center gap-4 pt-4">
        <UAvatar
          :src="otherUser.avatar_url ?? undefined"
          :alt="otherUser.full_name ?? ''"
          size="3xl"
        />
        <div class="text-center">
          <p class="text-lg font-bold text-highlighted">
            {{ otherUser.full_name || otherUser.username || 'Pengguna' }}
          </p>
          <UBadge
            :label="getRoleConf(otherUser.role).label"
            :color="getRoleConf(otherUser.role).color"
            variant="subtle"
            class="mt-1"
          />
        </div>
        <UButton
          :to="`/users/${otherUser.id}`"
          label="Lihat Profil Lengkap"
          color="neutral"
          variant="outline"
          icon="i-lucide-external-link"
          size="sm"
          block
        />
      </div>
    </template>
  </USlideover>

  <!-- Image lightbox -->
  <UModal
    v-model:open="previewOpen"
    :ui="{ content: 'max-w-4xl p-0 bg-black/90 border-none', overlay: 'backdrop-blur-sm' }"
  >
    <template #content>
      <div class="relative flex items-center justify-center p-2">
        <UButton
          icon="i-lucide-x"
          color="neutral"
          variant="ghost"
          size="sm"
          square
          class="absolute top-2 right-2 z-10 bg-black/50 hover:bg-black/80 text-white"
          @click="previewOpen = false"
        />
        <img
          v-if="previewImageUrl"
          :src="previewImageUrl"
          class="max-w-full max-h-[85vh] object-contain rounded-lg"
          alt="Preview"
        />
      </div>
    </template>
  </UModal>

  <!-- Confirm: delete all messages -->
  <UModal v-model:open="deleteAllOpen" title="Hapus Semua Pesan">
    <template #body>
      <p class="text-sm text-muted">
        Semua pesan dalam percakapan ini akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan.
      </p>
    </template>
    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton label="Batal" color="neutral" variant="outline" @click="deleteAllOpen = false" />
        <UButton label="Hapus Semua" color="error" :loading="deletingAll" icon="i-lucide-trash-2" @click="deleteAllMessages" />
      </div>
    </template>
  </UModal>

  <!-- Confirm: delete conversation -->
  <UModal v-model:open="deleteConvOpen" title="Hapus Percakapan">
    <template #body>
      <p class="text-sm text-muted">
        Percakapan ini beserta semua pesannya akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan.
      </p>
    </template>
    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton label="Batal" color="neutral" variant="outline" @click="deleteConvOpen = false" />
        <UButton label="Hapus Percakapan" color="error" :loading="deletingConv" icon="i-lucide-trash-2" @click="deleteConversation" />
      </div>
    </template>
  </UModal>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
