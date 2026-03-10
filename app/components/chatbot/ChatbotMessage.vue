<script setup lang="ts">
import type { ChatMessage } from '~/types/chatbot'
import { useClipboard } from '@vueuse/core'

const props = defineProps<{
  message: ChatMessage
}>()

const isUser = computed(() => props.message.role === 'user')

const time = computed(() =>
  props.message.timestamp.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
)

const modelLabel = computed(() => {
  const m = props.message.model ?? ''
  if (m.includes('gemini')) return { label: 'Gemini', icon: 'i-simple-icons-google' }
  if (m.includes('llama') || props.message.provider === 'groq') return { label: 'Groq', icon: 'i-simple-icons-meta' }
  if (props.message.provider === 'openrouter') return { label: 'OpenRouter', icon: 'i-lucide-network' }
  if (m) return { label: m.split('/').pop()?.split(':')[0] ?? m, icon: 'i-lucide-cpu' }
  return null
})

const { copy, copied } = useClipboard()

function handleCopy() {
  if (!props.message.content) return
  copy(props.message.content)
}
</script>

<template>
  <div
    class="flex gap-3 w-full"
    :class="isUser ? 'justify-end' : 'justify-start'"
  >
    <!-- Bot avatar -->
    <div
      v-if="!isUser"
      class="shrink-0 size-7 rounded-full bg-gray-700/80 flex items-center justify-center mt-1"
    >
      <UIcon name="i-lucide-bot" class="size-4 text-gray-400" />
    </div>

    <div
      class="max-w-[90%] sm:max-w-[85%] flex flex-col gap-1 w-full"
      :class="isUser ? 'items-end' : 'items-start'"
    >
        <!-- User Message -->
      <div
        v-if="isUser"
        class="rounded-2xl px-4 py-2.5 text-sm leading-relaxed bg-primary text-white rounded-br-sm max-w-fit shadow-sm"
      >
        <div class="whitespace-pre-wrap">
          {{ message.content }}
        </div>
      </div>

      <!-- Assistant Message -->
      <div
        v-else
        class="w-full text-sm leading-relaxed rounded-2xl rounded-bl-sm overflow-hidden border px-4 py-3 shadow-sm"
        :class="message.error
          ? 'border-red-800/50 bg-red-900/10 text-red-400'
          : 'border-gray-700/60 bg-gray-800/50 text-gray-200'"
      >
        <div class="prose prose-sm dark:prose-invert max-w-none">
          <MDC :value="message.content || ''" />
        </div>
      </div>

      <!-- Meta Info (Time, Model badge, Copy) -->
      <div class="flex items-center gap-2 mt-0.5 px-1" :class="isUser ? 'justify-end' : 'justify-start w-full'">
        <span class="text-[11px] text-gray-500">{{ time }}</span>

        <!-- Model badge -->
        <span
          v-if="!isUser && modelLabel"
          class="inline-flex items-center gap-1 text-[10px] text-gray-500 bg-gray-800/60 border border-gray-700/50 rounded px-1.5 py-0.5"
        >
          <UIcon :name="modelLabel.icon" class="size-2.5" />
          {{ modelLabel.label }}
        </span>

        <UTooltip v-if="!isUser && message.content" :text="copied ? 'Tersalin!' : 'Salin jawaban'">
          <UButton
            :icon="copied ? 'i-lucide-check' : 'i-lucide-copy'"
            color="neutral"
            variant="ghost"
            size="xs"
            class="h-5 w-5 rounded transition-opacity"
            :class="copied ? 'text-green-500' : 'text-gray-500 hover:text-gray-300'"
            @click="handleCopy"
          />
        </UTooltip>
      </div>
    </div>

    <!-- User avatar -->
    <div
      v-if="isUser"
      class="shrink-0 size-7 rounded-full bg-gray-700/80 flex items-center justify-center mt-1"
    >
      <UIcon name="i-lucide-user" class="size-4 text-gray-400" />
    </div>
  </div>
</template>
