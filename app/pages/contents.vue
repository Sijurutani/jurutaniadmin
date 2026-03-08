<script setup lang="ts">
useHead({ title: 'Contents - Jurutani Admin' })

const activeTab = ref('carousel')
const carouselRef = ref()
const bannerRef = ref()

const isLoading = computed(() =>
  activeTab.value === 'carousel'
    ? (carouselRef.value?.loading?.value ?? false)
    : (bannerRef.value?.loading?.value ?? false)
)

function refreshCurrent() {
  if (activeTab.value === 'carousel') carouselRef.value?.refresh()
  else bannerRef.value?.refresh()
}

function addNew() {
  if (activeTab.value === 'carousel') carouselRef.value?.openAdd()
  else bannerRef.value?.openAdd()
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
            variant="outline"
            :loading="isLoading"
            @click="refreshCurrent"
          />
          <UButton
            :label="activeTab === 'carousel' ? 'Tambah Slide' : 'Tambah Banner'"
            icon="i-lucide-plus"
            @click="addNew"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <UTabs
        v-model="activeTab"
        :items="[
          { label: 'Carousel', value: 'carousel', icon: 'i-lucide-image-play' },
          { label: 'Banner', value: 'banner', icon: 'i-lucide-image' }
        ]"
        :content="false"
        class="mb-6"
      />
      <ContentsCarouselSection v-if="activeTab === 'carousel'" ref="carouselRef" />
      <ContentsBannerSection v-else ref="bannerRef" />
    </template>
  </UDashboardPanel>
</template>