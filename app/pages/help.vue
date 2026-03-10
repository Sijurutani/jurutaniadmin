<script setup lang="ts">
useHead({ title: 'Help & Support – Jurutani Admin' })

const developer = {
  name: 'Ilham Kurniawan',
  role: 'Full-Stack Developer',
  tagline: 'Building modern web applications with a passion for clean code and great UX.',
  email: 'ilhamkurniawanjateng@gmail.com',
  github: 'https://github.com/ilhamkrnwan',
  portfolio: 'https://ilhamkrnwan.vercel.app',
  linkedin: 'https://linkedin.com/in/ilhamkrnwan',
  location: 'Indonesia'
}

const techStack = [
  { icon: 'i-simple-icons-nuxtdotjs', label: 'Nuxt 4', color: 'text-green-500' },
  { icon: 'i-simple-icons-vuedotjs', label: 'Vue 3', color: 'text-emerald-500' },
  { icon: 'i-simple-icons-typescript', label: 'TypeScript', color: 'text-blue-500' },
  { icon: 'i-simple-icons-supabase', label: 'Supabase', color: 'text-teal-500' },
  { icon: 'i-simple-icons-tailwindcss', label: 'Tailwind CSS', color: 'text-sky-500' },
  { icon: 'i-simple-icons-postgresql', label: 'PostgreSQL', color: 'text-indigo-500' }
]

const faqs = [
  {
    label: 'Bagaimana cara menambahkan pengguna baru?',
    content: 'Buka menu Users Management → Users di sidebar, lalu klik tombol "Tambah Pengguna" di pojok kanan atas tabel.'
  },
  {
    label: 'Bagaimana cara mempublish berita?',
    content: 'Buka halaman News, pilih berita yang ingin dipublish, kemudian ubah statusnya menjadi "Published" melalui tombol aksi.'
  },
  {
    label: 'Bagaimana cara mengelola kursus?',
    content: 'Buka menu Courses di sidebar. Anda dapat menambah, mengedit, dan mempublish kursus beserta lesson-nya dari halaman tersebut.'
  },
  {
    label: 'Apa yang harus dilakukan jika ada bug atau error?',
    content: 'Hubungi developer melalui email atau GitHub Issues. Sertakan screenshot dan langkah-langkah untuk mereproduksi masalah.'
  },
  {
    label: 'Bagaimana cara menggunakan fitur AI Asisten?',
    content: 'Klik tombol "Ask Now" atau ikon robot di sidebar kiri bawah untuk membuka panel AI Asisten.'
  }
]

const contacts = [
  {
    icon: 'i-lucide-mail',
    label: 'Email',
    value: 'ilhamkurniawanjateng@gmail.com',
    href: 'mailto:ilhamkurniawanjateng@gmail.com',
    color: 'text-red-500'
  },
  {
    icon: 'i-simple-icons-github',
    label: 'GitHub',
    value: 'github.com/ilhamkrnwan',
    href: 'https://github.com/ilhamkrnwan',
    color: 'text-gray-500'
  },
  {
    icon: 'i-lucide-globe',
    label: 'Portfolio',
    value: 'ilhamkrnwan.vercel.app',
    href: 'https://ilhamkrnwan.vercel.app',
    color: 'text-blue-500'
  },
  {
    icon: 'i-simple-icons-linkedin',
    label: 'LinkedIn',
    value: 'linkedin.com/in/ilham-kurniawan',
    href: 'https://www.linkedin.com/in/ilham-kurniawan-9667891b7/',
    color: 'text-sky-600'
  }
]
</script>

<template>
  <UDashboardPanel id="help">
    <template #header>
      <UDashboardNavbar>
        <template #leading>
          <UDashboardSidebarCollapse />
          <div class="flex items-center gap-2 ml-1">
            <UIcon name="i-lucide-info" class="text-primary size-5" />
            <h1 class="text-base font-bold text-highlighted">
              Help & Support
            </h1>
          </div>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="max-w-4xl mx-auto space-y-8 p-6">

        <!-- Developer Card -->
        <UPageCard
          variant="subtle"
          class="overflow-hidden"
        >
          <div class="flex flex-col sm:flex-row items-center sm:items-start gap-6 p-2">
            <!-- Avatar -->
            <div class="relative shrink-0">
              <UAvatar
                src="https://github.com/ilhamkrnwan.png"
                :alt="developer.name"
                size="2xl"
                class="ring-4 ring-primary/20"
              />
              <span class="absolute -bottom-1 -right-1 size-4 rounded-full bg-green-500 ring-2 ring-background" />
            </div>

            <!-- Info -->
            <div class="flex-1 text-center sm:text-left space-y-2">
              <div>
                <h2 class="text-2xl font-bold text-highlighted">
                  {{ developer.name }}
                </h2>
                <p class="text-primary font-medium">
                  {{ developer.role }}
                </p>
              </div>
              <p class="text-muted text-sm leading-relaxed max-w-md">
                {{ developer.tagline }}
              </p>
              <div class="flex items-center justify-center sm:justify-start gap-1 text-muted text-sm">
                <UIcon name="i-lucide-map-pin" class="size-3.5" />
                <span>{{ developer.location }}</span>
              </div>
              <div class="flex flex-wrap justify-center sm:justify-start gap-2 pt-1">
                <UButton
                  icon="i-simple-icons-github"
                  label="GitHub"
                  color="neutral"
                  variant="outline"
                  size="sm"
                  :to="developer.github"
                  target="_blank"
                />
                <UButton
                  icon="i-lucide-globe"
                  label="Portfolio"
                  color="primary"
                  variant="soft"
                  size="sm"
                  :to="developer.portfolio"
                  target="_blank"
                />
              </div>
            </div>

            <!-- Badge -->
            <div class="shrink-0">
              <UBadge
                label="Developer"
                icon="i-lucide-code-2"
                color="primary"
                variant="subtle"
                size="lg"
              />
            </div>
          </div>
        </UPageCard>

        <!-- About Project + Tech Stack -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- About Project -->
          <UPageCard
            title="Tentang Project"
            description="Jurutani Admin Dashboard"
            icon="i-lucide-info"
          >
            <div class="space-y-3 text-sm text-muted">
              <p>
                Platform manajemen konten untuk aplikasi Jurutani — sistem informasi pertanian yang menghubungkan petani, pakar, dan sumber daya pertanian.
              </p>
              <ul class="space-y-1.5">
                <li class="flex items-center gap-2">
                  <UIcon name="i-lucide-check-circle" class="text-green-500 size-4 shrink-0" />
                  Manajemen berita & konten
                </li>
                <li class="flex items-center gap-2">
                  <UIcon name="i-lucide-check-circle" class="text-green-500 size-4 shrink-0" />
                  Pengelolaan kursus & materi belajar
                </li>
                <li class="flex items-center gap-2">
                  <UIcon name="i-lucide-check-circle" class="text-green-500 size-4 shrink-0" />
                  Manajemen pengguna & pakar
                </li>
                <li class="flex items-center gap-2">
                  <UIcon name="i-lucide-check-circle" class="text-green-500 size-4 shrink-0" />
                  AI Asisten terintegrasi
                </li>
                <li class="flex items-center gap-2">
                  <UIcon name="i-lucide-check-circle" class="text-green-500 size-4 shrink-0" />
                  Marketplace produk pertanian
                </li>
              </ul>
            </div>
          </UPageCard>

          <!-- Tech Stack -->
          <UPageCard
            title="Tech Stack"
            description="Teknologi yang digunakan"
            icon="i-lucide-layers"
          >
            <div class="grid grid-cols-2 gap-2">
              <div
                v-for="tech in techStack"
                :key="tech.label"
                class="flex items-center gap-2 rounded-lg border border-default bg-elevated/50 px-3 py-2"
              >
                <UIcon :name="tech.icon" :class="['size-4 shrink-0', tech.color]" />
                <span class="text-sm font-medium text-highlighted">{{ tech.label }}</span>
              </div>
            </div>
          </UPageCard>
        </div>

        <!-- Contact -->
        <UPageCard
          title="Hubungi Developer"
          description="Butuh bantuan teknis atau ingin melaporkan bug? Hubungi melalui:"
          icon="i-lucide-contact"
        >
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <NuxtLink
              v-for="contact in contacts"
              :key="contact.label"
              :to="contact.href"
              :target="contact.href.startsWith('mailto') ? undefined : '_blank'"
              class="flex items-center gap-3 rounded-xl border border-default bg-elevated/50 px-4 py-3 transition hover:border-primary/50 hover:bg-primary/5 group"
            >
              <UIcon :name="contact.icon" :class="['size-5 shrink-0', contact.color]" />
              <div class="min-w-0">
                <p class="text-xs text-muted">{{ contact.label }}</p>
                <p class="text-sm font-medium text-highlighted truncate group-hover:text-primary transition">
                  {{ contact.value }}
                </p>
              </div>
              <UIcon name="i-lucide-arrow-up-right" class="size-4 text-muted ml-auto shrink-0 opacity-0 group-hover:opacity-100 transition" />
            </NuxtLink>
          </div>
        </UPageCard>

        <!-- FAQ -->
        <UPageCard
          title="Pertanyaan Umum (FAQ)"
          description="Jawaban atas pertanyaan yang sering diajukan"
          icon="i-lucide-circle-help"
        >
          <UAccordion
            :items="faqs"
            variant="ghost"
            class="w-full"
          />
        </UPageCard>

        <!-- Footer note -->
        <div class="text-center text-xs text-muted pb-4">
          <p>Jurutani Admin Dashboard — Dibuat dengan ❤️ oleh <span class="text-primary font-medium">{{ developer.name }}</span></p>
          <p class="mt-1">© {{ new Date().getFullYear() }} Jurutani. All rights reserved.</p>
        </div>

      </div>
    </template>
  </UDashboardPanel>
</template>
