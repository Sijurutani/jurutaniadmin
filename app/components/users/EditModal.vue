<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { Database } from '~/types/database.types'

type ProfileRow = Database['public']['Tables']['profiles']['Row']

const props = defineProps<{
  user: ProfileRow | null
}>()

const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ saved: [] }>()

const supabase = useSupabaseClient()
const toast = useToast()
const loading = ref(false)

const schema = z.object({
  full_name: z.string().min(1, 'Nama wajib diisi').max(100),
  username: z.string().min(3, 'Minimal 3 karakter').max(50).optional().or(z.literal('')),
  phone: z.string().max(20).optional().or(z.literal('')),
  bio: z.string().max(500).optional().or(z.literal('')),
  address: z.string().max(200).optional().or(z.literal('')),
  birth_date: z.string().optional().or(z.literal('')),
  website: z.string().url('Format URL tidak valid').optional().or(z.literal('')),
  role: z.string().min(1, 'Role wajib dipilih'),
  is_admin: z.boolean()
})

type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({
  full_name: '',
  username: '',
  phone: '',
  bio: '',
  address: '',
  birth_date: '',
  website: '',
  role: 'petani',
  is_admin: false
})

const roleOptions = Enum.UserRole.map(r => ({
  label: r.label,
  value: r.value,
  icon: r.icon
}))

watch(
  () => props.user,
  (u) => {
    if (u) {
      state.full_name = u.full_name ?? ''
      state.username = u.username ?? ''
      state.phone = u.phone ?? ''
      state.bio = u.bio ?? ''
      state.address = u.address ?? ''
      state.birth_date = u.birth_date ?? ''
      state.website = u.website ?? ''
      state.role = u.role ?? 'petani'
      state.is_admin = u.is_admin ?? false
    }
  },
  { immediate: true }
)

async function onSubmit(event: FormSubmitEvent<Schema>) {
  if (!props.user) return
  loading.value = true
  try {
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: event.data.full_name,
        username: event.data.username || null,
        phone: event.data.phone || null,
        bio: event.data.bio || null,
        role: event.data.role,
        is_admin: event.data.is_admin,
        address: event.data.address || null,
        birth_date: event.data.birth_date || null,
        website: event.data.website || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', props.user.id)

    if (error) throw error
    toast.add({ title: 'Profil user diperbarui', color: 'success', duration: 2000 })
    emit('saved')
    open.value = false
  } catch (err: any) {
    toast.add({ title: 'Gagal menyimpan', description: err.message, color: 'error' })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    title="Edit User"
    description="Perbarui informasi dan role pengguna"
  >
    <template #body>
      <div v-if="user" class="flex items-center gap-3 mb-5 p-3 rounded-lg bg-elevated">
        <UAvatar
          :src="user.avatar_url ?? undefined"
          :alt="user.full_name ?? user.username ?? 'User'"
          size="md"
        />
        <div class="min-w-0">
          <p class="font-medium text-highlighted truncate">
            {{ user.full_name ?? user.username ?? 'No name' }}
          </p>
          <p class="text-xs text-muted truncate">
            {{ user.email ?? user.id }}
          </p>
        </div>
      </div>

      <UForm :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
        <UFormField label="Nama Lengkap" name="full_name" required>
          <UInput v-model="state.full_name" placeholder="Nama lengkap..." class="w-full" />
        </UFormField>

        <UFormField label="Username" name="username">
          <UInput v-model="state.username" placeholder="username..." class="w-full" />
        </UFormField>

        <UFormField label="No. Telepon" name="phone">
          <UInput v-model="state.phone" placeholder="08xxxxxxxxxx" class="w-full" leading-icon="i-lucide-phone" />
        </UFormField>

        <UFormField label="Bio" name="bio">
          <UTextarea
            v-model="state.bio"
            placeholder="Deskripsi singkat tentang user..."
            :rows="3"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Alamat" name="address">
          <UTextarea
            v-model="state.address"
            placeholder="Alamat lengkap..."
            :rows="2"
            class="w-full"
          />
        </UFormField>

        <div class="grid grid-cols-2 gap-4">
          <UFormField label="Tanggal Lahir" name="birth_date">
            <UInput
              v-model="state.birth_date"
              type="date"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Website" name="website">
            <UInput
              v-model="state.website"
              placeholder="https://..."
              leading-icon="i-lucide-globe"
              class="w-full"
            />
          </UFormField>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <UFormField label="Role" name="role" required>
            <USelect
              v-model="state.role"
              :items="roleOptions"
              value-key="value"
              label-key="label"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Admin" name="is_admin">
            <div class="flex items-center gap-2 mt-1.5">
              <USwitch v-model="state.is_admin" />
              <span class="text-sm text-muted">
                {{ state.is_admin ? 'Akses admin aktif' : 'Bukan admin' }}
              </span>
            </div>
          </UFormField>
        </div>

        <div class="flex justify-end gap-2 pt-2">
          <UButton
            label="Batal"
            color="neutral"
            variant="subtle"
            :disabled="loading"
            @click="open = false"
          />
          <UButton
            label="Simpan Perubahan"
            color="primary"
            type="submit"
            :loading="loading"
          />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
