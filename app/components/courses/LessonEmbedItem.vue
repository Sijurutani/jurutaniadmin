<script setup lang="ts">
import type { EmbedItem } from '~/utils/embed'

const props = defineProps<{
  embed: EmbedItem
  index: number
}>()

function getLessonEmbedSrc(embed: EmbedItem): string | null {
  try {
    const u = new URL(embed.url)
    switch (embed.platform) {
      case 'youtube': {
        let id: string | null = null
        if (u.hostname === 'youtu.be') id = u.pathname.slice(1).split('?')[0] ?? null
        else id = u.searchParams.get('v')
        if (id) return `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1`
        break
      }
      case 'gdrive_doc': {
        const m = u.pathname.match(/\/document\/d\/([^/]+)/)
        if (m) return `https://docs.google.com/document/d/${m[1]}/preview`
        break
      }
      case 'gdrive_sheet': {
        const m = u.pathname.match(/\/spreadsheets\/d\/([^/]+)/)
        if (m) return `https://docs.google.com/spreadsheets/d/${m[1]}/htmlview?widget=true&headers=false`
        break
      }
      case 'gdrive_slide': {
        const m = u.pathname.match(/\/presentation\/d\/([^/]+)/)
        if (m) return `https://docs.google.com/presentation/d/${m[1]}/embed?start=false&loop=false&delayms=3000`
        break
      }
      case 'gdrive_video':
      case 'gdrive_pdf': {
        const m = u.pathname.match(/\/file\/d\/([^/]+)/)
        if (m) return `https://drive.google.com/file/d/${m[1]}/preview`
        break
      }
    }
  } catch {}
  return null
}

function getEmbedAspect(platform: string): string {
  switch (platform) {
    case 'youtube':
    case 'gdrive_slide':
    case 'gdrive_video': return 'aspect-video'
    case 'gdrive_pdf':
    case 'gdrive_doc': return 'aspect-[3/4]'
    case 'gdrive_sheet': return 'aspect-[4/3]'
    default: return 'aspect-video'
  }
}

function getEmbedMinH(platform: string): string {
  return ['gdrive_pdf', 'gdrive_doc', 'gdrive_sheet'].includes(platform) ? 'min-h-[500px]' : ''
}

const embedSrc = computed(() => getLessonEmbedSrc(props.embed))
const embedAspect = computed(() => getEmbedAspect(props.embed.platform))
const embedMinH = computed(() => getEmbedMinH(props.embed.platform))
const platformInfo = computed(() => Enum.LessonEmbedPlatforms.find(p => p.value === props.embed.platform))
</script>

<template>
  <div class="rounded-xl border border-default bg-default overflow-hidden">
    <!-- Label bar -->
    <div class="flex items-center gap-2 px-4 py-2.5 border-b border-default bg-elevated">
      <UIcon
        :name="platformInfo?.icon ?? 'i-lucide-globe'"
        :class="['size-4 shrink-0', `text-${platformInfo?.color ?? 'neutral'}-500`]"
      />
      <span class="text-sm font-medium text-highlighted flex-1">
        {{ platformInfo?.label ?? embed.platform }}
        <span class="text-muted font-normal ml-1">· Media {{ index + 1 }}</span>
      </span>
      <a
        :href="embed.url"
        target="_blank"
        rel="noopener noreferrer"
        class="text-xs text-primary-500 hover:text-primary-400 flex items-center gap-1"
      >
        <UIcon name="i-lucide-external-link" class="size-3" />
        Buka
      </a>
    </div>

    <!-- iframe -->
    <div
      v-if="embedSrc"
      :class="[embedAspect, embedMinH, 'relative w-full']"
    >
      <iframe
        :src="embedSrc"
        :title="`embed-${index}`"
        class="absolute inset-0 w-full h-full border-0"
        allowfullscreen
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        loading="lazy"
      />
    </div>

    <!-- Non-embeddable fallback -->
    <div v-else class="px-4 py-5 flex items-center gap-3">
      <UIcon name="i-lucide-link" class="size-5 text-muted shrink-0" />
      <a
        :href="embed.url"
        target="_blank"
        rel="noopener noreferrer"
        class="text-sm text-primary-500 underline truncate"
      >{{ embed.url }}</a>
    </div>
  </div>
</template>
