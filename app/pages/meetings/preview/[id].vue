<script setup lang="ts">
import { format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import type { Database } from '~/types/database.types'
import type { EmbedItem } from '~/utils/embed'

type MeetingRow = Database['public']['Tables']['meeting_schedules']['Row'] & {
  author?: { id: string, full_name: string | null, username: string | null, avatar_url: string | null } | null
}

const route = useRoute()
const supabase = useSupabase()

const meetingId = route.params.id as string

const meeting = ref<MeetingRow | null>(null)
const pending = ref(true)
const notFound = ref(false)

useHead(() => ({
  title: meeting.value ? `${meeting.value.title} – Preview` : 'Preview Meeting'
}))

async function loadMeeting() {
  const { data, error } = await supabase
    .from('meeting_schedules')
    .select('*, author:profiles(id, full_name, username, avatar_url)')
    .eq('id', meetingId)
    .is('deleted_at', null)
    .single()

  if (error || !data) {
    notFound.value = true
    pending.value = false
    return
  }

  meeting.value = data as MeetingRow
  pending.value = false
}

const embedsList = computed<EmbedItem[]>(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const m = meeting.value as any
  if (!m?.embeds) return []
  return parseEmbeds(m.embeds)
})

// Portrait platforms render in a responsive grid column layout
const portraitPlatforms = ['instagram_post', 'instagram_reel', 'tiktok']
const portraitEmbeds = computed(() => embedsList.value.filter(e => portraitPlatforms.includes(e.platform)))
const landscapeEmbeds = computed(() => embedsList.value.filter(e => !portraitPlatforms.includes(e.platform)))

const portraitGridClass = computed(() => {
  const n = portraitEmbeds.value.length
  if (n === 1) return 'grid-cols-1'
  if (n === 2) return 'grid-cols-1 sm:grid-cols-2'
  return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
})

// Platform summary for badges
const platformSummary = computed(() => {
  const counts: Record<string, number> = {}
  for (const e of embedsList.value) {
    counts[e.platform] = (counts[e.platform] ?? 0) + 1
  }
  return Object.entries(counts).map(([platform, count]) => ({
    platform,
    count,
    info: Enum.EmbedPlatforms.find(p => p.value === platform)
  }))
})

onMounted(loadMeeting)
</script>

<template>
  <UDashboardPanel id="meetings-preview">
    <template #header>
      <UDashboardNavbar :title="meeting?.title ?? 'Preview Meeting'">
        <template #leading>
          <UButton
            to="/meetings"
            icon="i-lucide-arrow-left"
            color="neutral"
            variant="ghost"
            size="sm"
          />
        </template>
        <template #right>
          <UButton
            v-if="meeting"
            :to="`/meetings/${meeting.id}/edit`"
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
      <div v-if="pending" class="max-w-5xl mx-auto space-y-6 pb-12">
        <USkeleton class="h-8 w-2/3" />
        <USkeleton class="h-4 w-1/4" />
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-8">
          <USkeleton class="rounded-2xl h-150 w-full max-w-sm" />
          <USkeleton class="rounded-2xl h-150 w-full max-w-sm" />
        </div>
      </div>

      <!-- Not found -->
      <div
        v-else-if="notFound"
        class="flex flex-col items-center justify-center py-24 gap-4"
      >
        <UIcon name="i-lucide-calendar-x-2" class="size-16 text-muted" />
        <p class="text-lg font-medium text-highlighted">Meeting tidak ditemukan</p>
        <p class="text-sm text-muted">ID "{{ meetingId }}" tidak cocok dengan data manapun.</p>
        <UButton
          to="/meetings"
          icon="i-lucide-arrow-left"
          label="Kembali ke Daftar Meeting"
          variant="soft"
        />
      </div>

      <!-- Content -->
      <article v-else-if="meeting" class="max-w-5xl mx-auto pb-16">
        <!-- ── Page Header ───────────────────────────────────── -->
        <div class="mb-8">
          <!-- Platform badges + date -->
          <div class="flex flex-wrap items-center gap-2 mb-4">
            <template v-for="item in platformSummary" :key="item.platform">
              <UBadge
                variant="soft"
                :color="(item.info?.color as any) ?? 'neutral'"
                class="gap-1.5 py-1 px-2.5"
              >
                <UIcon :name="item.info?.icon ?? 'i-lucide-globe'" class="size-3.5" />
                {{ item.info?.label ?? item.platform }}
                <span v-if="item.count > 1" class="font-bold ml-0.5">×{{ item.count }}</span>
              </UBadge>
            </template>

            <UBadge v-if="meeting.archived_at" color="warning" variant="subtle">
              Archived
            </UBadge>

            <span class="text-xs text-muted ml-auto">
              {{ format(new Date(meeting.created_at), 'd MMMM yyyy', { locale: localeId }) }}
            </span>
          </div>

          <h1 class="text-3xl font-bold text-highlighted leading-tight">
            {{ meeting.title }}
          </h1>

          <!-- Author row -->
          <div
            v-if="meeting.author"
            class="flex items-center gap-3 mt-4 pb-5 border-b border-default"
          >
            <UAvatar
              :src="(meeting.author as any).avatar_url ?? undefined"
              :alt="(meeting.author as any).full_name ?? 'Author'"
              size="sm"
            />
            <div>
              <p class="font-medium text-sm text-highlighted">
                {{ (meeting.author as any).full_name ?? (meeting.author as any).username ?? 'Anonim' }}
              </p>
              <p class="text-xs text-muted">Author</p>
            </div>
          </div>
        </div>

        <!-- ── Catatan ───────────────────────────────────────── -->
        <div
          v-if="meeting.content"
          class="mb-8 flex gap-3 px-4 py-3 rounded-xl bg-elevated border border-default"
        >
          <UIcon name="i-lucide-sticky-note" class="size-4 text-muted shrink-0 mt-0.5" />
          <p class="text-sm text-highlighted whitespace-pre-wrap leading-relaxed">{{ meeting.content }}</p>
        </div>

        <!-- ── Empty state ───────────────────────────────────── -->
        <div
          v-if="embedsList.length === 0"
          class="flex flex-col items-center justify-center py-24 gap-4 border-2 border-dashed border-default rounded-2xl"
        >
          <div class="size-16 rounded-full bg-elevated flex items-center justify-center">
            <UIcon name="i-lucide-layout-grid" class="size-8 text-muted" />
          </div>
          <p class="text-muted text-sm">Belum ada embed untuk meeting ini.</p>
          <UButton
            :to="`/meetings/${meeting.id}/edit`"
            icon="i-lucide-plus"
            label="Tambah Embed"
            variant="soft"
            size="sm"
          />
        </div>

        <!-- ── Canvas section ────────────────────────────────── -->
        <div v-else class="space-y-10">
          <!-- Landscape: YouTube, Facebook Video — full width -->
          <div v-if="landscapeEmbeds.length > 0" class="space-y-6">
            <MeetingsEmbedCanvas
              v-for="embed in landscapeEmbeds"
              :key="embed.id"
              :embed="embed"
            />
          </div>

          <!-- Divider when both types exist -->
          <USeparator
            v-if="landscapeEmbeds.length > 0 && portraitEmbeds.length > 0"
            label="Postingan"
            :ui="{ label: 'text-xs text-muted' }"
          />

          <!-- Portrait: IG post/reel, TikTok — grid yang rapi -->
          <div
            v-if="portraitEmbeds.length > 0"
            class="grid gap-6"
            :class="portraitGridClass"
          >
            <MeetingsEmbedCanvas
              v-for="embed in portraitEmbeds"
              :key="embed.id"
              :embed="embed"
            />
          </div>
        </div>

        <!-- ── Metadata footer ───────────────────────────────── -->
        <div class="mt-12 pt-6 border-t border-default text-xs text-muted flex flex-wrap gap-x-6 gap-y-1">
          <span>ID: <code class="font-mono text-highlighted/70">{{ meeting.id }}</code></span>
          <span>Total embed: <strong class="text-highlighted/70">{{ embedsList.length }}</strong></span>
          <span>Dibuat: {{ format(new Date(meeting.created_at), 'd MMM yyyy HH:mm', { locale: localeId }) }}</span>
          <span v-if="meeting.archived_at">
            Diarsipkan: {{ format(new Date(meeting.archived_at), 'd MMM yyyy', { locale: localeId }) }}
          </span>
        </div>
      </article>
    </template>
  </UDashboardPanel>
</template>

