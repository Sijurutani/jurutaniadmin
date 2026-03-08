<script lang="ts" setup>
import type { QueryData } from '@supabase/supabase-js'

const page = defineModel('page', { default: 1, type: Number })
const limit = defineModel('limit', { default: 15, type: Number })

const props = withDefaults(defineProps<{
  query?: any
  total?: number | null
  label?: string
}>(), {
  total: 0,
  label: 'data'
})

const totalPages = computed(() => Math.ceil((props.total ?? 0) / limit.value))

function flattenObject(obj: object, parentKey?: string): Record<string, unknown> {
  let result = {}
  Object.entries(obj).forEach(([key, value]) => {
    const _key = parentKey ? `${parentKey}.${key}` : key
    if (typeof value === 'object' && value !== null) {
      result = { ...result, ...flattenObject(value, _key) }
    }
    else {
      (result as Record<string, unknown>)[_key] = value
    }
  })
  return result
}

async function exportCSV() {
  if (!props.query) return
  try {
    const { data, error } = await (props.query as Promise<QueryData<unknown>>)
    if (error) throw error

    if (data && (data as unknown[]).length > 0) {
      const csvContent = [
        Object.keys(flattenObject(data[0] as object)).join(','),
        ...(data as unknown[]).map(row =>
          Object.values(flattenObject(row as object))
            .map(value => `"${String(value).replace(/"/g, '""')}"`)
            .join(',')
        )
      ].join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.setAttribute('href', url)
      link.setAttribute('download', 'data.csv')
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    }
  }
  catch (err) {
    console.error('Export CSV error:', err)
  }
}
</script>

<template>
  <div class="flex items-center justify-between gap-1.5 px-4 py-2 border-t border-default sm:px-6 overflow-x-auto">
    <UButton
      v-if="page > 1"
      size="sm"
      icon="i-lucide-arrow-left"
      variant="outline"
      @click="page -= 1"
    />
    <div class="text-xs text-muted">
      halaman
    </div>
    <USelectMenu
      v-model="page"
      :items="Array.from({ length: totalPages || 1 }, (_, i) => i + 1)"
      class="w-fit"
      size="sm"
    />
    <div class="text-xs text-muted text-nowrap">
      dari {{ totalPages }}
    </div>
    <UButton
      v-if="page < totalPages"
      size="sm"
      icon="i-lucide-arrow-right"
      variant="outline"
      @click="page += 1"
    />
    <USelect
      v-model="limit"
      :items="[15, 25, 50, 100]"
      class="w-fit"
      size="sm"
      :ui="{ base: 'text-nowrap pe-2.5', trailing: 'hidden' }"
    >
      <template #default="{ modelValue }">
        {{ modelValue }} baris
      </template>
    </USelect>
    <div class="text-xs text-muted text-nowrap">
      total {{ props.total }} {{ props.label }}
    </div>
    <div class="grow" />
    <UButton
      v-if="props.query"
      size="sm"
      icon="i-lucide-file-text"
      variant="outline"
      label="Export CSV"
      @click="exportCSV"
    />
  </div>
</template>
