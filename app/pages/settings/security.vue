<script setup lang="ts">
import * as z from 'zod'
import type { FormError, FormSubmitEvent } from '@nuxt/ui'

const supabase = useSupabaseClient()
const auth = useAuth()
const toast = useToast()

const saving = ref(false)

const passwordSchema = z.object({
  current: z.string().min(8, 'Minimal 8 karakter'),
  new: z.string().min(8, 'Minimal 8 karakter'),
  confirm: z.string().min(8, 'Minimal 8 karakter')
})

type PasswordSchema = z.output<typeof passwordSchema>

const password = reactive<Partial<PasswordSchema>>({
  current: '',
  new: '',
  confirm: ''
})

const validate = (state: Partial<PasswordSchema>): FormError[] => {
  const errors: FormError[] = []
  if (state.current && state.new && state.current === state.new) {
    errors.push({ name: 'new', message: 'Password baru tidak boleh sama dengan password lama' })
  }
  if (state.new && state.confirm && state.new !== state.confirm) {
    errors.push({ name: 'confirm', message: 'Konfirmasi password tidak cocok' })
  }
  return errors
}

async function onSubmit(event: FormSubmitEvent<PasswordSchema>) {
  if (!auth.profile?.email) return
  saving.value = true
  try {
    // Step 1: verify current password by re-authenticating
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: auth.profile.email,
      password: event.data.current
    })
    if (signInError) {
      toast.add({ title: 'Gagal', description: 'Password saat ini tidak valid.', color: 'error' })
      return
    }

    // Step 2: update to new password
    const { error } = await supabase.auth.updateUser({ password: event.data.new })
    if (error) throw error

    password.current = ''
    password.new = ''
    password.confirm = ''

    toast.add({
      title: 'Password diperbarui',
      description: 'Password Anda berhasil diganti.',
      icon: 'i-lucide-check',
      color: 'success'
    })
  }
  catch (err: any) {
    toast.add({
      title: 'Error',
      description: err.message ?? 'Gagal memperbarui password.',
      color: 'error'
    })
  }
  finally {
    saving.value = false
  }
}

const showDeleteModal = ref(false)
</script>

<template>
  <UPageCard
    title="Ubah Password"
    description="Masukkan password saat ini lalu tentukan password baru Anda."
    variant="subtle"
  >
    <UForm
      :schema="passwordSchema"
      :state="password"
      :validate="validate"
      class="flex flex-col gap-4 max-w-sm"
      @submit="onSubmit"
    >
      <UFormField
        name="current"
        label="Password saat ini"
      >
        <UInput
          v-model="password.current"
          type="password"
          placeholder="Password saat ini"
          class="w-full"
        />
      </UFormField>

      <UFormField
        name="new"
        label="Password baru"
      >
        <UInput
          v-model="password.new"
          type="password"
          placeholder="Password baru (min. 8 karakter)"
          class="w-full"
        />
      </UFormField>

      <UFormField
        name="confirm"
        label="Konfirmasi password baru"
      >
        <UInput
          v-model="password.confirm"
          type="password"
          placeholder="Ulangi password baru"
          class="w-full"
        />
      </UFormField>

      <UButton
        label="Perbarui Password"
        type="submit"
        :loading="saving"
        class="w-fit"
      />
    </UForm>
  </UPageCard>

  <UPageCard
    title="Hapus Akun"
    description="Tidak ingin lagi menggunakan layanan ini? Anda dapat menghapus akun di sini. Tindakan ini tidak dapat dibatalkan. Semua informasi terkait akun ini akan dihapus secara permanen."
    class="bg-linear-to-tl from-error/10 from-5% to-default"
  >
    <template #footer>
      <UButton
        label="Hapus akun"
        color="error"
        @click="showDeleteModal = true"
      />
    </template>
  </UPageCard>

  <UModal
    v-model:open="showDeleteModal"
    title="Konfirmasi Hapus Akun"
    description="Apakah Anda yakin ingin menghapus akun ini? Tindakan ini tidak dapat dibatalkan."
  >
    <template #footer>
      <UButton
        label="Batal"
        color="neutral"
        variant="outline"
        @click="showDeleteModal = false"
      />
      <UButton
        label="Hapus Akun"
        color="error"
        @click="showDeleteModal = false; $toast?.add({ title: 'Tidak tersedia', description: 'Hubungi administrator sistem untuk menghapus akun ini.', color: 'warning' })"
      />
    </template>
  </UModal>
</template>
