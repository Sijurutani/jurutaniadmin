import { createSharedComposable } from '@vueuse/core'
import type { ChatMessage, ChatResponse } from '~/types/chatbot'

const STORAGE_KEY = 'jurutani_chatbot_history'
const MAX_HISTORY = 50

const _useChatbot = () => {
  const auth = useAuth()
  const isOpen = ref(false)
  const isLoading = ref(false)
  const messages = ref<ChatMessage[]>([])
  const error = ref<string | null>(null)

  // Restore history from localStorage
  onMounted(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        messages.value = parsed.map((m: ChatMessage) => ({
          ...m,
          timestamp: new Date(m.timestamp)
        }))
      }
    }
    catch { /* ignore parse errors */ }
  })

  function persistHistory() {
    try {
      const toStore = messages.value.slice(-MAX_HISTORY)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore))
    }
    catch { /* ignore storage errors */ }
  }

  function clearHistory() {
    messages.value = []
    localStorage.removeItem(STORAGE_KEY)
  }

  function addMessage(role: ChatMessage['role'], content: string, opts: Partial<ChatMessage> = {}): ChatMessage {
    const msg: ChatMessage = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      role,
      content,
      timestamp: new Date(),
      ...opts
    }
    messages.value.push(msg)
    persistHistory()
    return msg
  }

  async function sendMessage(content: string) {
    if (!content.trim() || isLoading.value) return

    error.value = null
    addMessage('user', content.trim())
    isLoading.value = true

    // Build history payload (last 10 messages, no system)
    const history = messages.value
      .filter(m => !m.error)
      .slice(-10)
      .map(m => ({ role: m.role, content: m.content }))

    try {
      const response = await $fetch<ChatResponse>('/api/chatbot/chat', {
        method: 'POST',
        body: {
          messages: history,
          adminName: auth.displayName
        }
      })

      addMessage('assistant', response.reply, { model: response.model })
    }
    catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menghubungi AI. Coba lagi.'
      addMessage('assistant', `⚠️ ${msg}`, { error: true })
      error.value = msg
    }
    finally {
      isLoading.value = false
    }
  }

  function open() { isOpen.value = true }
  function close() { isOpen.value = false }
  function toggle() { isOpen.value = !isOpen.value }

  return {
    isOpen,
    isLoading,
    messages,
    error,
    sendMessage,
    clearHistory,
    open,
    close,
    toggle
  }
}

export const useChatbot = createSharedComposable(_useChatbot)
