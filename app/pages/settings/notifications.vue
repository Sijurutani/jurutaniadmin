<script setup lang="ts">
const toast = useToast()

const STORAGE_KEY = 'jurutani_notif_prefs'

const defaultState: Record<string, boolean> = {
  email: true,
  desktop: false,
  new_user: true,
  new_order: true,
  new_course_enrollment: true,
  weekly_digest: false,
  important_updates: true
}

function loadState(): Record<string, boolean> {
  if (import.meta.client) {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) return { ...defaultState, ...JSON.parse(saved) }
    }
    catch {}
  }
  return { ...defaultState }
}

const state = reactive<Record<string, boolean>>(loadState())

const sections = [{
  title: 'Saluran notifikasi',
  description: 'Di mana kami dapat memberitahu Anda?',
  fields: [{
    name: 'email',
    label: 'Email',
    description: 'Terima ringkasan harian via email.'
  }, {
    name: 'desktop',
    label: 'Desktop',
    description: 'Terima notifikasi push di browser.'
  }]
}, {
  title: 'Aktivitas sistem',
  description: 'Notifikasi untuk aktivitas penting di platform.',
  fields: [{
    name: 'new_user',
    label: 'Pengguna baru',
    description: 'Diberi tahu saat ada pendaftaran pengguna baru.'
  }, {
    name: 'new_order',
    label: 'Pesanan baru',
    description: 'Diberi tahu saat ada transaksi/pesanan masuk.'
  }, {
    name: 'new_course_enrollment',
    label: 'Enrollment kursus',
    description: 'Diberi tahu saat ada pengguna yang mendaftar kursus.'
  }]
}, {
  title: 'Update sistem',
  description: 'Informasi terkait platform Jurutani.',
  fields: [{
    name: 'weekly_digest',
    label: 'Ringkasan mingguan',
    description: 'Terima ringkasan mingguan aktivitas platform.'
  }, {
    name: 'important_updates',
    label: 'Update penting',
    description: 'Notifikasi untuk pembaruan keamanan dan maintenance.'
  }]
}]

function onChange() {
  if (import.meta.client) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    toast.add({
      title: 'Preferensi disimpan',
      description: 'Pengaturan notifikasi berhasil diperbarui.',
      icon: 'i-lucide-check',
      color: 'success'
    })
  }
}
</script>

<template>
  <div
    v-for="(section, index) in sections"
    :key="index"
  >
    <UPageCard
      :title="section.title"
      :description="section.description"
      variant="naked"
      class="mb-4"
    />

    <UPageCard
      variant="subtle"
      :ui="{ container: 'divide-y divide-default' }"
      class="mb-6"
    >
      <UFormField
        v-for="field in section.fields"
        :key="field.name"
        :name="field.name"
        :label="field.label"
        :description="field.description"
        class="flex items-center justify-between not-last:pb-4 gap-2"
      >
        <USwitch
          v-model="state[field.name]"
          @update:model-value="onChange"
        />
      </UFormField>
    </UPageCard>
  </div>
</template>
