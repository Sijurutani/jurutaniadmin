<script setup lang="ts">
const chatbot = useChatbot()

const input = ref('')
const messagesEnd = ref<HTMLElement | null>(null)

async function handleSend() {
  const text = input.value.trim()
  if (!text || chatbot.isLoading.value) return
  input.value = ''
  await chatbot.sendMessage(text)
}

function handleSuggestion(text: string) {
  chatbot.sendMessage(text)
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSend()
  }
}

// Auto-scroll to bottom on new messages
watch(
  () => chatbot.messages.value.length,
  async () => {
    await nextTick()
    messagesEnd.value?.scrollIntoView({ behavior: 'smooth' })
  }
)

watch(() => chatbot.isLoading.value, async (loading) => {
  if (loading) {
    await nextTick()
    messagesEnd.value?.scrollIntoView({ behavior: 'smooth' })
  }
})
</script>

<template>
  <USlideover
    v-model:open="chatbot.isOpen.value"
    title="Asisten Jurutani"
    description="Tanya apa saja tentang platform"
    side="right"
    class="max-w-md!"
  >
    <template #header>
      <div class="flex items-center gap-3 min-w-0">
        <div class="flex items-center justify-center size-8 rounded-full bg-primary/10 shrink-0">
          <UIcon name="i-lucide-bot" class="text-primary size-4" />
        </div>
        <div class="min-w-0">
          <p class="font-semibold text-sm text-highlighted leading-tight">
            Asisten Jurutani
          </p>
          <div class="flex items-center gap-1.5">
            <span class="size-1.5 rounded-full bg-green-500 animate-pulse" />
            <span class="text-xs text-muted">Online</span>
          </div>
        </div>
      </div>

      <div class="flex items-center gap-1 ml-auto">
        <UTooltip text="Hapus riwayat">
          <UButton
            icon="i-lucide-trash-2"
            color="neutral"
            variant="ghost"
            size="xs"
            :disabled="chatbot.messages.value.length === 0"
            @click="chatbot.clearHistory()"
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
    </template>

    <template #body>
      <div class="flex flex-col h-full min-h-0">
        <!-- Messages area -->
        <div class="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-0">
          <!-- Empty state -->
          <div
            v-if="chatbot.messages.value.length === 0"
            class="flex flex-col items-center justify-center h-full gap-4 text-center py-8"
          >
            <div class="size-16 rounded-full bg-primary/10 flex items-center justify-center">
              <UIcon name="i-lucide-bot" class="size-8 text-primary" />
            </div>
            <div>
              <p class="font-semibold text-highlighted">
                Halo! Ada yang bisa dibantu?
              </p>
              <p class="text-sm text-muted mt-1">
                Tanya tentang data, konten, atau statistik platform
              </p>
            </div>
          </div>

          <!-- Message list -->
          <template v-else>
            <ChatbotMessage
              v-for="msg in chatbot.messages.value"
              :key="msg.id"
              :message="msg"
            />
          </template>

          <!-- Typing indicator -->
          <ChatbotTyping v-if="chatbot.isLoading.value" />

          <div ref="messagesEnd" />
        </div>

        <!-- Suggestions (only when chat is empty) -->
        <ChatbotSuggestions
          v-if="chatbot.messages.value.length === 0 && !chatbot.isLoading.value"
          @select="handleSuggestion"
        />

        <!-- Input area -->
        <div class="border-t border-default p-3">
          <div class="flex gap-2 items-end">
            <UTextarea
              v-model="input"
              placeholder="Ketik pesan..."
              :rows="1"
              autoresize
              :maxrows="4"
              class="flex-1"
              :disabled="chatbot.isLoading.value"
              @keydown="handleKeydown"
            />
            <UButton
              icon="i-lucide-send"
              color="primary"
              :disabled="!input.trim() || chatbot.isLoading.value"
              :loading="chatbot.isLoading.value"
              @click="handleSend"
            />
          </div>
          <p class="text-xs text-muted mt-1.5 text-center">
            Enter untuk kirim · Shift+Enter untuk baris baru
          </p>
        </div>
      </div>
    </template>
  </USlideover>
</template>
