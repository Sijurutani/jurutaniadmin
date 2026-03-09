<script setup lang="ts">
import type { EditorSuggestionMenuItem } from '@nuxt/ui'
import { createImageUploadExtension } from '~/components/news/EditorImageUploadExtension'

const props = defineProps<{
  /** Jika diisi, aktifkan image upload. Jika kosong, editor tanpa upload gambar. */
  newsId?: string
  placeholder?: string
}>()

const content = defineModel<Record<string, any> | null>({ required: true })

// ─── Extensions (image upload hanya jika newsId ada) ─────────────────────────

const editorExtensions = computed(() =>
  props.newsId ? [createImageUploadExtension(props.newsId)] as any[] : []
)

// ─── Handlers (image upload hanya jika newsId ada) ───────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const editorHandlers = computed<Record<string, any>>(() =>
  props.newsId
    ? {
        imageUpload: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          canExecute: (editor: any) => editor.can().insertContent({ type: 'imageUpload' }),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          execute: (editor: any) => editor.chain().focus().insertContent({ type: 'imageUpload' }),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          isActive: (editor: any) => editor.isActive('imageUpload'),
          isDisabled: undefined
        }
      }
    : {}
)

// ─── Toolbar ─────────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toolbarItems = computed<any[][]>(() => [
  // Image upload button — hanya tampil jika newsId ada
  ...(props.newsId
    ? [[{ kind: 'imageUpload', icon: 'i-lucide-image', label: 'Upload Gambar', variant: 'soft' }]]
    : []
  ),
  [{
    icon: 'i-lucide-heading',
    content: { align: 'start' },
    items: [
      { kind: 'heading', level: 1, icon: 'i-lucide-heading-1', label: 'Heading 1' },
      { kind: 'heading', level: 2, icon: 'i-lucide-heading-2', label: 'Heading 2' },
      { kind: 'heading', level: 3, icon: 'i-lucide-heading-3', label: 'Heading 3' }
    ]
  }],
  [
    { kind: 'mark', mark: 'bold', icon: 'i-lucide-bold' },
    { kind: 'mark', mark: 'italic', icon: 'i-lucide-italic' },
    { kind: 'mark', mark: 'underline', icon: 'i-lucide-underline' },
    { kind: 'mark', mark: 'strike', icon: 'i-lucide-strikethrough' },
    { kind: 'mark', mark: 'code', icon: 'i-lucide-code' }
  ],
  [
    { kind: 'bulletList', icon: 'i-lucide-list' },
    { kind: 'orderedList', icon: 'i-lucide-list-ordered' },
    { kind: 'blockquote', icon: 'i-lucide-quote' },
    { kind: 'codeBlock', icon: 'i-lucide-square-code' },
    { kind: 'horizontalRule', icon: 'i-lucide-separator-horizontal' }
  ],
  [{ kind: 'link', icon: 'i-lucide-link' }],
  [
    { kind: 'undo', icon: 'i-lucide-undo-2' },
    { kind: 'redo', icon: 'i-lucide-redo-2' }
  ]
])

// ─── Suggestion menu ─────────────────────────────────────────────────────────
const suggestionItems: EditorSuggestionMenuItem[][] = [
  [
    { type: 'label', label: 'Teks' },
    { kind: 'paragraph', label: 'Paragraf', icon: 'i-lucide-type' },
    { kind: 'heading', level: 1, label: 'Heading 1', icon: 'i-lucide-heading-1' },
    { kind: 'heading', level: 2, label: 'Heading 2', icon: 'i-lucide-heading-2' },
    { kind: 'heading', level: 3, label: 'Heading 3', icon: 'i-lucide-heading-3' }
  ],
  [
    { type: 'label', label: 'List' },
    { kind: 'bulletList', label: 'Bullet List', icon: 'i-lucide-list' },
    { kind: 'orderedList', label: 'Numbered List', icon: 'i-lucide-list-ordered' }
  ],
  [
    { type: 'label', label: 'Insert' },
    { kind: 'blockquote', label: 'Blockquote', icon: 'i-lucide-text-quote' },
    { kind: 'codeBlock', label: 'Code Block', icon: 'i-lucide-square-code' },
    { kind: 'horizontalRule', label: 'Divider', icon: 'i-lucide-separator-horizontal' }
  ]
]
</script>

<template>
  <div class="border border-muted rounded-lg overflow-hidden min-h-64">
    <UEditor
      v-slot="{ editor }"
      v-model="content"
      content-type="json"
      :extensions="editorExtensions"
      :handlers="editorHandlers"
      :placeholder="placeholder ?? 'Mulai menulis...'"
      class="min-h-60"
    >
      <UEditorToolbar
        :editor="editor"
        :items="toolbarItems"
        class="border-b border-muted py-1.5 px-2 overflow-x-auto"
      />
      <UEditorSuggestionMenu :editor="editor" :items="suggestionItems" />
    </UEditor>
  </div>
</template>
