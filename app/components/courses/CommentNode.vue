<script setup lang="ts">
interface CommentUser {
  full_name: string | null
  username: string | null
  avatar_url: string | null
}

interface CommentNode {
  id: string
  content: string
  user_id: string
  lesson_id: string | null
  parent_id: string | null
  is_hidden: boolean
  created_at: string
  user: CommentUser | null
  replies: CommentNode[]
}

const props = defineProps<{
  comment: CommentNode
  depth: number
  actionLoadingId: string | null
  fmt: (date: string) => string
}>()

const emit = defineEmits<{
  toggleHide: [comment: CommentNode]
  delete: [comment: CommentNode]
}>()

// Max 3 levels visual depth
const maxDepth = 2
</script>

<template>
  <div
    :class="[
      'border border-default rounded-lg p-3',
      depth > 0 ? 'mt-2 bg-elevated/50' : 'bg-default',
      comment.is_hidden ? 'opacity-60' : ''
    ]"
  >
    <!-- Comment header -->
    <div class="flex items-start gap-2">
      <UAvatar
        :src="comment.user?.avatar_url ?? undefined"
        :alt="comment.user?.full_name ?? '?'"
        size="xs"
        class="mt-0.5 shrink-0"
      />
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="text-sm font-medium text-highlighted">
            {{ comment.user?.full_name ?? 'User' }}
          </span>
          <span v-if="comment.user?.username" class="text-xs text-muted">
            @{{ comment.user.username }}
          </span>
          <span class="text-xs text-muted">·</span>
          <span class="text-xs text-muted">{{ fmt(comment.created_at) }}</span>
          <UBadge
            v-if="comment.is_hidden"
            label="Disembunyikan"
            color="warning"
            variant="soft"
            size="xs"
            class="ml-auto"
          />
        </div>
        <p class="text-sm text-default mt-1 whitespace-pre-wrap overflow-wrap-break-word">{{ comment.content }}</p>
      </div>
    </div>

    <!-- Actions -->
    <div class="flex gap-2 mt-2 ml-8">
      <UButton
        :icon="comment.is_hidden ? 'i-lucide-eye' : 'i-lucide-eye-off'"
        :label="comment.is_hidden ? 'Tampilkan' : 'Sembunyikan'"
        size="xs"
        color="neutral"
        variant="ghost"
        :loading="actionLoadingId === comment.id"
        @click="emit('toggleHide', comment)"
      />
      <UButton
        icon="i-lucide-trash-2"
        label="Hapus"
        size="xs"
        color="error"
        variant="ghost"
        :loading="actionLoadingId === comment.id"
        @click="emit('delete', comment)"
      />
    </div>

    <!-- Replies (recursive, max depth) -->
    <div v-if="comment.replies.length > 0 && depth < maxDepth" class="ml-6 mt-2 space-y-2">
      <CommentNode
        v-for="reply in comment.replies"
        :key="reply.id"
        :comment="reply"
        :depth="depth + 1"
        :action-loading-id="actionLoadingId"
        :fmt="fmt"
        @toggle-hide="emit('toggleHide', $event)"
        @delete="emit('delete', $event)"
      />
    </div>

    <!-- Collapsed replies beyond max depth -->
    <div v-else-if="comment.replies.length > 0 && depth >= maxDepth" class="ml-6 mt-2">
      <p class="text-xs text-muted italic">{{ comment.replies.length }} balasan tersembunyi (kedalaman maks)</p>
    </div>
  </div>
</template>
