<script setup lang="ts">
useHead({ title: 'Contents - Jurutani Admin' })

type Tab = 'carousel' | 'banner'
const activeTab = ref<Tab>('carousel')
const carouselRef = ref()
const bannerRef = ref()

const tabs = [
  {
    value: 'carousel' as Tab,
    label: 'Carousel Slider',
    description: 'Slide hero di halaman utama',
    icon: 'i-lucide-image-play',
    color: 'text-primary',
    bg: 'bg-primary/10'
  },
  {
    value: 'banner' as Tab,
    label: 'Banner',
    description: 'Banner promosi aplikasi',
    icon: 'i-lucide-image',
    color: 'text-amber-500',
    bg: 'bg-amber-500/10'
  }
]

const isLoading = computed(() =>
  activeTab.value === 'carousel'
    ? (carouselRef.value?.loading?.value ?? false)
    : (bannerRef.value?.loading?.value ?? false)
)

function addNew() {
  if (activeTab.value === 'carousel') carouselRef.value?.openAdd()
  else bannerRef.value?.openAdd()
}

function refreshCurrent() {
  if (activeTab.value === 'carousel') carouselRef.value?.refresh()
  else bannerRef.value?.refresh()
}
</script>

<template>
  <UDashboardPanel id="contents">
    <template #header>
      <UDashboardNavbar title="Contents" :ui="{ right: 'gap-2' }">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UButton
            icon="i-lucide-refresh-cw"
            color="neutral"
            variant="ghost"
            square
            :loading="isLoading"
            @click="refreshCurrent"
          />
          <UButton
            :label="activeTab === 'carousel' ? 'Tambah Slide' : 'Upload Banner'"
            icon="i-lucide-plus"
            size="sm"
            @click="addNew"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <!-- Tab selector cards -->
      <div class="grid grid-cols-2 gap-3 mb-6">
        <button
          v-for="tab in tabs"
          :key="tab.value"
          type="button"
          class="group flex items-center gap-3.5 rounded-xl border px-4 py-3.5 text-left transition-all"
          :class="activeTab === tab.value
            ? 'border-primary bg-primary/5 ring-1 ring-primary shadow-sm'
            : 'border-default bg-elevated hover:bg-elevated/80 hover:border-accented'"
          @click="activeTab = tab.value"
        >
          <div
            class="size-9 rounded-lg flex items-center justify-center shrink-0 transition-colors"
            :class="activeTab === tab.value ? tab.bg : 'bg-muted/50 group-hover:' + tab.bg"
          >
            <UIcon
              :name="tab.icon"
              class="size-5 transition-colors"
              :class="activeTab === tab.value ? tab.color : 'text-muted'"
            />
          </div>
          <div class="min-w-0 flex-1">
            <p
              class="text-sm font-semibold leading-tight transition-colors"
              :class="activeTab === tab.value ? 'text-highlighted' : 'text-default'"
            >
              {{ tab.label }}
            </p>
            <p class="text-xs text-muted truncate mt-0.5">
              {{ tab.description }}
            </p>
          </div>
          <div
            v-if="activeTab === tab.value"
            class="size-2 rounded-full bg-primary shrink-0"
          />
        </button>
      </div>

      <!-- Active section -->
      <ContentsCarouselSection
        v-if="activeTab === 'carousel'"
        ref="carouselRef"
      />
      <ContentsBannerSection
        v-else
        ref="bannerRef"
      />
    </template>
  </UDashboardPanel>
</template>