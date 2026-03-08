<script setup lang="ts">
import type { NodeViewProps } from '@tiptap/vue-3'
import { NodeViewWrapper } from '@tiptap/vue-3'

const props = defineProps<NodeViewProps>()

const file = ref<File | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

const newsId = computed(() => (props.extension as any).storage?.newsId ?? 'temp')

watch(file, async (newFile) => {
  if (!newFile) return
  if (newFile.size > 5 * 1024 * 1024) {
    error.value = 'File too large (max 5MB)'
    return
  }

  loading.value = true
  error.value = null

  try {
    const url = await uploadNewsFile('gallery', newsId.value, newFile)
    const pos = props.getPos()
    if (typeof pos !== 'number') return

    ;(props.editor.chain() as any)
      .focus()
      .deleteRange({ from: pos, to: pos + 1 })
      .setImage({ src: url })
      .run()
  } catch (err: any) {
    error.value = err.message ?? 'Upload failed'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <NodeViewWrapper>
    <div class="my-4 rounded-xl border-2 border-dashed border-muted overflow-hidden">
      <div
        v-if="loading"
        class="flex flex-col items-center justify-center gap-2 py-10 text-muted"
      >
        <UIcon name="i-lucide-loader-circle" class="size-8 animate-spin text-primary" />
        <span class="text-sm">Uploading image...</span>
      </div>

      <div v-else-if="error" class="flex flex-col items-center gap-2 py-6 text-center">
        <UIcon name="i-lucide-triangle-alert" class="size-6 text-error" />
        <p class="text-sm text-error">{{ error }}</p>
        <UButton size="sm" variant="ghost" label="Try again" @click="error = null; file = null" />
      </div>

      <UFileUpload
        v-else
        v-model="file"
        accept="image/*"
        description="PNG, JPG, WebP · max 5MB"
        label="Upload image"
        :preview="false"
        class="border-0 rounded-none"
      >
        <template #leading>
          <UIcon name="i-lucide-image" class="size-7 text-muted" />
        </template>
      </UFileUpload>
    </div>
  </NodeViewWrapper>
</template>
