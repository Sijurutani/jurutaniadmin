<script setup lang="ts">
import * as z from 'zod'
import { format, subDays } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import type { FormSubmitEvent } from '@nuxt/ui'
import { breakpointsTailwind } from '@vueuse/core'
import { VisXYContainer, VisLine, VisArea, VisAxis, VisCrosshair, VisTooltip } from '@unovis/vue'
import type { Database } from '~/types/database.types'

type FoodRow = Database['public']['Tables']['foods']['Row']
type FoodPriceRow = Database['public']['Tables']['food_prices']['Row']
type LatestPriceRow = Database['public']['Functions']['get_all_latest_prices']['Returns'][number]
type TrendRow = Database['public']['Functions']['get_price_trend_by_slug']['Returns'][number]

useHead({ title: 'Food Prices - Jurutani Admin' })

const supabase = useSupabaseClient()
const toast = useToast()

const breakpoints = useBreakpoints(breakpointsTailwind)
const isMobile = breakpoints.smaller('lg')

// ─── Data source ─────────────────────────────────────────────────────────────
const { data: foods, refresh: refreshFoods, pending: foodsPending } = await useAsyncData(
  'prices-foods-master',
  async () => {
    const { data, error } = await supabase
      .from('foods')
      .select('*')
      .is('deleted_at', null)
      .order('name')

    if (error) throw error
    return (data ?? []) as FoodRow[]
  },
  { default: () => [] as FoodRow[] }
)

const { data: latestPrices, refresh: refreshLatest, pending: latestPending } = await useAsyncData(
  'prices-foods-latest',
  async () => {
    const { data, error } = await supabase.rpc('get_all_latest_prices')
    if (error) throw error
    return (data ?? []) as LatestPriceRow[]
  },
  { default: () => [] as LatestPriceRow[] }
)

const search = ref('')
const selectedCategory = ref('')
const selectedFoodId = ref<string | null>(null)
const detailPanelOpen = ref(false)
const trendPeriodDays = ref<30 | 90 | 180 | 365>(30)

const trendPeriodItems = [
  { label: '1 Bulan', value: 30 as const },
  { label: '3 Bulan', value: 90 as const },
  { label: '6 Bulan', value: 180 as const },
  { label: '1 Tahun', value: 365 as const }
]

const categoryItems = computed(() => {
  const categories = Array.from(new Set((foods.value ?? []).map(f => f.category).filter(Boolean))).sort()
  return categories.map(c => ({ label: c, value: c }))
})

const latestBySlug = computed(() => {
  const map = new Map<string, LatestPriceRow>()
  for (const row of latestPrices.value) {
    map.set(row.slug, row)
  }
  return map
})

function toPriceChangePercent(current: number | null, change: number | null): number | null {
  if (current == null || change == null) return null
  const previous = current - change
  if (previous === 0) return null
  return (change / previous) * 100
}

const foodItems = computed(() => {
  const q = search.value.trim().toLowerCase()

  return (foods.value ?? [])
    .map((food) => {
      const latest = latestBySlug.value.get(food.slug)
      const currentPrice = latest?.price ?? null
      const nominalChange = latest?.price_change ?? null
      const percentChange = toPriceChangePercent(currentPrice, nominalChange)

      return {
        ...food,
        latestDate: latest?.date ?? null,
        currentPrice,
        nominalChange,
        percentChange
      }
    })
    .filter((item) => {
      const matchesSearch = !q
        || item.name.toLowerCase().includes(q)
        || item.slug.toLowerCase().includes(q)
      const matchesCategory = !selectedCategory.value || item.category === selectedCategory.value
      return matchesSearch && matchesCategory
    })
})

watchEffect(() => {
  if (!selectedFoodId.value && foodItems.value.length > 0) {
    selectedFoodId.value = foodItems.value[0]!.id
  }
})

const selectedFood = computed(() =>
  foodItems.value.find(item => item.id === selectedFoodId.value)
)

const selectedFoodSlug = computed(() => selectedFood.value?.slug ?? null)

const { data: trendRows, refresh: refreshTrend, pending: trendPending } = await useAsyncData(
  'prices-food-trend-30d',
  async () => {
    if (!selectedFoodSlug.value) return [] as TrendRow[]

    const { data, error } = await supabase.rpc('get_price_trend_by_slug', {
      p_slug: selectedFoodSlug.value,
      p_days: trendPeriodDays.value
    })

    if (error) throw error
    return (data ?? []) as TrendRow[]
  },
  {
    default: () => [] as TrendRow[],
    watch: [selectedFoodSlug, trendPeriodDays]
  }
)

const { data: monthPrices, refresh: refreshMonthPrices, pending: monthPricesPending } = await useAsyncData(
  'prices-food-month-table',
  async () => {
    if (!selectedFoodId.value) return [] as FoodPriceRow[]

    const { data, error } = await supabase
      .from('food_prices')
      .select('*')
      .eq('food_id', selectedFoodId.value)
      .order('date', { ascending: false })

    if (error) throw error
    return (data ?? []) as FoodPriceRow[]
  },
  {
    default: () => [] as FoodPriceRow[],
    watch: [selectedFoodId]
  }
)

async function refreshAll() {
  try {
    await Promise.all([refreshFoods(), refreshLatest(), refreshTrend(), refreshMonthPrices()])
  } catch (err: any) {
    toast.add({ title: 'Gagal refresh data', description: err?.message, color: 'error' })
  }
}

function selectFood(foodId: string) {
  selectedFoodId.value = foodId
  if (isMobile.value) {
    detailPanelOpen.value = true
  }
}

// ─── Chart helpers ───────────────────────────────────────────────────────────
const chartRows = computed(() =>
  [...(trendRows.value ?? [])]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((row, i) => ({
      idx: i,
      date: row.date,
      label: format(new Date(row.date), 'dd MMM', { locale: localeId }),
      price: row.price
    }))
)

const x = (d: { idx: number }) => d.idx
const y = (d: { price: number }) => d.price

const xTicks = (i: number) => {
  const row = chartRows.value[i]
  if (!row) return ''
  if (i === 0 || i === chartRows.value.length - 1 || i % 5 === 0) return row.label
  return ''
}

const tooltip = (d: { date: string, price: number }) =>
  `${format(new Date(d.date), 'dd MMM yyyy', { locale: localeId })}: Rp ${Number(d.price).toLocaleString('id-ID')}`

const trendTitle = computed(() => {
  const label = trendPeriodItems.find(item => item.value === trendPeriodDays.value)?.label ?? '1 Bulan'
  return `Tren Harga ${label}`
})

// ─── Price table pagination ─────────────────────────────────────────────────
const pricePage = ref(1)
const pricePerPage = 10

const totalPriceItems = computed(() => monthPrices.value.length)
const totalPricePages = computed(() => Math.max(1, Math.ceil(totalPriceItems.value / pricePerPage)))

const paginatedPrices = computed(() => {
  const start = (pricePage.value - 1) * pricePerPage
  const end = start + pricePerPage
  return monthPrices.value.slice(start, end)
})

watch(selectedFoodId, () => {
  pricePage.value = 1
})

watch(totalPricePages, (pages) => {
  if (pricePage.value > pages) {
    pricePage.value = pages
  }
})

function nextPricePage() {
  if (pricePage.value < totalPricePages.value) {
    pricePage.value += 1
  }
}

function prevPricePage() {
  if (pricePage.value > 1) {
    pricePage.value -= 1
  }
}

// ─── Food CRUD ───────────────────────────────────────────────────────────────
const foodModalOpen = ref(false)
const foodDeleteOpen = ref(false)
const editingFood = ref<FoodRow | null>(null)
const savingFood = ref(false)
const deletingFood = ref(false)

const foodSchema = z.object({
  name: z.string().min(1, 'Nama wajib diisi').max(120),
  slug: z.string().min(1, 'Slug wajib diisi').max(180),
  category: z.string().min(1, 'Kategori wajib diisi').max(120),
  satuan: z.string().min(1, 'Satuan wajib diisi').max(50),
  description: z.string().optional(),
  specifications: z.string().optional(),
  tagsText: z.string().optional()
})

type FoodSchema = z.output<typeof foodSchema>

const foodForm = reactive<FoodSchema>({
  name: '',
  slug: '',
  category: '',
  satuan: '',
  description: '',
  specifications: '',
  tagsText: ''
})

const foodImageFile = ref<File | null>(null)
const foodImagePreview = ref<string | null>(null)

const foodSlugEdited = ref(false)

watch(foodImageFile, (file) => {
  if (!file) return
  if (file.size > 5 * 1024 * 1024) {
    toast.add({ title: 'File terlalu besar', description: 'Maksimal 5MB', color: 'error' })
    foodImageFile.value = null
    return
  }
  foodImagePreview.value = URL.createObjectURL(file)
})

function onFoodNameInput() {
  if (!foodSlugEdited.value && foodForm.name) {
    foodForm.slug = slugify(foodForm.name)
  }
}

function resetFoodForm() {
  foodForm.name = ''
  foodForm.slug = ''
  foodForm.category = ''
  foodForm.satuan = ''
  foodForm.description = ''
  foodForm.specifications = ''
  foodForm.tagsText = ''
  foodImageFile.value = null
  foodImagePreview.value = null
  foodSlugEdited.value = false
  editingFood.value = null
}

function openCreateFood() {
  resetFoodForm()
  foodModalOpen.value = true
}

function openEditFood(food: FoodRow) {
  resetFoodForm()
  editingFood.value = food
  foodForm.name = food.name
  foodForm.slug = food.slug
  foodForm.category = food.category
  foodForm.satuan = food.satuan
  foodForm.description = food.description ?? ''
  foodForm.specifications = food.specifications ?? ''
  foodForm.tagsText = (food.tags ?? []).join(', ')
  foodImagePreview.value = getFoodPriceImagePublicUrl(food.image_url)
  foodModalOpen.value = true
}

function parseTags(input: string | undefined): string[] | null {
  const tags = (input ?? '')
    .split(',')
    .map(t => t.trim())
    .filter(Boolean)
  return tags.length > 0 ? tags : null
}

async function submitFood(event: FormSubmitEvent<FoodSchema>) {
  savingFood.value = true
  try {
    const tags = parseTags(event.data.tagsText)

    if (editingFood.value) {
      let imageUrl = editingFood.value.image_url

      if (foodImageFile.value) {
        if (editingFood.value.image_url) {
          await deleteFoodPriceImage(editingFood.value.image_url).catch(() => null)
        }
        imageUrl = await uploadFoodPriceImage(editingFood.value.id, foodImageFile.value)
      } else if (!foodImagePreview.value) {
        imageUrl = null
      }

      const { error } = await supabase
        .from('foods')
        .update({
          name: event.data.name,
          slug: event.data.slug,
          category: event.data.category,
          satuan: event.data.satuan,
          description: event.data.description || null,
          specifications: event.data.specifications || null,
          tags,
          image_url: imageUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingFood.value.id)

      if (error) throw error
      toast.add({ title: 'Food berhasil diperbarui', color: 'success' })
    } else {
      const foodId = crypto.randomUUID()
      let imageUrl: string | null = null

      if (foodImageFile.value) {
        imageUrl = await uploadFoodPriceImage(foodId, foodImageFile.value)
      }

      const { error } = await supabase.from('foods').insert({
        id: foodId,
        name: event.data.name,
        slug: event.data.slug,
        category: event.data.category,
        satuan: event.data.satuan,
        description: event.data.description || null,
        specifications: event.data.specifications || null,
        tags,
        image_url: imageUrl
      })

      if (error) throw error
      selectedFoodId.value = foodId
      toast.add({ title: 'Food baru berhasil ditambahkan', color: 'success' })
    }

    foodModalOpen.value = false
    await refreshAll()
  } catch (err: any) {
    toast.add({ title: 'Gagal menyimpan food', description: err?.message, color: 'error' })
  } finally {
    savingFood.value = false
  }
}

function openDeleteFood(food: FoodRow) {
  editingFood.value = food
  foodDeleteOpen.value = true
}

async function confirmDeleteFood() {
  if (!editingFood.value) return
  deletingFood.value = true
  try {
    if (editingFood.value.image_url) {
      await deleteFoodPriceImage(editingFood.value.image_url).catch(() => null)
    }

    await supabase.from('food_prices').delete().eq('food_id', editingFood.value.id)

    const { error } = await supabase.from('foods').delete().eq('id', editingFood.value.id)
    if (error) throw error

    toast.add({ title: 'Food dan semua riwayat harga dihapus', color: 'success' })
    foodDeleteOpen.value = false

    if (selectedFoodId.value === editingFood.value.id) {
      selectedFoodId.value = null
    }

    editingFood.value = null
    await refreshAll()
  } catch (err: any) {
    toast.add({ title: 'Gagal menghapus food', description: err?.message, color: 'error' })
  } finally {
    deletingFood.value = false
  }
}

// ─── Price CRUD ──────────────────────────────────────────────────────────────
const priceModalOpen = ref(false)
const deletingPrice = ref(false)
const priceDeleteOpen = ref(false)
const editingPrice = ref<FoodPriceRow | null>(null)
const savingPrice = ref(false)

const priceSchema = z.object({
  date: z.string().min(1, 'Tanggal wajib diisi'),
  price: z.number().min(0, 'Harga tidak boleh negatif')
})

type PriceSchema = z.output<typeof priceSchema>

const priceForm = reactive<PriceSchema>({
  date: format(new Date(), 'yyyy-MM-dd'),
  price: 0
})

function openAddPrice() {
  editingPrice.value = null
  priceForm.date = format(new Date(), 'yyyy-MM-dd')
  priceForm.price = 0
  priceModalOpen.value = true
}

function openEditPrice(item: FoodPriceRow) {
  editingPrice.value = item
  priceForm.date = item.date
  priceForm.price = item.price
  priceModalOpen.value = true
}

async function submitPrice(event: FormSubmitEvent<PriceSchema>) {
  if (!selectedFood.value) return

  savingPrice.value = true
  try {
    if (editingPrice.value) {
      const { error } = await supabase
        .from('food_prices')
        .update({
          date: event.data.date,
          price: event.data.price,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingPrice.value.id)

      if (error) throw error
      toast.add({ title: 'Harga berhasil diperbarui', color: 'success' })
    } else {
      const { error } = await supabase.from('food_prices').insert({
        food_id: selectedFood.value.id,
        date: event.data.date,
        price: event.data.price
      })
      if (error) throw error
      toast.add({ title: 'Harga berhasil ditambahkan', color: 'success' })
    }

    priceModalOpen.value = false
    await Promise.all([refreshLatest(), refreshTrend(), refreshMonthPrices()])
  } catch (err: any) {
    toast.add({ title: 'Gagal menyimpan harga', description: err?.message, color: 'error' })
  } finally {
    savingPrice.value = false
  }
}

function openDeletePrice(item: FoodPriceRow) {
  editingPrice.value = item
  priceDeleteOpen.value = true
}

async function confirmDeletePrice() {
  if (!editingPrice.value) return

  deletingPrice.value = true
  try {
    const { error } = await supabase.from('food_prices').delete().eq('id', editingPrice.value.id)
    if (error) throw error

    toast.add({ title: 'Riwayat harga dihapus', color: 'success' })
    priceDeleteOpen.value = false
    editingPrice.value = null
    await Promise.all([refreshLatest(), refreshTrend(), refreshMonthPrices()])
  } catch (err: any) {
    toast.add({ title: 'Gagal menghapus harga', description: err?.message, color: 'error' })
  } finally {
    deletingPrice.value = false
  }
}

// ─── Excel import ────────────────────────────────────────────────────────────
const importOpen = ref(false)
const importLoading = ref(false)
const importFile = ref<File | null>(null)

type ImportSummary = {
  total: number
  inserted: number
  updated: number
  failed: number
  errors: string[]
}

const importSummary = ref<ImportSummary | null>(null)

async function downloadTemplate() {
  const baseDate = format(new Date(), 'yyyy-MM-dd')
  const allRows = (foods.value ?? [])
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((food) => {
      const latest = latestBySlug.value.get(food.slug)
      return [
        food.slug,
        latest?.date ?? baseDate,
        latest?.price ?? ''
      ]
    })

  const rows = [
    ['food_slug', 'date', 'price'],
    ...allRows
  ]

  const XLSX = await import('xlsx')
  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws['!cols'] = [{ wch: 30 }, { wch: 16 }, { wch: 16 }]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Template')
  XLSX.writeFile(wb, `template-food-prices-${Date.now()}.xlsx`)
}

function normalizeRowValue(row: Record<string, any>, keys: string[]): any {
  const entries = Object.entries(row)
  for (const [k, v] of entries) {
    const normalizedKey = k.trim().toLowerCase().replace(/\s+/g, '_')
    if (keys.includes(normalizedKey)) return v
  }
  return null
}

function pad2(v: number): string {
  return String(v).padStart(2, '0')
}

function normalizeDateInput(value: unknown, XLSX: any): string | null {
  if (!value && value !== 0) return null

  if (value instanceof Date) {
    return format(value, 'yyyy-MM-dd')
  }

  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value)
    if (!parsed) return null
    return `${parsed.y}-${pad2(parsed.m)}-${pad2(parsed.d)}`
  }

  const raw = String(value).trim()
  if (!raw) return null

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw
  }

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
    const [d, m, y] = raw.split('/')
    return `${y}-${m}-${d}`
  }

  const date = new Date(raw)
  if (!Number.isNaN(date.getTime())) {
    return format(date, 'yyyy-MM-dd')
  }

  return null
}

async function runImportExcel() {
  if (!importFile.value) {
    toast.add({ title: 'Pilih file Excel terlebih dahulu', color: 'warning' })
    return
  }

  importLoading.value = true
  importSummary.value = null

  try {
    const XLSX = await import('xlsx')
    const buffer = await importFile.value.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: true })
    const sheetName = workbook.SheetNames[0]

    if (!sheetName) {
      throw new Error('Sheet pertama tidak ditemukan')
    }

    const sheet = workbook.Sheets[sheetName]
    if (!sheet) {
      throw new Error('Sheet pertama tidak ditemukan')
    }
    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: null })

    if (rows.length === 0) {
      throw new Error('File kosong, tidak ada data untuk diimpor')
    }

    const normalizedRows: Array<{ rowNo: number, slug: string, date: string, price: number }> = []
    const errors: string[] = []

    rows.forEach((row, index) => {
      const rowNo = index + 2
      const slugRaw = normalizeRowValue(row, ['food_slug', 'slug'])
      const dateRaw = normalizeRowValue(row, ['date', 'tanggal'])
      const priceRaw = normalizeRowValue(row, ['price', 'harga'])

      const slug = String(slugRaw ?? '').trim().toLowerCase()
      const date = normalizeDateInput(dateRaw, XLSX)
      const price = Number(priceRaw)

      if (!slug) {
        errors.push(`Baris ${rowNo}: food_slug kosong`)
        return
      }

      if (!date) {
        errors.push(`Baris ${rowNo}: format date tidak valid`)
        return
      }

      if (!Number.isFinite(price) || price < 0) {
        errors.push(`Baris ${rowNo}: price tidak valid`)
        return
      }

      normalizedRows.push({ rowNo, slug, date, price })
    })

    if (normalizedRows.length === 0) {
      importSummary.value = {
        total: rows.length,
        inserted: 0,
        updated: 0,
        failed: errors.length,
        errors: errors.slice(0, 20)
      }
      return
    }

    const uniqueSlugs = Array.from(new Set(normalizedRows.map(r => r.slug)))
    const { data: matchedFoods, error: foodMatchError } = await supabase
      .from('foods')
      .select('id, slug')
      .in('slug', uniqueSlugs)

    if (foodMatchError) throw foodMatchError

    const foodIdBySlug = new Map((matchedFoods ?? []).map(f => [f.slug, f.id]))

    let inserted = 0
    let updated = 0
    let failed = errors.length

    for (const row of normalizedRows) {
      const foodId = foodIdBySlug.get(row.slug)
      if (!foodId) {
        failed += 1
        errors.push(`Baris ${row.rowNo}: slug '${row.slug}' tidak ditemukan di master foods`)
        continue
      }

      const { data: existing, error: existingError } = await supabase
        .from('food_prices')
        .select('id')
        .eq('food_id', foodId)
        .eq('date', row.date)
        .limit(1)

      if (existingError) {
        failed += 1
        errors.push(`Baris ${row.rowNo}: gagal cek data existing (${existingError.message})`)
        continue
      }

      if ((existing ?? []).length > 0) {
        const id = existing?.[0]?.id
        if (!id) {
          failed += 1
          errors.push(`Baris ${row.rowNo}: data existing tidak valid (id kosong)`)
          continue
        }
        const { error: updateError } = await supabase
          .from('food_prices')
          .update({ price: row.price, updated_at: new Date().toISOString() })
          .eq('id', id)

        if (updateError) {
          failed += 1
          errors.push(`Baris ${row.rowNo}: gagal update (${updateError.message})`)
          continue
        }

        updated += 1
      } else {
        const { error: insertError } = await supabase
          .from('food_prices')
          .insert({ food_id: foodId, date: row.date, price: row.price })

        if (insertError) {
          failed += 1
          errors.push(`Baris ${row.rowNo}: gagal insert (${insertError.message})`)
          continue
        }

        inserted += 1
      }
    }

    importSummary.value = {
      total: rows.length,
      inserted,
      updated,
      failed,
      errors: errors.slice(0, 20)
    }

    await Promise.all([refreshLatest(), refreshTrend(), refreshMonthPrices()])

    if (failed === 0) {
      toast.add({ title: 'Import Excel berhasil', description: `${inserted} insert, ${updated} update`, color: 'success' })
    } else {
      toast.add({ title: 'Import selesai dengan catatan', description: `${failed} baris gagal`, color: 'warning' })
    }
  } catch (err: any) {
    toast.add({ title: 'Gagal import Excel', description: err?.message, color: 'error' })
  } finally {
    importLoading.value = false
  }
}

const detailPrice = computed(() => {
  const rows = [...(monthPrices.value ?? [])].sort((a, b) => b.date.localeCompare(a.date))
  const current = rows[0] ?? null
  const previous = rows[1] ?? null

  if (!current) {
    return {
      current: null,
      previous: null,
      nominalChange: null as number | null,
      percentChange: null as number | null
    }
  }

  const nominalChange = previous ? current.price - previous.price : null
  const percentChange = previous && previous.price !== 0
    ? ((current.price - previous.price) / previous.price) * 100
    : null

  return { current, previous, nominalChange, percentChange }
})
</script>

<template>
  <UDashboardPanel
    id="prices-food-list"
    :default-size="32"
    :min-size="24"
    :max-size="40"
    resizable
  >
    <UDashboardNavbar title="Food Prices" :ui="{ right: 'gap-1' }">
      <template #leading>
        <UDashboardSidebarCollapse />
      </template>
      <template #trailing>
        <UBadge :label="foodItems.length" variant="subtle" />
      </template>
      <template #right>
        <UButton
          icon="i-lucide-refresh-cw"
          color="neutral"
          variant="ghost"
          size="sm"
          :loading="foodsPending || latestPending"
          @click="refreshAll"
        />
        <UButton
          icon="i-lucide-plus"
          color="primary"
          variant="ghost"
          size="sm"
          @click="openCreateFood"
        />
      </template>
    </UDashboardNavbar>

    <div class="px-3 py-2 border-b border-default">
      <UInput
        v-model="search"
        icon="i-lucide-search"
        placeholder="Cari food atau slug..."
        size="sm"
      />
      <USelect
        v-model="selectedCategory"
        :items="categoryItems"
        placeholder="Semua kategori"
        class="mt-3"
        size="sm"
      />
    </div>

    <div class="overflow-y-auto flex-1">
      <div
        v-if="foodItems.length === 0"
        class="flex flex-col items-center justify-center py-14 gap-2 text-muted"
      >
        <UIcon name="i-lucide-utensils" class="size-10 text-dimmed" />
        <p class="text-sm">Belum ada data food</p>
      </div>

      <button
        v-for="food in foodItems"
        :key="food.id"
        class="group w-full px-4 py-3 border-b border-default text-left transition-colors hover:bg-elevated/60"
        :class="selectedFoodId === food.id ? 'bg-elevated' : ''"
        @click="selectFood(food.id)"
      >
        <div class="flex items-start gap-3">
          <div class="size-11 rounded-md overflow-hidden bg-muted shrink-0 flex items-center justify-center">
            <img
              v-if="food.image_url"
              :src="getFoodPriceImagePublicUrl(food.image_url) ?? food.image_url"
              class="size-full object-cover"
              :alt="food.name"
            >
            <UIcon v-else name="i-lucide-image" class="size-5 text-dimmed" />
          </div>

          <div class="min-w-0 flex-1">
            <p class="font-medium text-highlighted truncate">{{ food.name }}</p>
            <p class="text-xs text-muted">{{ food.category }} · {{ food.satuan }}</p>
            <div class="flex items-center gap-2 mt-1.5">
              <p class="text-sm font-semibold text-highlighted">
                {{ food.currentPrice != null ? `Rp ${Number(food.currentPrice).toLocaleString('id-ID')}` : '-' }}
              </p>
              <UBadge
                v-if="food.percentChange != null"
                size="xs"
                variant="soft"
                :color="food.percentChange >= 0 ? 'success' : 'error'"
              >
                {{ food.percentChange >= 0 ? '+' : '' }}{{ food.percentChange.toFixed(2) }}%
              </UBadge>
            </div>
          </div>
        </div>
      </button>
    </div>
  </UDashboardPanel>

  <UDashboardPanel id="prices-detail" class="flex-1">
    <template v-if="selectedFood">
      <UDashboardNavbar :title="selectedFood.name" :ui="{ right: 'gap-2' }">
        <template #right>
          <UButton size="sm" icon="i-lucide-file-spreadsheet" label="Import Excel" color="neutral" variant="soft" @click="importOpen = true" />
          <UButton size="sm" icon="i-lucide-plus" label="Tambah Harga" @click="openAddPrice" />
          <UDropdownMenu
            :items="[
              [{ label: 'Edit Food', icon: 'i-lucide-pencil', onSelect: () => openEditFood(selectedFood!) }],
              [{ label: 'Hapus Food', icon: 'i-lucide-trash-2', color: 'error', onSelect: () => openDeleteFood(selectedFood!) }]
            ]"
          >
            <UButton size="sm" icon="i-lucide-ellipsis" color="neutral" variant="ghost" />
          </UDropdownMenu>
        </template>
      </UDashboardNavbar>

      <div class="p-4 lg:p-5 space-y-4 overflow-y-auto">
        <UPageCard>
          <div class="grid md:grid-cols-3 gap-4">
            <div class="md:col-span-2 flex items-start gap-4">
              <div class="size-20 rounded-xl overflow-hidden bg-muted shrink-0 flex items-center justify-center">
                <img
                  v-if="selectedFood.image_url"
                  :src="getFoodPriceImagePublicUrl(selectedFood.image_url) ?? selectedFood.image_url"
                  class="size-full object-cover"
                  :alt="selectedFood.name"
                >
                <UIcon v-else name="i-lucide-image" class="size-8 text-dimmed" />
              </div>

              <div class="min-w-0">
                <p class="text-lg font-semibold text-highlighted truncate">{{ selectedFood.name }}</p>
                <p class="text-sm text-muted">{{ selectedFood.category }} · {{ selectedFood.satuan }}</p>
                <p class="text-xs text-muted mt-1">Slug: {{ selectedFood.slug }}</p>
              </div>
            </div>

            <div class="space-y-2">
              <div class="rounded-lg border border-default p-3">
                <p class="text-xs text-muted">Harga terakhir</p>
                <p class="text-lg font-semibold text-highlighted">
                  {{ detailPrice.current ? `Rp ${Number(detailPrice.current.price).toLocaleString('id-ID')}` : '-' }}
                </p>
              </div>
              <div class="rounded-lg border border-default p-3">
                <p class="text-xs text-muted">Perubahan dari sebelumnya</p>
                <p
                  class="text-base font-semibold"
                  :class="detailPrice.nominalChange != null && detailPrice.nominalChange >= 0 ? 'text-success' : 'text-error'"
                >
                  <template v-if="detailPrice.nominalChange != null">
                    {{ detailPrice.nominalChange >= 0 ? '+' : '' }}Rp {{ Number(detailPrice.nominalChange).toLocaleString('id-ID') }}
                    <span v-if="detailPrice.percentChange != null" class="text-xs text-muted ml-1">
                      ({{ detailPrice.percentChange >= 0 ? '+' : '' }}{{ detailPrice.percentChange.toFixed(2) }}%)
                    </span>
                  </template>
                  <template v-else>
                    -
                  </template>
                </p>
              </div>
            </div>
          </div>
        </UPageCard>

        <UPageCard :title="trendTitle" description="Grafik naik-turun harga berdasarkan periode yang dipilih.">
          <div class="flex flex-wrap gap-2 mb-4">
            <UButton
              v-for="item in trendPeriodItems"
              :key="item.value"
              size="xs"
              :variant="trendPeriodDays === item.value ? 'solid' : 'soft'"
              :color="trendPeriodDays === item.value ? 'primary' : 'neutral'"
              @click="trendPeriodDays = item.value"
            >
              {{ item.label }}
            </UButton>
          </div>

          <div v-if="trendPending" class="h-64 flex items-center justify-center">
            <UIcon name="i-lucide-loader-circle" class="size-8 animate-spin text-primary" />
          </div>

          <div v-else-if="chartRows.length === 0" class="h-64 flex items-center justify-center text-sm text-muted">
            Belum ada data tren 30 hari.
          </div>

          <ClientOnly v-else>
            <VisXYContainer :data="chartRows" class="h-64" :padding="{ top: 20 }">
              <VisLine :x="x" :y="y" color="var(--ui-primary)" />
              <VisArea :x="x" :y="y" color="var(--ui-primary)" :opacity="0.1" />
              <VisAxis type="x" :x="x" :tick-format="xTicks" />
              <VisCrosshair color="var(--ui-primary)" :template="tooltip" />
              <VisTooltip />
            </VisXYContainer>
          </ClientOnly>
        </UPageCard>

        <UPageCard title="Riwayat Harga (Semua Data)">
          <template #extra>
            <UButton size="xs" variant="ghost" color="neutral" icon="i-lucide-refresh-cw" :loading="monthPricesPending" @click="() => refreshMonthPrices()" />
          </template>

          <div v-if="monthPricesPending" class="space-y-2">
            <USkeleton class="h-12 w-full" />
            <USkeleton class="h-12 w-full" />
            <USkeleton class="h-12 w-full" />
          </div>

          <div v-else-if="monthPrices.length === 0" class="text-sm text-muted py-6 text-center">
            Belum ada riwayat harga untuk food ini.
          </div>

          <div v-else class="space-y-3">
            <div class="rounded-lg border border-default overflow-hidden">
            <table class="min-w-full text-sm">
              <thead class="bg-elevated/40">
                <tr>
                  <th class="px-3 py-2 text-left font-medium text-muted">Tanggal</th>
                  <th class="px-3 py-2 text-left font-medium text-muted">Harga</th>
                  <th class="px-3 py-2 text-right font-medium text-muted">Aksi</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in paginatedPrices" :key="item.id" class="border-t border-default">
                  <td class="px-3 py-2">{{ format(new Date(item.date), 'dd MMM yyyy', { locale: localeId }) }}</td>
                  <td class="px-3 py-2 font-medium">Rp {{ Number(item.price).toLocaleString('id-ID') }}</td>
                  <td class="px-3 py-2">
                    <div class="flex justify-end gap-1">
                      <UButton size="xs" icon="i-lucide-pencil" color="neutral" variant="ghost" @click="openEditPrice(item)" />
                      <UButton size="xs" icon="i-lucide-trash-2" color="error" variant="ghost" @click="openDeletePrice(item)" />
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
            </div>

            <div class="flex items-center justify-between gap-3">
              <p class="text-xs text-muted">
                Menampilkan {{ paginatedPrices.length }} dari {{ totalPriceItems }} data
              </p>
              <div class="flex items-center gap-2">
                <UButton
                  size="xs"
                  color="neutral"
                  variant="soft"
                  icon="i-lucide-chevron-left"
                  :disabled="pricePage <= 1"
                  @click="prevPricePage"
                />
                <span class="text-xs text-muted">Halaman {{ pricePage }} / {{ totalPricePages }}</span>
                <UButton
                  size="xs"
                  color="neutral"
                  variant="soft"
                  icon="i-lucide-chevron-right"
                  :disabled="pricePage >= totalPricePages"
                  @click="nextPricePage"
                />
              </div>
            </div>
          </div>
        </UPageCard>
      </div>
    </template>

    <div v-else class="h-full flex items-center justify-center px-6">
      <div class="text-center max-w-sm">
        <div class="size-20 rounded-2xl bg-elevated mx-auto flex items-center justify-center mb-4">
          <UIcon name="i-lucide-chart-column" class="size-10 text-dimmed" />
        </div>
        <p class="font-semibold text-highlighted">Pilih Food di Panel Kiri</p>
        <p class="text-sm text-muted mt-1">Klik salah satu data food untuk melihat detail harga dan histori 30 hari.</p>
      </div>
    </div>
  </UDashboardPanel>

  <ClientOnly>
    <USlideover v-if="isMobile" v-model:open="detailPanelOpen">
      <template #content>
        <div class="h-full flex flex-col">
          <div class="px-4 py-3 border-b border-default flex items-center justify-between">
            <p class="font-semibold text-highlighted">Detail Food</p>
            <UButton size="sm" icon="i-lucide-x" color="neutral" variant="ghost" @click="detailPanelOpen = false" />
          </div>
          <div class="p-4 overflow-y-auto space-y-3">
            <p class="text-sm text-muted">Gunakan tampilan desktop untuk pengalaman panel penuh.</p>
          </div>
        </div>
      </template>
    </USlideover>
  </ClientOnly>

  <UModal
    v-model:open="foodModalOpen"
    :title="editingFood ? 'Edit Food' : 'Tambah Food Baru'"
    :description="editingFood ? 'Perbarui informasi master food.' : 'Buat data master food yang akan dipakai pada Food Prices.'"
  >
    <template #body>
      <UForm :schema="foodSchema" :state="foodForm" class="space-y-4" @submit="submitFood">
        <UFormField name="name" label="Nama Food *">
          <UInput v-model="foodForm.name" class="w-full" placeholder="Contoh: Cabai Merah" @input="onFoodNameInput" />
        </UFormField>

        <UFormField name="slug" label="Slug *">
          <UInput v-model="foodForm.slug" class="w-full" placeholder="cabai-merah" @input="() => { foodSlugEdited = true }" />
        </UFormField>

        <div class="grid grid-cols-2 gap-3">
          <UFormField name="category" label="Kategori *">
            <UInput v-model="foodForm.category" class="w-full" placeholder="sayuran" />
          </UFormField>
          <UFormField name="satuan" label="Satuan *">
            <UInput v-model="foodForm.satuan" class="w-full" placeholder="kg" />
          </UFormField>
        </div>

        <UFormField name="description" label="Deskripsi">
          <UTextarea v-model="foodForm.description" :rows="2" class="w-full" />
        </UFormField>

        <UFormField name="specifications" label="Spesifikasi">
          <UTextarea v-model="foodForm.specifications" :rows="2" class="w-full" />
        </UFormField>

        <UFormField name="tagsText" label="Tags">
          <UInput v-model="foodForm.tagsText" class="w-full" placeholder="pedas, segar, premium" />
          <template #hint>
            Pisahkan dengan koma.
          </template>
        </UFormField>

        <UFormField label="Gambar Food">
          <div class="space-y-3">
            <div v-if="foodImagePreview" class="relative rounded-lg overflow-hidden aspect-video bg-muted">
              <img :src="foodImagePreview" class="size-full object-cover" alt="Food preview">
              <UButton
                icon="i-lucide-x"
                color="error"
                variant="solid"
                size="xs"
                class="absolute top-2 right-2"
                @click="foodImageFile = null; foodImagePreview = null"
              />
            </div>

            <UFileUpload
              v-if="!foodImagePreview"
              v-model="foodImageFile"
              accept="image/*"
              label="Upload gambar"
              description="PNG, JPG, WebP · maks 5MB"
              :preview="false"
            >
              <template #leading>
                <UIcon name="i-lucide-image" class="size-7 text-muted" />
              </template>
            </UFileUpload>
          </div>
        </UFormField>

        <div class="flex justify-end gap-2 pt-2">
          <UButton label="Batal" color="neutral" variant="subtle" :disabled="savingFood" @click="foodModalOpen = false" />
          <UButton :label="editingFood ? 'Simpan Perubahan' : 'Tambah Food'" type="submit" :loading="savingFood" />
        </div>
      </UForm>
    </template>
  </UModal>

  <UModal
    v-model:open="foodDeleteOpen"
    title="Hapus Food?"
    :description="`Semua riwayat harga untuk ${editingFood?.name ?? '-'} juga akan dihapus.`"
  >
    <template #body>
      <div class="flex justify-end gap-2">
        <UButton label="Batal" color="neutral" variant="subtle" :disabled="deletingFood" @click="foodDeleteOpen = false" />
        <UButton label="Hapus" color="error" icon="i-lucide-trash-2" :loading="deletingFood" @click="confirmDeleteFood" />
      </div>
    </template>
  </UModal>

  <UModal
    v-model:open="priceModalOpen"
    :title="editingPrice ? 'Edit Harga' : 'Tambah Harga Baru'"
    :description="selectedFood ? `Food: ${selectedFood.name}` : 'Pilih food terlebih dahulu'"
  >
    <template #body>
      <UForm :schema="priceSchema" :state="priceForm" class="space-y-4" @submit="submitPrice">
        <UFormField name="date" label="Tanggal *">
          <UInput v-model="priceForm.date" type="date" class="w-full" />
        </UFormField>

        <UFormField name="price" label="Harga *">
          <UInputNumber v-model="priceForm.price" :min="0" class="w-full" :format-options="{ style: 'decimal', maximumFractionDigits: 0 }" />
        </UFormField>

        <div class="flex justify-end gap-2 pt-2">
          <UButton label="Batal" color="neutral" variant="subtle" :disabled="savingPrice" @click="priceModalOpen = false" />
          <UButton :label="editingPrice ? 'Simpan' : 'Tambah Harga'" type="submit" :loading="savingPrice" />
        </div>
      </UForm>
    </template>
  </UModal>

  <UModal
    v-model:open="priceDeleteOpen"
    title="Hapus Data Harga?"
    :description="editingPrice ? `Tanggal ${format(new Date(editingPrice.date), 'dd MMM yyyy', { locale: localeId })}` : ''"
  >
    <template #body>
      <div class="flex justify-end gap-2">
        <UButton label="Batal" color="neutral" variant="subtle" :disabled="deletingPrice" @click="priceDeleteOpen = false" />
        <UButton label="Hapus" color="error" icon="i-lucide-trash-2" :loading="deletingPrice" @click="confirmDeletePrice" />
      </div>
    </template>
  </UModal>

  <UModal
    v-model:open="importOpen"
    title="Import Harga via Excel"
    description="Format kolom: food_slug, date, price. Jika data food+date sudah ada, harga akan di-update."
  >
    <template #body>
      <div class="space-y-4">
        <UAlert
          color="info"
          variant="subtle"
          title="Format wajib"
          description="Pastikan sheet pertama berisi header: food_slug, date, price"
        />

        <div class="flex gap-2">
          <UButton label="Download Template" icon="i-lucide-download" color="neutral" variant="soft" @click="downloadTemplate" />
        </div>

        <UFileUpload
          v-model="importFile"
          accept=".xlsx,.xls"
          label="Pilih file Excel"
          description="Hanya file .xlsx atau .xls"
          :preview="false"
        >
          <template #leading>
            <UIcon name="i-lucide-file-spreadsheet" class="size-7 text-muted" />
          </template>
        </UFileUpload>

        <div class="flex justify-end gap-2 pt-2">
          <UButton label="Batal" color="neutral" variant="subtle" :disabled="importLoading" @click="importOpen = false" />
          <UButton label="Import" icon="i-lucide-upload" :loading="importLoading" @click="runImportExcel" />
        </div>

        <div v-if="importSummary" class="rounded-lg border border-default p-3 space-y-2 text-sm">
          <p class="font-medium text-highlighted">Ringkasan Import</p>
          <div class="grid grid-cols-2 gap-2">
            <p>Total baris: {{ importSummary.total }}</p>
            <p>Insert: {{ importSummary.inserted }}</p>
            <p>Update: {{ importSummary.updated }}</p>
            <p>Gagal: {{ importSummary.failed }}</p>
          </div>

          <div v-if="importSummary.errors.length > 0" class="rounded-md bg-muted/60 p-2">
            <p class="font-medium mb-1">Contoh error:</p>
            <ul class="list-disc list-inside space-y-1 text-xs text-muted">
              <li v-for="(err, idx) in importSummary.errors" :key="idx">{{ err }}</li>
            </ul>
          </div>
        </div>
      </div>
    </template>
  </UModal>
</template>

<style scoped>
.unovis-xy-container {
  --vis-crosshair-line-stroke-color: var(--ui-primary);
  --vis-axis-grid-color: var(--ui-border);
  --vis-axis-tick-color: var(--ui-border);
  --vis-axis-tick-label-color: var(--ui-text-dimmed);
  --vis-tooltip-background-color: var(--ui-bg);
  --vis-tooltip-border-color: var(--ui-border);
  --vis-tooltip-text-color: var(--ui-text-highlighted);
}
</style>
