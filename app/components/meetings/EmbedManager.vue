<script setup lang="ts">
import type { EmbedItem } from '~/utils/embed'

const props = defineProps<{
  modelValue: EmbedItem[]
}>()

const emit = defineEmits<{
  'update:modelValue': [items: EmbedItem[]]
}>()

const toast = useToast()

const urlInput = ref('')
const selectedPlatform = ref<string>('')
const addError = ref('')

const platformOptions = Enum.EmbedPlatforms.map(p => ({ label: p.label, value: p.value }))

// Auto-detect platform when URL changes
watch(urlInput, (val) => {
  addError.value = ''
  if (!val) { selectedPlatform.value = ''; return }
  const detected = detectPlatform(val)
  if (detected) selectedPlatform.value = detected
  else selectedPlatform.value = ''
})

function addEmbed() {
  const url = urlInput.value.trim()
  if (!url) { addError.value = 'URL wajib diisi'; return }

  try { new URL(url) } catch {
    addError.value = 'URL tidak valid'
    return
  }

  const platform = selectedPlatform.value
  if (!platform) { addError.value = 'Pilih platform terlebih dahulu'; return }

  const newItem: EmbedItem = {
    id: crypto.randomUUID(),
    platform,
    url,
    order: props.modelValue.length
  }

  emit('update:modelValue', [...props.modelValue, newItem])
  urlInput.value = ''
  selectedPlatform.value = ''
  addError.value = ''
  toast.add({ title: 'Embed ditambahkan', color: 'success', duration: 2000 })
}

function removeEmbed(id: string) {
  const updated = props.modelValue
    .filter(e => e.id !== id)
    .map((e, i) => ({ ...e, order: i }))
  emit('update:modelValue', updated)
}

function moveUp(index: number) {
  if (index === 0) return
  const arr = [...props.modelValue]
  const a = arr[index - 1] as EmbedItem
  const b = arr[index] as EmbedItem
  arr[index - 1] = b
  arr[index] = a
  emit('update:modelValue', arr.map((e, i) => ({ ...e, order: i })))
}

function moveDown(index: number) {
  if (index === props.modelValue.length - 1) return
  const arr = [...props.modelValue]
  const a = arr[index] as EmbedItem
  const b = arr[index + 1] as EmbedItem
  arr[index] = b
  arr[index + 1] = a
  emit('update:modelValue', arr.map((e, i) => ({ ...e, order: i })))
}
</script>

<template>
  <div class="space-y-3">
    <!-- Existing embeds list -->
    <div v-if="modelValue.length > 0" class="space-y-2">
      <div
        v-for="(embed, idx) in modelValue"
        :key="embed.id"
        class="flex items-center gap-3 px-3 py-2 rounded-lg border border-default bg-elevated"
      >
        <!-- Platform icon -->
        <UIcon
          :name="Enum.EmbedPlatforms.find(p => p.value === embed.platform)?.icon ?? 'i-lucide-globe'"
          class="size-4 shrink-0 text-muted"
        />

        <!-- Platform label + URL -->
        <div class="flex-1 min-w-0">
          <p class="text-xs font-medium text-highlighted">
            {{ Enum.EmbedPlatforms.find(p => p.value === embed.platform)?.label ?? embed.platform }}
          </p>
          <p class="text-xs text-muted truncate">{{ embed.url }}</p>
        </div>

        <!-- Reorder buttons -->
        <div class="flex items-center gap-1 shrink-0">
          <UButton
            icon="i-lucide-chevron-up"
            color="neutral"
            variant="ghost"
            size="xs"
            :disabled="idx === 0"
            @click="moveUp(idx)"
          />
          <UButton
            icon="i-lucide-chevron-down"
            color="neutral"
            variant="ghost"
            size="xs"
            :disabled="idx === modelValue.length - 1"
            @click="moveDown(idx)"
          />
          <UButton
            icon="i-lucide-trash-2"
            color="error"
            variant="ghost"
            size="xs"
            @click="removeEmbed(embed.id)"
          />
        </div>
      </div>
    </div>

    <p v-else class="text-sm text-muted italic">Belum ada embed. Tambahkan postingan sosial media di bawah.</p>

    <!-- Add new embed -->
    <div class="rounded-lg border border-dashed border-default p-4 space-y-3">
      <p class="text-xs font-semibold text-highlighted uppercase tracking-wide">Tambah Embed</p>

      <div class="flex flex-col sm:flex-row gap-2">
        <UInput
          v-model="urlInput"
          placeholder="https://www.instagram.com/reel/..."
          icon="i-lucide-link"
          class="flex-1"
          @keydown.enter.prevent="addEmbed"
        />
        <USelectMenu
          v-model="selectedPlatform"
          :items="platformOptions"
          placeholder="Platform"
          value-key="value"
          class="min-w-44"
        />
        <UButton
          icon="i-lucide-plus"
          label="Tambah"
          :disabled="!urlInput || !selectedPlatform"
          @click="addEmbed"
        />
      </div>

      <p v-if="addError" class="text-xs text-error-500">{{ addError }}</p>
      <p v-else class="text-xs text-muted">
        Platform akan terdeteksi otomatis dari URL. Anda juga bisa memilih manual.
      </p>
    </div>
  </div>
</template>
