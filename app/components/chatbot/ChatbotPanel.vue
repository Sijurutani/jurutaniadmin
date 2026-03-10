<script setup lang="ts">
const chatbot = useChatbot()

const input = ref('')

async function handleSend() {
  const text = input.value.trim()
  if (!text || chatbot.isLoading.value) return
  input.value = ''
  await chatbot.sendMessage(text)
}

function handleSuggestion(text: string) {
  chatbot.sendMessage(text).catch(() => {
    // errors are handled internally in sendMessage
  })
}

const uiMessages = computed(() => {
  return chatbot.messages.value
    .filter(m => m.role !== 'system' && m.role !== 'tool')
    .map(m => ({
      ...m,
      role: m.role as 'user' | 'assistant',
      text: m.content || '',
      parts: m.content ? [{ type: 'text', text: m.content }] : []
    }))
})

const chatStatus = computed(() => chatbot.isLoading.value ? 'streaming' : 'ready')

const providers = [
  { label: 'Google Gemini', value: 'gemini', icon: 'i-simple-icons-google' },
  { label: 'Llama 3 (Groq)', value: 'groq', icon: 'i-simple-icons-meta' },
  { label: 'OpenRouter', value: 'openrouter', icon: 'i-lucide-network' }
]

// Two-way computed: reads from shared chatbot.provider, writes back on selection change
const selectedProvider = computed({
  get: () => providers.find(p => p.value === chatbot.provider.value) ?? providers[0]!,
  set: (v) => { chatbot.provider.value = v.value as 'groq' | 'gemini' | 'openrouter' }
})

const isHistoryOpen = ref(false)
const isExpanded = ref(false)
</script>

<template>
  <UModal
    v-model:open="chatbot.isOpen.value"
    :ui="{ content: isExpanded ? 'sm:max-w-7xl w-full h-[95vh] flex flex-row overflow-hidden' : 'sm:max-w-4xl w-full h-[85vh] sm:h-[80vh] flex flex-row overflow-hidden' }"
  >
    <template #content>
      <!-- History Sidebar -->
      <div v-if="isHistoryOpen" class="w-72 border-r border-gray-800 bg-[#111111] flex flex-col shrink-0">
        <div class="flex items-center justify-between px-4 py-3.5 border-b border-gray-800 shrink-0">
          <span class="font-semibold text-sm text-white">Riwayat Chat</span>
          <UButton
            icon="i-lucide-x"
            color="neutral"
            variant="ghost"
            size="xs"
            class="text-gray-400 hover:text-white"
            @click="isHistoryOpen = false"
          />
        </div>
        <div v-if="chatbot.sessions.value.length === 0" class="flex-1 flex items-center justify-center p-8 text-sm text-gray-500 text-center">
          Belum ada riwayat.
        </div>
        <div v-else class="flex-1 overflow-y-auto">
          <div
            v-for="sess in chatbot.sessions.value"
            :key="sess.id"
            class="group flex items-center gap-3 px-4 py-3.5 cursor-pointer hover:bg-white/5 border-b border-gray-800/70 transition-colors"
            @click="chatbot.loadSession(sess.id)"
          >
            <div class="shrink-0 size-10 rounded-full bg-gray-700/80 flex items-center justify-center">
              <UIcon name="i-lucide-message-circle" class="size-5 text-gray-400" />
            </div>
            <div class="flex flex-col gap-0.5 min-w-0 flex-1">
              <span class="text-sm font-medium text-white truncate leading-snug">{{ sess.messages[0]?.content || 'Percakapan baru' }}</span>
              <span class="text-xs text-gray-500">{{ new Date(sess.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) }}</span>
            </div>
            <UButton
              icon="i-lucide-trash-2"
              color="neutral"
              variant="ghost"
              size="xs"
              class="opacity-0 group-hover:opacity-100 shrink-0 hover:text-red-400"
              @click.stop="chatbot.deleteSession(sess.id)"
            />
          </div>
        </div>
      </div>

      <!-- Main Chat Area -->
      <div class="flex-1 flex flex-col min-w-0 h-full">
        <!-- Header Area -->
        <div class="flex items-center gap-3 min-w-0 w-full px-4 py-3.5 border-b border-gray-800 shrink-0 bg-[#111111]">
          <div class="flex items-center justify-center size-8 rounded-full bg-primary/10 shrink-0">
            <UIcon name="i-lucide-bot" class="text-primary size-4" />
          </div>
          <div class="min-w-0 flex-1">
            <p class="font-semibold text-sm text-white leading-tight">
              Asisten Jurutani
            </p>
            <div class="flex items-center gap-1.5">
              <span class="size-1.5 rounded-full bg-green-500 animate-pulse" />
              <span class="text-xs text-gray-400">Online</span>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <UTooltip text="Riwayat Percakapan" :side="'bottom'">
              <UButton
                icon="i-lucide-history"
                color="neutral"
                variant="ghost"
                size="xs"
                :class="isHistoryOpen ? 'bg-elevated' : ''"
                @click="isHistoryOpen = !isHistoryOpen"
              />
            </UTooltip>
            <UTooltip text="Percakapan Baru" :side="'bottom'">
              <UButton
                icon="i-lucide-plus"
                color="neutral"
                variant="ghost"
                size="xs"
                @click="chatbot.newChat()"
              />
            </UTooltip>
            <UTooltip :text="isExpanded ? 'Perkecil' : 'Perbesar'" :side="'bottom'">
              <UButton
                :icon="isExpanded ? 'i-lucide-minimize-2' : 'i-lucide-maximize-2'"
                color="neutral"
                variant="ghost"
                size="xs"
                @click="isExpanded = !isExpanded"
              />
            </UTooltip>
            <UButton
              icon="i-lucide-x"
              color="neutral"
              variant="ghost"
              size="xs"
              @click="chatbot.close()"
            />
          </div>
        </div>

        <!-- Chat Palette Area -->
        <UChatPalette class="flex-1 min-h-0">
          <!-- Messages list -->
          <UChatMessages
            v-if="chatbot.messages.value.length > 0"
            :status="chatStatus"
            class="px-4 py-4 space-y-4"
          >
            <ChatbotMessage
              v-for="msg in uiMessages"
              :key="msg.id"
              :message="chatbot.messages.value.find(m => m.id === msg.id) || msg"
            />
          </UChatMessages>

          <!-- Empty state within Palette -->
          <div
            v-else
            class="flex flex-col items-center justify-center h-full gap-4 text-center py-10 px-4"
          >
            <div class="size-16 rounded-full bg-gray-700/60 flex items-center justify-center">
              <UIcon name="i-lucide-bot" class="size-8 text-gray-400" />
            </div>
            <div>
              <p class="font-semibold text-white text-lg">
                Halo! Apa yang ingin Anda ketahui?
              </p>
              <p class="text-sm text-gray-500 mt-2 max-w-sm mx-auto">
                Asisten ini sudah terhubung ke database Jurutani. Anda bisa meminta saya mengambil data jumlah user, instruktur, expert, maupun harga pasar.
              </p>
            </div>
            <ChatbotSuggestions
              v-if="!chatbot.isLoading.value"
              @select="handleSuggestion"
            />
          </div>

          <!-- Prompt Area -->
          <template #prompt>
            <div class="p-4 w-full border-t border-gray-800 bg-[#111111] px-4 py-3.5 shrink-0">
              <div class="max-w-4xl mx-auto ring-1 ring-inset ring-gray-700 bg-gray-800/30 rounded-xl focus-within:ring-2 focus-within:ring-primary shadow-sm transition-shadow px-4 py-2 ">
                <UChatPrompt
                  v-model="input"
                  placeholder="Type your message here..."
                  :disabled="chatbot.isLoading.value"
                  autofocus
                  variant="naked"
                  class="w-full grow flex"
                  @submit="handleSend"
                  :ui="{
                    footer: 'flex items-center justify-between p-2 mt-1',
                  }"
                >
                  <template #footer>
                      <USelectMenu
                        v-model="selectedProvider"
                        :items="providers"
                        variant="ghost"
                        color="neutral"
                        size="sm"
                        :leading-icon="selectedProvider?.icon"
                        class="min-w-35 bg-white/50 dark:bg-gray-800/80 rounded-lg hover:bg-white dark:hover:bg-gray-800 transition-colors shadow-sm ring-1 ring-inset ring-gray-200 dark:ring-gray-700 ml-1 mb-1"
                      />
                      <UChatPromptSubmit
                        :status="chatStatus"
                        submit-icon="i-lucide-arrow-up"
                        size="sm"
                        variant="solid"
                        class="rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 shadow-sm mr-1 mb-1"
                        @click="handleSend"
                      />
                  </template>
                </UChatPrompt>
              </div>
              <p class="text-[11px] text-gray-600 mt-2 text-center w-full">
                Enter untuk kirim · Shift+Enter untuk baris · Asisten terhubung ke Database Jurutani
              </p>
            </div>
          </template>
        </UChatPalette>
      </div>
    </template>
  </UModal>
</template>
