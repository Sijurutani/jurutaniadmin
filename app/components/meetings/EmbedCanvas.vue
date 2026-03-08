<script setup lang="ts">
import type { EmbedItem } from '~/utils/embed'

const props = defineProps<{
  embed: EmbedItem
}>()

const src = computed(() => getEmbedSrc(props.embed))
const platformInfo = computed(() =>
  Enum.EmbedPlatforms.find(p => p.value === props.embed.platform)
)

const headerClass = computed(() => {
  switch (props.embed.platform) {
    case 'instagram_post':
    case 'instagram_reel':
      return 'bg-gradient-to-r from-violet-600 via-pink-500 to-orange-400'
    case 'facebook_post':
    case 'facebook_video':
      return 'bg-blue-600'
    case 'youtube':
      return 'bg-red-600'
    case 'tiktok':
      return 'bg-neutral-950'
    case 'twitter':
      return 'bg-sky-500'
    default:
      return 'bg-neutral-700'
  }
})

// Portrait platforms need fixed height (cross-origin iframe can't auto-resize)
const isPortrait = computed(() =>
  ['instagram_post', 'instagram_reel', 'tiktok'].includes(props.embed.platform)
)
const isLandscape = computed(() =>
  ['youtube', 'facebook_video'].includes(props.embed.platform)
)

const iframeHeight = computed(() => {
  switch (props.embed.platform) {
    case 'instagram_post': return '600px'
    case 'instagram_reel': return '820px'
    case 'tiktok': return '740px'
    case 'facebook_post': return '460px'
    default: return undefined // landscape uses aspect-video CSS
  }
})

const showActionBar = computed(() =>
  ['instagram_post', 'instagram_reel', 'tiktok', 'facebook_post'].includes(props.embed.platform)
)

const shortHost = computed(() => {
  try {
    return new URL(props.embed.url).hostname.replace('www.', '')
  } catch {
    return props.embed.url.slice(0, 28)
  }
})
</script>

<template>
  <div
    class="rounded-2xl overflow-hidden border border-default bg-default shadow-lg"
    :class="isPortrait ? 'max-w-125 mx-auto w-full' : 'w-full'"
  >
    <!-- Platform header bar -->
    <div :class="headerClass" class="flex items-center gap-3 px-4 py-3">
      <!-- Platform icon bubble -->
      <div class="size-8 rounded-full bg-white/20 backdrop-blur flex items-center justify-center shrink-0">
        <UIcon
          :name="platformInfo?.icon ?? 'i-lucide-globe'"
          class="size-4 text-white"
        />
      </div>

      <!-- Platform label + host -->
      <div class="flex-1 min-w-0">
        <p class="text-xs font-bold text-white leading-none">{{ platformInfo?.label ?? embed.platform }}</p>
        <p class="text-[11px] text-white/70 mt-0.5 truncate">{{ shortHost }}</p>
      </div>

      <!-- External link -->
      <a
        :href="embed.url"
        target="_blank"
        rel="noopener noreferrer"
        class="size-8 rounded-full bg-white/15 hover:bg-white/30 transition flex items-center justify-center shrink-0"
        title="Buka postingan"
      >
        <UIcon name="i-lucide-external-link" class="size-3.5 text-white" />
      </a>
    </div>

    <!-- Iframe embed (has src) -->
    <div
      v-if="src"
      class="w-full bg-black"
      :class="isLandscape ? 'aspect-video' : ''"
      :style="iframeHeight ? `height: ${iframeHeight}` : undefined"
    >
      <iframe
        :src="src"
        :title="platformInfo?.label ?? 'Embed'"
        class="w-full h-full border-0 block"
        loading="lazy"
        allowfullscreen
        scrolling="no"
        allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-presentation"
      />
    </div>

    <!-- Fallback: Twitter/X or unrecognized -->
    <div
      v-else
      class="flex flex-col items-center justify-center gap-4 py-12 px-6 text-center bg-elevated"
    >
      <div
        class="size-16 rounded-full flex items-center justify-center"
        :class="headerClass"
      >
        <UIcon
          :name="platformInfo?.icon ?? 'i-lucide-globe'"
          class="size-7 text-white"
        />
      </div>
      <div>
        <p class="text-sm font-semibold text-highlighted">{{ platformInfo?.label ?? embed.platform }}</p>
        <p class="text-xs text-muted mt-1 max-w-xs">
          Platform ini tidak mendukung embed langsung.
          Klik tombol di bawah untuk membuka postingan asli.
        </p>
      </div>
      <a
        :href="embed.url"
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium text-white transition-opacity hover:opacity-80"
        :class="headerClass"
      >
        <UIcon name="i-lucide-external-link" class="size-3.5" />
        Buka Postingan
      </a>
    </div>

    <!-- Decorative action bar (social platforms) -->
    <div
      v-if="showActionBar"
      class="flex items-center gap-4 px-4 py-3 border-t border-default bg-default"
    >
      <UIcon name="i-lucide-heart" class="size-5 text-muted/60 hover:text-red-500 transition cursor-default" />
      <UIcon name="i-lucide-message-circle" class="size-5 text-muted/60 cursor-default" />
      <UIcon name="i-lucide-send" class="size-5 text-muted/60 cursor-default" />
      <UIcon name="i-lucide-bookmark" class="size-5 text-muted/60 cursor-default ml-auto" />
    </div>
  </div>
</template>

