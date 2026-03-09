<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { EmbedItem } from '~/utils/embed'

useHead({ title: 'Buat Meeting – Jurutani Admin' })

const supabase = useSupabaseClient()
const toast = useToast()
const router = useRouter()

// ─── Schema ───────────────────────────────────────────────────────────────────
const schema = z.object({
  title: z.string().min(1, 'Judul wajib diisi').max(200),
  content: z.string().optional()
})

type Schema = z.output<typeof schema>

// ─── State ───────────────────────────────────────────────────────────────────
const form = reactive<Schema>({
  title: '',
  content: ''
})

const embeds = ref<EmbedItem[]>([])
const saving = ref(false)
const embedError = ref('')

// ─── Submit ───────────────────────────────────────────────────────────────────
async function onSubmit(event: FormSubmitEvent<Schema>) {
  embedError.value = ''
  if (embeds.value.length === 0) {
    embedError.value = 'Tambahkan minimal 1 embed sosial media'
    return
  }

  saving.value = true
  try {
    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase.from('meeting_schedules').insert({
      title: event.data.title,
      content: event.data.content || null,
      embeds: embeds.value,
      author_id: user?.id ?? null
    })

    if (error) throw error

    toast.add({ title: 'Meeting berhasil dibuat', color: 'success' })
    router.push('/meetings')
  } catch (err: any) {
    toast.add({ title: 'Gagal menyimpan', description: err.message, color: 'error' })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UDashboardPanel id="meetings-create">
    <template #header>
      <UDashboardNavbar title="Buat Meeting Schedule">
        <template #leading>
          <UButton
            to="/meetings"
            icon="i-lucide-arrow-left"
            color="neutral"
            variant="ghost"
            size="sm"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <!-- ── Left: Form ─────────────────────────────────────── -->
        <div>
          <UForm :schema="schema" :state="form" class="space-y-6" @submit="onSubmit">
            <UFormField label="Judul Meeting" name="title" required>
              <UInput
                v-model="form.title"
                placeholder="Contoh: Pertemuan Penyuluh Bulan Maret 2026"
                class="w-full"
              />
            </UFormField>

            <!-- Embeds manager -->
            <div class="space-y-2">
              <label class="block text-sm font-medium text-highlighted">
                Embed Sosial Media
                <span class="text-error-500 ml-0.5">*</span>
              </label>
              <MeetingsEmbedManager v-model="embeds" />
              <p v-if="embedError" class="text-sm text-error-500">{{ embedError }}</p>
            </div>

            <UFormField label="Catatan Tambahan" name="content" hint="Opsional">
              <UTextarea
                v-model="form.content"
                placeholder="Catatan atau keterangan tambahan mengenai meeting ini..."
                :rows="4"
                class="w-full"
              />
            </UFormField>

            <div class="flex items-center justify-end gap-3 pt-2 border-t border-default">
              <UButton to="/meetings" color="neutral" variant="subtle" label="Batal" />
              <UButton
                type="submit"
                icon="i-lucide-save"
                label="Simpan Meeting"
                :loading="saving"
              />
            </div>
          </UForm>
        </div>

        <!-- ── Right: Live Preview ────────────────────────────── -->
        <div class="lg:sticky lg:top-4">
          <div class="flex items-center gap-2 mb-4">
            <UIcon name="i-lucide-layout-grid" class="size-4 text-muted" />
            <p class="text-sm font-semibold text-highlighted">Live Preview</p>
            <UBadge v-if="embeds.length" variant="soft" color="primary" size="sm">
              {{ embeds.length }}
            </UBadge>
          </div>

          <!-- Empty state -->
          <div
            v-if="embeds.length === 0"
            class="flex flex-col items-center justify-center gap-4 py-16 rounded-2xl border-2 border-dashed border-default text-center"
          >
            <div class="size-14 rounded-full bg-elevated flex items-center justify-center">
              <UIcon name="i-lucide-instagram" class="size-7 text-muted" />
            </div>
            <div>
              <p class="text-sm font-medium text-highlighted">Belum ada embed</p>
              <p class="text-xs text-muted mt-1">
                Tambahkan URL postingan sosial media<br>untuk melihat preview di sini
              </p>
            </div>
          </div>

          <!-- Canvas previews -->
          <div v-else class="space-y-6 max-h-[calc(100vh-10rem)] overflow-y-auto pr-1">
            <MeetingsEmbedCanvas
              v-for="embed in embeds"
              :key="embed.id"
              :embed="embed"
            />
          </div>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>

