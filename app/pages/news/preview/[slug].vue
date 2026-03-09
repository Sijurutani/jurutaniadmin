<script setup lang="ts">
import { format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import type { Database } from '~/types/database.types'

type NewsRow = Database['public']['Tables']['news_updated']['Row'] & {
  author?: { id: string, full_name: string | null, username: string | null, avatar_url: string | null } | null
}

const route = useRoute()
const supabase = useSupabaseClient()
const toast = useToast()
const slug = route.params.slug as string

const news = ref<NewsRow | null>(null)
const pending = ref(true)
const notFound = ref(false)

useHead(() => ({
  title: news.value ? `${news.value.title} – Preview` : 'Preview Berita'
}))

async function loadNews() {
  const { data, error } = await supabase
    .from('news_updated')
    .select('*, author:profiles(id, full_name, username, avatar_url)')
    .eq('slug', slug)
    .is('deleted_at', null)
    .single()

  if (error || !data) {
    notFound.value = true
    pending.value = false
    return
  }

  news.value = data as NewsRow
  pending.value = false
}

const statusInfo = computed(() =>
  Enum.StatusNews.find(s => s.value === news.value?.status_news)
)

const statusColor = computed((): 'neutral' | 'success' | 'warning' | 'error' => {
  const map: Record<string, 'neutral' | 'success' | 'warning' | 'error'> = {
    neutral: 'neutral', success: 'success', warning: 'warning', error: 'error'
  }
  return map[statusInfo.value?.color ?? 'neutral'] ?? 'neutral'
})

onMounted(loadNews)
</script>

<template>
  <UDashboardPanel id="news-preview">
    <template #header>
      <UDashboardNavbar :title="news?.title ?? 'Preview Berita'">
        <template #leading>
          <UButton
            to="/news"
            icon="i-lucide-arrow-left"
            color="neutral"
            variant="ghost"
            size="sm"
          />
        </template>
        <template #right>
          <UButton
            v-if="news"
            :to="`/news/${news.id}/edit`"
            icon="i-lucide-pencil"
            color="neutral"
            variant="outline"
            label="Edit"
            size="sm"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <!-- Loading -->
      <div v-if="pending" class="max-w-3xl mx-auto space-y-6">
        <USkeleton class="h-8 w-3/4" />
        <USkeleton class="h-4 w-1/2" />
        <USkeleton class="aspect-video w-full rounded-xl" />
        <div class="space-y-3">
          <USkeleton class="h-4 w-full" />
          <USkeleton class="h-4 w-full" />
          <USkeleton class="h-4 w-4/5" />
        </div>
      </div>

      <!-- Not found -->
      <div v-else-if="notFound" class="flex flex-col items-center justify-center py-24 gap-4">
        <UIcon name="i-lucide-file-x-2" class="size-16 text-muted" />
        <p class="text-lg font-medium text-highlighted">Berita tidak ditemukan</p>
        <p class="text-sm text-muted">Slug "{{ slug }}" tidak cocok dengan berita manapun.</p>
        <UButton to="/news" icon="i-lucide-arrow-left" label="Kembali ke Daftar Berita" variant="soft" />
      </div>

      <!-- Article content -->
      <article v-else-if="news" class="max-w-3xl mx-auto">
        <!-- Header badges -->
        <div class="flex flex-wrap items-center gap-2 mb-4">
          <UBadge variant="soft" color="primary" class="capitalize">
            {{ news.category }}
          </UBadge>
          <UBadge :color="statusColor" variant="subtle" class="capitalize">
            {{ statusInfo?.label ?? news.status_news }}
          </UBadge>
          <span
            v-if="news.published_at"
            class="text-xs text-muted ml-auto"
          >
            {{ format(new Date(news.published_at), "d MMMM yyyy", { locale: localeId }) }}
          </span>
        </div>

        <!-- Title -->
        <h1 class="text-3xl font-bold text-highlighted leading-tight mb-2">
          {{ news.title }}
        </h1>

        <!-- Sub title -->
        <p v-if="news.sub_title" class="text-lg text-muted mb-6 leading-relaxed">
          {{ news.sub_title }}
        </p>

        <!-- Author -->
        <div v-if="news.author" class="flex items-center gap-3 mb-6 pb-6 border-b border-default">
          <UAvatar
            :src="news.author.avatar_url ?? undefined"
            :alt="news.author.full_name ?? 'Author'"
            size="sm"
          />
          <div>
            <p class="font-medium text-sm text-highlighted">
              {{ news.author.full_name ?? news.author.username ?? 'Anonim' }}
            </p>
            <p class="text-xs text-muted">Penulis</p>
          </div>
        </div>

        <!-- Cover image -->
        <div
          v-if="news.cover_image"
          class="rounded-xl overflow-hidden aspect-video bg-muted mb-8"
        >
          <img
            :src="getNewsPublicUrl(news.cover_image) ?? news.cover_image"
            :alt="news.title"
            class="size-full object-cover"
          >
        </div>

        <!-- Content (Tiptap JSON) -->
        <div v-if="news.content" class="prose prose-lg dark:prose-invert max-w-none mb-10">
          <UEditor
            :model-value="(news.content as any)"
            :editable="false"
            content-type="json"
          />
        </div>

        <!-- Gallery -->
        <div
          v-if="news.images && (news.images as string[]).length > 0"
          class="border-t border-default pt-8 mb-8"
        >
          <h3 class="text-base font-semibold text-highlighted mb-4">Galeri</h3>
          <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div
              v-for="(img, idx) in (news.images as string[])"
              :key="idx"
              class="rounded-lg overflow-hidden aspect-square bg-muted"
            >
              <img
                :src="getNewsPublicUrl(img) ?? img"
                :alt="`Galeri ${idx + 1}`"
                class="size-full object-cover hover:scale-105 transition-transform duration-200"
              >
            </div>
          </div>
        </div>

        <!-- External link -->
        <div
          v-if="news.link"
          class="flex items-center gap-2 px-4 py-3 rounded-lg bg-elevated border border-default"
        >
          <UIcon name="i-lucide-external-link" class="size-4 text-primary shrink-0" />
          <a
            :href="news.link"
            target="_blank"
            rel="noopener noreferrer"
            class="text-sm text-primary hover:underline truncate"
          >
            {{ news.link }}
          </a>
        </div>

        <!-- Metadata -->
        <div class="mt-8 pt-6 border-t border-default text-xs text-muted flex flex-wrap gap-4">
          <span>ID: <code class="font-mono">{{ news.id }}</code></span>
          <span>Slug: <code class="font-mono">{{ news.slug ?? '-' }}</code></span>
          <span>Dibuat: {{ format(new Date(news.created_at), "d MMM yyyy HH:mm", { locale: localeId }) }}</span>
        </div>
      </article>
    </template>
  </UDashboardPanel>
</template>
