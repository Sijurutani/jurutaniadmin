<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import { breakpointsTailwind } from '@vueuse/core'
import type { Database } from '~/types/database.types'

type District = Database['public']['Tables']['districts']['Row']

useHead({ title: 'Maps – Jurutani Admin' })

const supabase = useSupabaseClient()
const toast = useToast()

const breakpoints = useBreakpoints(breakpointsTailwind)
const isMobile = breakpoints.smaller('lg')

// ─── Data ─────────────────────────────────────────────────────────────────────
const { data: allDistricts, refresh: refreshData, pending: loading } = await useAsyncData(
  'maps-districts',
  async () => {
    const { data, error } = await supabase
      .from('districts')
      .select('*')
      .order('province')
      .order('name')
    if (error) throw error
    return (data ?? []) as District[]
  },
  { default: () => [] as District[] }
)

async function fetchAll() {
  try {
    await refreshData()
  } catch (err: any) {
    toast.add({ title: 'Gagal memuat data', description: err?.message, color: 'error' })
  }
}

// ─── Province list (derived) ──────────────────────────────────────────────────
const provinceSearch = ref('')
const selectedProvince = ref<string | null>(null)

const provinces = computed(() => {
  const map = new Map<string, number>()
  for (const d of allDistricts.value) {
    map.set(d.province, (map.get(d.province) ?? 0) + 1)
  }
  const list = Array.from(map.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => a.name.localeCompare(b.name))

  const q = provinceSearch.value.trim().toLowerCase()
  return q ? list.filter(p => p.name.toLowerCase().includes(q)) : list
})

// Auto-select first province — runs reactively and also on mount as fallback
watchEffect(() => {
  if (!selectedProvince.value && provinces.value.length > 0) {
    selectedProvince.value = provinces.value[0]!.name
  }
})

onMounted(() => {
  if (!selectedProvince.value && provinces.value.length > 0) {
    selectedProvince.value = provinces.value[0]!.name
  }
})

// ─── Districts for selected province ─────────────────────────────────────────
const districtSearch = ref('')

const activeDistricts = computed(() => {
  if (!selectedProvince.value) return []
  const q = districtSearch.value.trim().toLowerCase()
  return allDistricts.value.filter(d =>
    d.province === selectedProvince.value &&
    (!q || d.name.toLowerCase().includes(q))
  )
})

function selectProvince(name: string) {
  selectedProvince.value = name
  districtSearch.value = ''
  if (isMobile.value) districtPanelOpen.value = true
}

// Mobile district panel
const districtPanelOpen = ref(false)

// ─── Rename Province modal ────────────────────────────────────────────────────
const renameProvinceOpen = ref(false)
const renamingProvince = ref('')
const savingRename = ref(false)

const renameSchema = z.object({
  name: z.string().min(2, 'Minimal 2 karakter').max(100)
})
const renameState = reactive({ name: '' })

function openRenameProvince(province: string) {
  renamingProvince.value = province
  renameState.name = province
  renameProvinceOpen.value = true
}

async function submitRenameProvince(event: FormSubmitEvent<{ name: string }>) {
  savingRename.value = true
  const { error } = await supabase
    .from('districts')
    .update({ province: event.data.name })
    .eq('province', renamingProvince.value)
  savingRename.value = false
  if (error) {
    toast.add({ title: 'Gagal mengubah nama provinsi', description: error.message, color: 'error' })
    return
  }
  if (selectedProvince.value === renamingProvince.value) {
    selectedProvince.value = event.data.name
  }
  toast.add({ title: 'Nama provinsi diperbarui', color: 'success' })
  renameProvinceOpen.value = false
  await fetchAll()
}

// ─── Delete Province modal ────────────────────────────────────────────────────
const deleteProvinceOpen = ref(false)
const deletingProvince = ref('')
const deletingProvinceLoading = ref(false)

function openDeleteProvince(province: string) {
  deletingProvince.value = province
  deleteProvinceOpen.value = true
}

async function confirmDeleteProvince() {
  deletingProvinceLoading.value = true
  const { error } = await supabase
    .from('districts')
    .delete()
    .eq('province', deletingProvince.value)
  deletingProvinceLoading.value = false
  if (error) {
    toast.add({ title: 'Gagal menghapus provinsi', description: error.message, color: 'error' })
    return
  }
  if (selectedProvince.value === deletingProvince.value) {
    selectedProvince.value = null
  }
  toast.add({ title: 'Provinsi beserta kabupaten dihapus', color: 'success' })
  deleteProvinceOpen.value = false
  await fetchAll()
}

// ─── Add Province modal ───────────────────────────────────────────────────────
const addProvinceOpen = ref(false)
const addProvinceSchema = z.object({
  province: z.string().min(2, 'Minimal 2 karakter').max(100),
  firstDistrict: z.string().min(2, 'Minimal 2 karakter').max(100)
})
const addProvinceState = reactive({ province: '', firstDistrict: '' })
const addingProvince = ref(false)

async function submitAddProvince(event: FormSubmitEvent<{ province: string; firstDistrict: string }>) {
  addingProvince.value = true
  const { error } = await supabase.from('districts').insert({
    name: event.data.firstDistrict,
    province: event.data.province
  })
  addingProvince.value = false
  if (error) {
    toast.add({ title: 'Gagal menambah provinsi', description: error.message, color: 'error' })
    return
  }
  toast.add({ title: 'Provinsi ditambahkan', color: 'success' })
  addProvinceOpen.value = false
  addProvinceState.province = ''
  addProvinceState.firstDistrict = ''
  await fetchAll()
  selectedProvince.value = event.data.province
}

// ─── Add / Edit District modal ────────────────────────────────────────────────
const districtModalOpen = ref(false)
const editingDistrict = ref<District | null>(null)
const savingDistrict = ref(false)

const districtSchema = z.object({
  name: z.string().min(2, 'Minimal 2 karakter').max(100)
})
const districtState = reactive({ name: '' })

function openAddDistrict() {
  editingDistrict.value = null
  districtState.name = ''
  districtModalOpen.value = true
}

function openEditDistrict(d: District) {
  editingDistrict.value = d
  districtState.name = d.name
  districtModalOpen.value = true
}

async function submitDistrict(event: FormSubmitEvent<{ name: string }>) {
  if (!selectedProvince.value) return
  savingDistrict.value = true
  const { error } = editingDistrict.value
    ? await supabase.from('districts').update({ name: event.data.name }).eq('id', editingDistrict.value.id)
    : await supabase.from('districts').insert({ name: event.data.name, province: selectedProvince.value })
  savingDistrict.value = false
  if (error) {
    toast.add({ title: 'Gagal menyimpan', description: error.message, color: 'error' })
    return
  }
  toast.add({ title: editingDistrict.value ? 'Kabupaten diperbarui' : 'Kabupaten ditambahkan', color: 'success' })
  districtModalOpen.value = false
  await fetchAll()
}

// ─── Delete District ──────────────────────────────────────────────────────────
const deleteDistrictOpen = ref(false)
const deletingDistrict = ref<District | null>(null)
const deletingDistrictLoading = ref(false)

function openDeleteDistrict(d: District) {
  deletingDistrict.value = d
  deleteDistrictOpen.value = true
}

async function confirmDeleteDistrict() {
  if (!deletingDistrict.value) return
  deletingDistrictLoading.value = true
  const { error } = await supabase.from('districts').delete().eq('id', deletingDistrict.value.id)
  deletingDistrictLoading.value = false
  if (error) {
    toast.add({ title: 'Gagal menghapus', description: error.message, color: 'error' })
    return
  }
  toast.add({ title: 'Kabupaten dihapus', color: 'success' })
  deleteDistrictOpen.value = false
  deletingDistrict.value = null
  await fetchAll()
}
</script>

<template>
  <!-- ── Left panel: Province list ───────────────────────────────────────────── -->
  <UDashboardPanel
    id="maps-provinces"
    :default-size="28"
    :min-size="20"
    :max-size="35"
    resizable
  >
    <UDashboardNavbar title="Provinsi" :ui="{ right: 'gap-1' }">
      <template #leading>
        <UDashboardSidebarCollapse />
      </template>
      <template #trailing>
        <UBadge :label="provinces.length" variant="subtle" />
      </template>
      <template #right>
        <UButton
          icon="i-lucide-refresh-cw"
          color="neutral"
          variant="ghost"
          size="sm"
          :loading="loading"
          @click="fetchAll()"
        />
        <UButton
          icon="i-lucide-plus"
          color="primary"
          variant="ghost"
          size="sm"
          @click="addProvinceOpen = true"
        />
      </template>
    </UDashboardNavbar>

    <!-- Province search -->
    <div class="px-3 py-2 border-b border-default">
      <UInput
        v-model="provinceSearch"
        icon="i-lucide-search"
        placeholder="Cari provinsi..."
        size="sm"
      />
    </div>

    <!-- Province list -->
    <div class="overflow-y-auto flex-1">
      <div
        v-if="provinces.length === 0"
        class="flex flex-col items-center justify-center py-12 text-muted gap-2"
      >
        <UIcon name="i-lucide-map" class="size-10 text-dimmed" />
        <p class="text-sm">Belum ada provinsi</p>
      </div>

      <button
        v-for="prov in provinces"
        :key="prov.name"
        class="group w-full flex items-center gap-3 px-4 py-3 border-b border-default text-left transition-colors hover:bg-elevated/60"
        :class="selectedProvince === prov.name ? 'bg-elevated' : ''"
        @click="selectProvince(prov.name)"
      >
        <div
          class="size-8 rounded-lg flex items-center justify-center shrink-0 transition-colors"
          :class="selectedProvince === prov.name
            ? 'bg-primary/15 text-primary'
            : 'bg-muted/50 text-muted group-hover:bg-muted'"
        >
          <UIcon name="i-lucide-map-pin" class="size-4" />
        </div>
        <div class="flex-1 min-w-0">
          <p
            class="text-sm font-medium truncate leading-tight"
            :class="selectedProvince === prov.name ? 'text-primary' : 'text-highlighted'"
          >
            {{ prov.name }}
          </p>
          <p class="text-xs text-muted mt-0.5">{{ prov.count }} kabupaten/kota</p>
        </div>
        <UDropdownMenu
          :items="[
            [{ label: 'Ganti Nama', icon: 'i-lucide-pencil', onSelect: () => openRenameProvince(prov.name) }],
            [{ label: 'Hapus Semua', icon: 'i-lucide-trash-2', color: 'error', onSelect: () => openDeleteProvince(prov.name) }]
          ]"
          :content="{ align: 'end' }"
          @click.stop
        >
          <UButton
            icon="i-lucide-ellipsis"
            color="neutral"
            variant="ghost"
            size="xs"
            class="opacity-0 group-hover:opacity-100 shrink-0"
            @click.stop
          />
        </UDropdownMenu>
      </button>
    </div>
  </UDashboardPanel>

  <!-- ── Right panel: Districts ───────────────────────────────────────────────── -->
  <UDashboardPanel id="maps-districts" class="flex-1">
    <template v-if="selectedProvince">
      <UDashboardNavbar :title="selectedProvince" :ui="{ right: 'gap-2' }">
        <template #right>
          <UInput
            v-model="districtSearch"
            icon="i-lucide-search"
            placeholder="Cari kabupaten..."
            size="sm"
            class="min-w-44"
          />
          <UButton
            icon="i-lucide-plus"
            label="Tambah"
            size="sm"
            @click="openAddDistrict"
          />
        </template>
      </UDashboardNavbar>

      <div class="p-4 overflow-y-auto">
        <!-- Stats strip -->
        <div class="flex items-center gap-4 mb-5 p-3 rounded-xl bg-elevated border border-default">
          <div class="flex items-center gap-2 text-sm">
            <UIcon name="i-lucide-building-2" class="size-4 text-primary" />
            <span class="font-semibold text-highlighted">{{ activeDistricts.length }}</span>
            <span class="text-muted">
              {{ districtSearch ? 'hasil pencarian' : 'kabupaten/kota' }}
            </span>
          </div>
          <div v-if="districtSearch" class="ml-auto">
            <UButton
              label="Reset"
              variant="ghost"
              color="neutral"
              size="xs"
              icon="i-lucide-x"
              @click="districtSearch = ''"
            />
          </div>
        </div>

        <!-- Empty state -->
        <div
          v-if="activeDistricts.length === 0"
          class="flex flex-col items-center justify-center py-20 text-muted gap-3"
        >
          <UIcon name="i-lucide-map-pin-off" class="size-14 text-dimmed" />
          <p class="font-medium text-highlighted">Tidak ada kabupaten ditemukan</p>
          <UButton
            v-if="!districtSearch"
            label="Tambah Kabupaten/Kota"
            icon="i-lucide-plus"
            size="sm"
            @click="openAddDistrict"
          />
        </div>

        <!-- District cards grid -->
        <div
          v-else
          class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3"
        >
          <div
            v-for="district in activeDistricts"
            :key="district.id"
            class="group relative flex flex-col gap-1 rounded-xl border border-default bg-background p-3.5 hover:border-primary/40 hover:shadow-sm transition-all"
          >
            <div class="flex items-start justify-between gap-1">
              <div class="size-7 rounded-md bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <UIcon name="i-lucide-building-2" class="size-3.5 text-primary" />
              </div>
              <UDropdownMenu
                :items="[
                  [{ label: 'Edit', icon: 'i-lucide-pencil', onSelect: () => openEditDistrict(district) }],
                  [{ label: 'Hapus', icon: 'i-lucide-trash-2', color: 'error', onSelect: () => openDeleteDistrict(district) }]
                ]"
                :content="{ align: 'end' }"
              >
                <UButton
                  icon="i-lucide-ellipsis"
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  class="opacity-0 group-hover:opacity-100 -mr-1 -mt-0.5"
                />
              </UDropdownMenu>
            </div>
            <p class="text-sm font-medium text-highlighted leading-snug line-clamp-2">
              {{ district.name }}
            </p>
            <p class="text-xs text-muted">ID: {{ district.id }}</p>
          </div>
        </div>
      </div>
    </template>

    <!-- No province selected placeholder -->
    <div
      v-else
      class="flex flex-1 flex-col items-center justify-center gap-4 h-full"
    >
      <div class="flex flex-col items-center gap-3 max-w-xs text-center">
        <div class="size-20 rounded-2xl bg-elevated flex items-center justify-center">
          <UIcon name="i-lucide-map-pin" class="size-10 text-dimmed" />
        </div>
        <p class="text-base font-semibold text-highlighted">Belum Ada Provinsi Dipilih</p>
        <p class="text-sm text-muted leading-relaxed">
          Pilih salah satu provinsi di panel kiri untuk melihat daftar kabupaten/kota.
        </p>
        <UButton
          label="Tambah Provinsi Baru"
          icon="i-lucide-plus"
          variant="soft"
          size="sm"
          @click="addProvinceOpen = true"
        />
      </div>
    </div>
  </UDashboardPanel>

  <!-- Mobile: district panel as slideover -->
  <ClientOnly>
    <USlideover v-if="isMobile" v-model:open="districtPanelOpen">
      <template #content>
        <div class="flex flex-col h-full">
          <div class="flex items-center justify-between px-4 py-3 border-b border-default">
            <h3 class="font-semibold text-highlighted">{{ selectedProvince }}</h3>
            <UButton icon="i-lucide-x" color="neutral" variant="ghost" size="sm" @click="districtPanelOpen = false" />
          </div>
          <div class="p-3 border-b border-default">
            <UInput v-model="districtSearch" icon="i-lucide-search" placeholder="Cari kabupaten..." size="sm" />
          </div>
          <div class="overflow-y-auto flex-1 p-3">
            <div class="grid grid-cols-2 gap-2">
              <div
                v-for="district in activeDistricts"
                :key="district.id"
                class="group relative rounded-xl border border-default bg-background p-3 hover:border-primary/40 transition-all"
              >
                <div class="flex items-start justify-between mb-1">
                  <div class="size-6 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                    <UIcon name="i-lucide-building-2" class="size-3 text-primary" />
                  </div>
                  <UDropdownMenu
                    :items="[
                      [{ label: 'Edit', icon: 'i-lucide-pencil', onSelect: () => openEditDistrict(district) }],
                      [{ label: 'Hapus', icon: 'i-lucide-trash-2', color: 'error', onSelect: () => openDeleteDistrict(district) }]
                    ]"
                    :content="{ align: 'end' }"
                  >
                    <UButton icon="i-lucide-ellipsis" color="neutral" variant="ghost" size="xs" />
                  </UDropdownMenu>
                </div>
                <p class="text-xs font-medium text-highlighted line-clamp-2">{{ district.name }}</p>
              </div>
            </div>
          </div>
          <div class="p-3 border-t border-default">
            <UButton label="Tambah Kabupaten" icon="i-lucide-plus" block @click="openAddDistrict" />
          </div>
        </div>
      </template>
    </USlideover>
  </ClientOnly>

  <!-- ── Add Province modal ──────────────────────────────────────────────────── -->
  <UModal
    v-model:open="addProvinceOpen"
    title="Tambah Provinsi"
    description="Provinsi baru akan dibuat beserta satu kabupaten/kota pertama."
  >
    <template #body>
      <UForm :schema="addProvinceSchema" :state="addProvinceState" class="space-y-4" @submit="submitAddProvince">
        <UFormField label="Nama Provinsi" name="province">
          <UInput v-model="addProvinceState.province" placeholder="Contoh: Jawa Barat" class="w-full" />
        </UFormField>
        <UFormField label="Kabupaten/Kota Pertama" name="firstDistrict" hint="Minimal satu data kabupaten diperlukan">
          <UInput v-model="addProvinceState.firstDistrict" placeholder="Contoh: Kota Bandung" class="w-full" />
        </UFormField>
        <div class="flex justify-end gap-2 pt-2">
          <UButton label="Batal" color="neutral" variant="subtle" :disabled="addingProvince" @click="addProvinceOpen = false" />
          <UButton label="Tambah Provinsi" type="submit" :loading="addingProvince" />
        </div>
      </UForm>
    </template>
  </UModal>

  <!-- ── Rename Province modal ───────────────────────────────────────────────── -->
  <UModal
    v-model:open="renameProvinceOpen"
    title="Ganti Nama Provinsi"
    :description="`Mengubah nama &quot;${renamingProvince}&quot;. Semua kabupaten di provinsi ini akan diperbarui.`"
  >
    <template #body>
      <UForm :schema="renameSchema" :state="renameState" class="space-y-4" @submit="submitRenameProvince">
        <UFormField label="Nama Baru" name="name">
          <UInput v-model="renameState.name" class="w-full" />
        </UFormField>
        <div class="flex justify-end gap-2 pt-2">
          <UButton label="Batal" color="neutral" variant="subtle" :disabled="savingRename" @click="renameProvinceOpen = false" />
          <UButton label="Simpan" type="submit" :loading="savingRename" />
        </div>
      </UForm>
    </template>
  </UModal>

  <!-- ── Delete Province modal ───────────────────────────────────────────────── -->
  <UModal
    v-model:open="deleteProvinceOpen"
    title="Hapus Provinsi?"
    :description="`Semua kabupaten/kota di &quot;${deletingProvince}&quot; akan ikut terhapus permanen. Tindakan ini tidak dapat dibatalkan.`"
  >
    <template #body>
      <div class="flex justify-end gap-2">
        <UButton label="Batal" color="neutral" variant="subtle" :disabled="deletingProvinceLoading" @click="deleteProvinceOpen = false" />
        <UButton label="Hapus Semua" color="error" icon="i-lucide-trash-2" :loading="deletingProvinceLoading" @click="confirmDeleteProvince" />
      </div>
    </template>
  </UModal>

  <!-- ── Add / Edit District modal ──────────────────────────────────────────── -->
  <UModal
    v-model:open="districtModalOpen"
    :title="editingDistrict ? 'Edit Kabupaten/Kota' : 'Tambah Kabupaten/Kota'"
    :description="editingDistrict ? `Perbarui nama kabupaten &quot;${editingDistrict.name}&quot;.` : `Tambah kabupaten/kota baru ke ${selectedProvince}.`"
  >
    <template #body>
      <UForm :schema="districtSchema" :state="districtState" class="space-y-4" @submit="submitDistrict">
        <UFormField label="Nama Kabupaten/Kota" name="name">
          <UInput v-model="districtState.name" placeholder="Contoh: Kabupaten Bogor" class="w-full" />
        </UFormField>
        <div class="flex justify-end gap-2 pt-2">
          <UButton label="Batal" color="neutral" variant="subtle" :disabled="savingDistrict" @click="districtModalOpen = false" />
          <UButton :label="editingDistrict ? 'Simpan Perubahan' : 'Tambah'" type="submit" :loading="savingDistrict" />
        </div>
      </UForm>
    </template>
  </UModal>

  <!-- ── Delete District modal ──────────────────────────────────────────────── -->
  <UModal
    v-model:open="deleteDistrictOpen"
    title="Hapus Kabupaten/Kota?"
    :description="`Hapus &quot;${deletingDistrict?.name}&quot; secara permanen?`"
  >
    <template #body>
      <div class="flex justify-end gap-2">
        <UButton label="Batal" color="neutral" variant="subtle" :disabled="deletingDistrictLoading" @click="deleteDistrictOpen = false" />
        <UButton label="Hapus" color="error" icon="i-lucide-trash-2" :loading="deletingDistrictLoading" @click="confirmDeleteDistrict" />
      </div>
    </template>
  </UModal>
</template>
