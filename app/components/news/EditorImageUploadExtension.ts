import { Node, mergeAttributes } from '@tiptap/core'
import type { NodeViewRenderer } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import EditorImageUploadNode from './EditorImageUploadNode.vue'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    imageUpload: {
      insertImageUpload: () => ReturnType
    }
  }
}

/**
 * Creates a Tiptap image-upload block extension.
 * `newsId` is stored in extension storage so the NodeView can access it
 * and upload directly to the correct Supabase Storage path.
 */
export const createImageUploadExtension = (newsId: string) =>
  Node.create({
    name: 'imageUpload',
    group: 'block',
    atom: true,
    draggable: true,

    addStorage() {
      return { newsId }
    },

    addAttributes() {
      return {}
    },

    parseHTML() {
      return [{ tag: 'div[data-type="image-upload"]' }]
    },

    renderHTML({ HTMLAttributes }) {
      return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'image-upload' })]
    },

    addNodeView(): NodeViewRenderer {
      return VueNodeViewRenderer(EditorImageUploadNode as any)
    },

    addCommands() {
      return {
        insertImageUpload:
          () =>
            ({ commands }) =>
              commands.insertContent({ type: this.name })
      }
    }
  })
