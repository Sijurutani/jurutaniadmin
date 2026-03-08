<script setup lang="ts">
import { format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import type { Database } from '~/types/database.types'

type MarketRow = Database['public']['Tables']['product_markets']['Row'] & {
  owner?: { id: string, full_name: string | null, username: string | null, avatar_url: string | null } | null
}
type AttachmentItem = { url: string, name: string, type: string, size: number }
type LinkItem = { label: string, url: string }

const route = useRoute()
const supabase = useSupabase()
const toast = useToast()
const slug = route.params.slug as string

const market = ref<MarketRow | null>(null)
const pending = ref(true)
const notFound = ref(false)

useHead(() => ({
  title: market.value ? `${market.value.name} – Preview` : 'Preview Produk'
}))

async function loadMarket() {
  const { data, error } = await supabase
    .from('product_markets')
    .select('*, owner:profiles(id, full_name, username, avatar_url)')
    .eq('slug', slug)
    .is('deleted_at', null)
    .single()

  if (error || !data) {
    notFound.value = true
    pending.value = false
    return
  }

  market.value = data as MarketRow
  pending.value = false
}

const statusInfo = computed(() =>
  Enum.StatusMarkets.find(s => s.value === market.value?.status)
)

const statusColor = computed((): 'neutral' | 'success' | 'warning' | 'error' => {
  const map: Record<string, 'neutral' | 'success' | 'warning' | 'error'> = {
    neutral: 'neutral', success: 'success', warning: 'warning', error: 'error'
  }
  return map[statusInfo.value?.color ?? 'neutral'] ?? 'neutral'
})

const priceLabel = computed(() => {
  if (!market.value) return null
  if (market.value.price != null) {
    const formatted = new Intl.NumberFormat('id-ID').format(Number(market.value.price))
    return `Rp ${formatted}${market.value.price_unit ? ` / ${market.value.price_unit}` : ''}`
  }
  if (market.value.price_range) return market.value.price_range
  return null
})

const galleryUrls = computed(() => {
  const imgs = market.value?.images as string[] | null
  return (imgs ?? []).map(u => getMarketPublicUrl(u) ?? u)
})

const attachments = computed(() =>
  (market.value?.attachments as AttachmentItem[] | null) ?? []
)

const links = computed(() =>
  ((market.value?.links as LinkItem[] | null) ?? []).filter(l => l.label && l.url)
)

function fileIcon(type: string) {
  if (type.includes('pdf')) return 'i-lucide-file-text'
  if (type.includes('sheet') || type.includes('excel') || type.includes('csv')) return 'i-lucide-file-spreadsheet'
  if (type.includes('word') || type.includes('document')) return 'i-lucide-file-type-2'
  if (type.startsWith('image/')) return 'i-lucide-file-image'
  return 'i-lucide-file'
}

onMounted(loadMarket)
</script>

<template>
  <UDashboardPanel id="markets-preview">
    <template #header>
      <UDashboardNavbar :title="market?.name ?? 'Preview Produk'">
        <template #leading>
          <UButton
            to="/markets"
            icon="i-lucide-arrow-left"
            color="neutral"
            variant="ghost"
            size="sm"
          />
        </template>
        <template #right>
          <UButton
            v-if="market"
            :to="`/markets/${market.id}/edit`"
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
        <UIcon name="i-lucide-package-x" class="size-16 text-muted" />
        <p class="text-lg font-medium text-highlighted">Produk tidak ditemukan</p>
        <p class="text-sm text-muted">Slug "{{ slug }}" tidak cocok dengan produk manapun.</p>
        <UButton to="/markets" icon="i-lucide-arrow-left" label="Kembali ke Daftar Produk" variant="soft" />
      </div>

      <!-- Product content -->
      <article v-else-if="market" class="max-w-3xl mx-auto">
        <!-- Status & category badges -->
        <div class="flex flex-wrap items-center gap-2 mb-4">
          <UBadge variant="soft" color="primary" class="capitalize">
            {{ market.category }}
          </UBadge>
          <UBadge :color="statusColor" variant="subtle" class="capitalize">
            {{ statusInfo?.label ?? market.status }}
          </UBadge>
          <span
            v-if="market.published_at"
            class="text-xs text-muted ml-auto"
          >
            {{ format(new Date(market.published_at), "d MMMM yyyy", { locale: localeId }) }}
          </span>
        </div>

        <!-- Name -->
        <h1 class="text-3xl font-bold text-highlighted leading-tight mb-2">
          {{ market.name }}
        </h1>

        <!-- Excerpt -->
        <p v-if="market.excerpt" class="text-lg text-muted mb-6 leading-relaxed">
          {{ market.excerpt }}
        </p>

        <!-- Price + seller row -->
        <div class="flex flex-wrap items-start gap-6 mb-6 pb-6 border-b border-default">
          <!-- Price -->
          <div v-if="priceLabel" class="flex flex-col gap-0.5">
            <span class="text-xs text-muted uppercase tracking-wide font-medium">Harga</span>
            <span class="text-2xl font-bold text-primary">{{ priceLabel }}</span>
          </div>

          <!-- Seller -->
          <div class="flex flex-col gap-0.5">
            <span class="text-xs text-muted uppercase tracking-wide font-medium">Penjual</span>
            <div class="flex items-center gap-2">
              <UAvatar
                v-if="market.owner"
                :src="market.owner.avatar_url ?? undefined"
                :alt="market.seller"
                size="xs"
              />
              <span class="font-medium text-highlighted">{{ market.seller }}</span>
            </div>
          </div>

          <!-- Contact -->
          <div v-if="market.contact_seller" class="flex flex-col gap-0.5">
            <span class="text-xs text-muted uppercase tracking-wide font-medium">Kontak</span>
            <span class="text-sm text-highlighted">{{ market.contact_seller }}</span>
          </div>
        </div>

        <!-- Thumbnail -->
        <div
          v-if="market.thumbnail_url"
          class="rounded-xl overflow-hidden aspect-video bg-muted mb-8"
        >
          <img
            :src="getMarketPublicUrl(market.thumbnail_url) ?? market.thumbnail_url"
            :alt="market.name"
            class="size-full object-cover"
          >
        </div>

        <!-- Content (Tiptap JSON) -->
        <div v-if="market.content" class="prose prose-lg dark:prose-invert max-w-none mb-10">
          <UEditor
            :model-value="(market.content as any)"
            :editable="false"
            content-type="json"
          />
        </div>

        <!-- Gallery -->
        <div
          v-if="galleryUrls.length > 0"
          class="border-t border-default pt-8 mb-8"
        >
          <h3 class="text-base font-semibold text-highlighted mb-4 flex items-center gap-2">
            <UIcon name="i-lucide-images" class="size-4 text-muted" />
            Galeri Foto
          </h3>
          <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div
              v-for="(url, idx) in galleryUrls"
              :key="idx"
              class="rounded-lg overflow-hidden aspect-square bg-muted"
            >
              <img
                :src="url"
                :alt="`Galeri ${idx + 1}`"
                class="size-full object-cover hover:scale-105 transition-transform duration-200"
              >
            </div>
          </div>
        </div>

        <!-- Links -->
        <div
          v-if="links.length > 0"
          class="border-t border-default pt-8 mb-8"
        >
          <h3 class="text-base font-semibold text-highlighted mb-4 flex items-center gap-2">
            <UIcon name="i-lucide-shopping-cart" class="size-4 text-muted" />
            Beli Sekarang
          </h3>
          <div class="flex flex-wrap gap-3">
            <UButton
              v-for="link in links"
              :key="link.url"
              :to="link.url"
              target="_blank"
              rel="noopener noreferrer"
              icon="i-lucide-external-link"
              variant="outline"
              color="primary"
            >
              {{ link.label }}
            </UButton>
          </div>
        </div>

        <!-- Attachments -->
        <div
          v-if="attachments.length > 0"
          class="border-t border-default pt-8 mb-8"
        >
          <h3 class="text-base font-semibold text-highlighted mb-4 flex items-center gap-2">
            <UIcon name="i-lucide-paperclip" class="size-4 text-muted" />
            Lampiran
          </h3>
          <div class="space-y-2">
            <a
              v-for="(att, idx) in attachments"
              :key="idx"
              :href="att.url"
              target="_blank"
              rel="noopener noreferrer"
              class="flex items-center gap-3 px-4 py-3 rounded-lg border border-default bg-elevated/50 hover:bg-elevated transition-colors group"
            >
              <UIcon :name="fileIcon(att.type)" class="size-5 text-primary shrink-0" />
              <span class="flex-1 text-sm text-highlighted group-hover:underline truncate">{{ att.name }}</span>
              <span class="text-xs text-muted shrink-0">{{ (att.size / 1024).toFixed(0) }} KB</span>
              <UIcon name="i-lucide-download" class="size-4 text-muted shrink-0" />
            </a>
          </div>
        </div>

        <!-- Metadata -->
        <div class="mt-8 pt-6 border-t border-default text-xs text-muted flex flex-wrap gap-4">
          <span>ID: <code class="font-mono">{{ market.id }}</code></span>
          <span>Slug: <code class="font-mono">{{ market.slug ?? '-' }}</code></span>
          <span>Dibuat: {{ format(new Date(market.created_at), "d MMM yyyy HH:mm", { locale: localeId }) }}</span>
          <span v-if="market.updated_at">
            Diperbarui: {{ format(new Date(market.updated_at), "d MMM yyyy HH:mm", { locale: localeId }) }}
          </span>
        </div>
      </article>
    </template>
  </UDashboardPanel>
</template>
