<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

const auth = useAuth()
const supabase = useSupabaseClient()
const toast = useToast()

const fileRef = ref<HTMLInputElement>()
const uploading = ref(false)
const saving = ref(false)

const profileSchema = z.object({
  full_name: z.string().min(2, 'Name too short'),
  email: z.string().email('Invalid email'),
  username: z.string().min(2, 'Too short').optional().or(z.literal('')),
  avatar_url: z.string().optional(),
  bio: z.string().optional(),
  phone: z.string().optional(),
  website: z.string().optional(),
  address: z.string().optional()
})

type ProfileSchema = z.output<typeof profileSchema>

const profile = reactive<Partial<ProfileSchema>>({
  full_name: auth.profile?.full_name ?? '',
  email: auth.profile?.email ?? '',
  username: auth.profile?.username ?? '',
  avatar_url: auth.profile?.avatar_url ?? undefined,
  bio: auth.profile?.bio ?? '',
  phone: auth.profile?.phone ?? '',
  website: auth.profile?.website ?? '',
  address: auth.profile?.address ?? ''
})

async function onSubmit(event: FormSubmitEvent<ProfileSchema>) {
  if (!auth.profile?.id) return
  saving.value = true
  try {
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: event.data.full_name,
        username: event.data.username || null,
        bio: event.data.bio || null,
        phone: event.data.phone || null,
        website: event.data.website || null,
        address: event.data.address || null,
        avatar_url: event.data.avatar_url || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', auth.profile.id)

    if (error) throw error

    const updated = await auth.fetchProfile(auth.profile.id)
    if (updated) auth.profile = updated

    toast.add({
      title: 'Profile updated',
      description: 'Your profile has been saved successfully.',
      icon: 'i-lucide-check',
      color: 'success'
    })
  }
  catch (err: any) {
    toast.add({
      title: 'Error',
      description: err.message ?? 'Failed to update profile.',
      color: 'error'
    })
  }
  finally {
    saving.value = false
  }
}

async function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  if (!input.files?.length || !auth.profile?.id) return
  uploading.value = true
  try {
    const file = input.files[0]!
    const ext = file.name.split('.').pop() ?? 'jpg'
    const path = `${auth.profile.id}/avatar.${ext}`

    const { error } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true, contentType: file.type })

    if (error) throw error

    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    profile.avatar_url = `${data.publicUrl}?t=${Date.now()}`
  }
  catch (err: any) {
    toast.add({
      title: 'Upload failed',
      description: err.message ?? 'Failed to upload avatar.',
      color: 'error'
    })
  }
  finally {
    uploading.value = false
  }
}

function onFileClick() {
  fileRef.value?.click()
}
</script>

<template>
  <UForm
    id="settings"
    :schema="profileSchema"
    :state="profile"
    @submit="onSubmit"
  >
    <UPageCard
      title="Profil"
      description="Informasi ini ditampilkan di dalam sistem admin."
      variant="naked"
      orientation="horizontal"
      class="mb-4"
    >
      <UButton
        form="settings"
        label="Simpan perubahan"
        color="neutral"
        type="submit"
        :loading="saving"
        class="w-fit lg:ms-auto"
      />
    </UPageCard>

    <UPageCard variant="subtle">
      <UFormField
        name="full_name"
        label="Nama Lengkap"
        description="Nama yang ditampilkan di dashboard."
        required
        class="flex max-sm:flex-col justify-between items-start gap-4"
      >
        <UInput
          v-model="profile.full_name"
          autocomplete="off"
          class="w-full sm:w-72"
        />
      </UFormField>
      <USeparator />
      <UFormField
        name="email"
        label="Email"
        description="Digunakan untuk login. Tidak dapat diubah di sini."
        required
        class="flex max-sm:flex-col justify-between items-start gap-4"
      >
        <UInput
          v-model="profile.email"
          type="email"
          autocomplete="off"
          disabled
          class="w-full sm:w-72"
        />
      </UFormField>
      <USeparator />
      <UFormField
        name="username"
        label="Username"
        description="Username unik untuk profil Anda."
        class="flex max-sm:flex-col justify-between items-start gap-4"
      >
        <UInput
          v-model="profile.username"
          autocomplete="off"
          class="w-full sm:w-72"
        />
      </UFormField>
      <USeparator />
      <UFormField
        name="phone"
        label="Nomor Telepon"
        description="Nomor telepon aktif Anda."
        class="flex max-sm:flex-col justify-between items-start gap-4"
      >
        <UInput
          v-model="profile.phone"
          type="tel"
          autocomplete="off"
          class="w-full sm:w-72"
        />
      </UFormField>
      <USeparator />
      <UFormField
        name="website"
        label="Website"
        description="URL website atau media sosial Anda."
        class="flex max-sm:flex-col justify-between items-start gap-4"
      >
        <UInput
          v-model="profile.website"
          type="url"
          autocomplete="off"
          placeholder="https://"
          class="w-full sm:w-72"
        />
      </UFormField>
      <USeparator />
      <UFormField
        name="address"
        label="Alamat"
        description="Alamat tempat tinggal atau kantor."
        class="flex max-sm:flex-col justify-between items-start gap-4"
      >
        <UInput
          v-model="profile.address"
          autocomplete="off"
          class="w-full sm:w-72"
        />
      </UFormField>
      <USeparator />
      <UFormField
        name="avatar_url"
        label="Foto Profil"
        description="JPG, PNG. Maks 2 MB."
        class="flex max-sm:flex-col justify-between sm:items-center gap-4"
      >
        <div class="flex flex-wrap items-center gap-3">
          <UAvatar
            :src="profile.avatar_url"
            :alt="profile.full_name"
            size="lg"
          />
          <UButton
            label="Pilih foto"
            color="neutral"
            :loading="uploading"
            @click="onFileClick"
          />
          <input
            ref="fileRef"
            type="file"
            class="hidden"
            accept=".jpg, .jpeg, .png"
            @change="onFileChange"
          >
        </div>
      </UFormField>
      <USeparator />
      <UFormField
        name="bio"
        label="Bio"
        description="Deskripsi singkat tentang Anda."
        class="flex max-sm:flex-col justify-between items-start gap-4"
        :ui="{ container: 'w-full' }"
      >
        <UTextarea
          v-model="profile.bio"
          :rows="4"
          autoresize
          class="w-full"
        />
      </UFormField>
    </UPageCard>
  </UForm>
</template>
