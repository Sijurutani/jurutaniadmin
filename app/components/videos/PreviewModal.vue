<script setup lang="ts">
import { format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import type { Database } from '~/types/database.types'

type VideoRow = Database['public']['Tables']['videos']['Row']

const props = defineProps<{
  video: VideoRow | null
}>()

const open = defineModel<boolean>('open', { default: false })

function extractYoutubeId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([^&?\s]{11})/)
  return match ? match[1]! : null
}

const youtubeId = computed(() => props.video ? extractYoutubeId(props.video.link_yt) : null)
const embedUrl = computed(() =>
  youtubeId.value ? `https://www.youtube.com/embed/${youtubeId.value}?rel=0` : null
)
</script>

<template>
  <UModal
    v-model:open="open"
    :title="video?.title ?? 'Preview Video'"
    :ui="{ content: 'max-w-3xl' }"
  >
    <template #body>
      <div v-if="video" class="space-y-4">
        <!-- YouTube embed -->
        <div class="aspect-video rounded-lg overflow-hidden bg-muted">
          <iframe
            v-if="embedUrl"
            :src="embedUrl"
            class="w-full h-full"
            frameborder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen
          />
          <div v-else class="flex flex-col items-center justify-center h-full gap-2 text-muted">
            <UIcon name="i-lucide-video-off" class="size-8" />
            <span class="text-sm">Link YouTube tidak valid</span>
          </div>
        </div>

        <!-- Meta info -->
        <div class="space-y-2">
          <div v-if="video.category" class="flex items-center gap-2">
            <UBadge variant="soft" color="primary" class="capitalize">
              {{ video.category }}
            </UBadge>
          </div>

          <p v-if="video.description" class="text-sm text-muted leading-relaxed">
            {{ video.description }}
          </p>

          <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
            <span>
              <UIcon name="i-lucide-calendar" class="size-3 inline mr-1" />
              {{ format(new Date(video.created_at), 'dd MMM yyyy', { locale: localeId }) }}
            </span>
            <span v-if="video.slug" class="font-mono">
              <UIcon name="i-lucide-link-2" class="size-3 inline mr-1" />
              {{ video.slug }}
            </span>
          </div>
        </div>

        <!-- Footer actions -->
        <div class="flex justify-between items-center pt-2 border-t border-default">
          <UButton
            :href="video.link_yt"
            target="_blank"
            rel="noopener noreferrer"
            icon="i-lucide-external-link"
            label="Buka di YouTube"
            color="neutral"
            variant="soft"
            size="sm"
          />
          <UButton
            label="Tutup"
            color="neutral"
            variant="subtle"
            size="sm"
            @click="open = false"
          />
        </div>
      </div>
    </template>
  </UModal>
</template>
