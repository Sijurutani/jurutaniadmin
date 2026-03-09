<script setup lang="ts">
import type { ChatMessage } from '~/types/chatbot'

const props = defineProps<{
  message: ChatMessage
}>()

const isUser = computed(() => props.message.role === 'user')

// Simple markdown renderer: bold, inline code, bullet lists, newlines
const renderedContent = computed(() => {
  let text = props.message.content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  // Bold
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  // Inline code
  text = text.replace(/`([^`]+)`/g, '<code class="bg-elevated px-1 rounded text-xs font-mono">$1</code>')
  // Unordered list
  text = text.replace(/^[•\-\*] (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
  // Line breaks
  text = text.replace(/\n/g, '<br />')

  return text
})

const time = computed(() =>
  props.message.timestamp.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
)
</script>

<template>
  <div
    class="flex gap-2 w-full"
    :class="isUser ? 'justify-end' : 'justify-start'"
  >
    <!-- Bot avatar -->
    <UAvatar
      v-if="!isUser"
      icon="i-lucide-bot"
      size="xs"
      color="primary"
      variant="soft"
      class="shrink-0 mt-1"
    />

    <div
      class="max-w-[85%] flex flex-col gap-0.5"
      :class="isUser ? 'items-end' : 'items-start'"
    >
      <div
        class="rounded-xl px-3 py-2 text-sm leading-relaxed"
        :class="[
          isUser
            ? 'bg-primary text-white rounded-br-none'
            : message.error
              ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 rounded-bl-none'
              : 'bg-elevated text-highlighted rounded-bl-none'
        ]"
      >
        <!-- eslint-disable-next-line vue/no-v-html -->
        <span v-html="renderedContent" />
      </div>

      <span class="text-xs text-muted px-1">{{ time }}</span>
    </div>

    <!-- User avatar -->
    <UAvatar
      v-if="isUser"
      icon="i-lucide-user"
      size="xs"
      color="neutral"
      variant="soft"
      class="shrink-0 mt-1"
    />
  </div>
</template>
