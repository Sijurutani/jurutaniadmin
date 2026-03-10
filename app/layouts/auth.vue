<script setup lang="ts">
const colorMode = useColorMode()
const isDark = computed(() => colorMode.value === 'dark')
</script>

<template>
  <div
    class="min-h-screen flex relative overflow-hidden transition-colors duration-500"
    :class="isDark ? 'bg-[#030a06]' : 'bg-[#f0fdf4]'"
  >

    <!-- Animated canvas background (full page, client only) -->
    <ClientOnly>
      <AuthDarkVeilBg class="absolute inset-0 z-0 w-full h-full" />
    </ClientOnly>

    <!-- LEFT PANEL — branding (desktop only) -->
    <div class="hidden lg:flex lg:w-1/2 xl:w-3/5 relative z-10 overflow-hidden">
      <!-- Background image layer -->
      <img
        src="/background.webp"
        alt="Jurutani"
        class="absolute inset-0 w-full h-full object-cover opacity-30"
      >
      <!-- Darkening gradient overlay -->
      <div
        class="absolute inset-0 transition-colors duration-500"
        :class="isDark
          ? 'bg-gradient-to-r from-green-950/70 via-green-950/40 to-transparent'
          : 'bg-gradient-to-r from-green-900/50 via-green-800/30 to-transparent'"
      />
      <!-- Right-edge fade to blend with right panel -->
      <div
        class="absolute inset-y-0 right-0 w-32 bg-gradient-to-r from-transparent transition-colors duration-500"
        :class="isDark ? 'to-[#030a06]/60' : 'to-[#f0fdf4]/60'"
      />

      <!-- Content -->
      <div class="relative z-10 flex flex-col justify-between h-full p-12 transition-colors duration-500">
        <div class="flex items-center gap-3">
          <img src="/jurutani.png" alt="Jurutani" class="w-10 h-10 object-contain drop-shadow-lg">
          <span
            class="text-xl font-bold tracking-wide drop-shadow transition-colors duration-500"
            :class="isDark ? 'text-white' : 'text-green-900'"
          >Jurutani</span>
        </div>

        <div class="space-y-5">
          <h1
            class="text-4xl xl:text-5xl font-bold leading-tight transition-colors duration-500"
            :class="isDark ? 'text-white' : 'text-green-950'"
          >
            Kelola Platform<br>Pertanian<br>
            <span :class="isDark ? 'text-emerald-300' : 'text-emerald-600'">Lebih Mudah.</span>
          </h1>
          <p
            class="text-lg max-w-sm leading-relaxed transition-colors duration-500"
            :class="isDark ? 'text-green-100/70' : 'text-green-900/75'"
          >
            Dashboard admin terpadu untuk mengelola konten, pengguna, dan sumber daya pertanian Indonesia.
          </p>

          <!-- Feature pills -->
          <div class="flex flex-wrap gap-2 pt-2">
            <span
              v-for="f in ['Berita', 'Kursus', 'Pasar', 'Pengguna', 'AI Asisten']" :key="f"
              class="px-3 py-1 rounded-full text-xs font-medium backdrop-blur-sm transition-colors duration-500"
              :class="isDark
                ? 'bg-white/10 border border-white/15 text-green-100'
                : 'bg-green-900/10 border border-green-900/20 text-green-900'"
            >
              {{ f }}
            </span>
          </div>
        </div>

        <p
          class="text-sm transition-colors duration-500"
          :class="isDark ? 'text-green-200/35' : 'text-green-900/40'"
        >
          © {{ new Date().getFullYear() }} Jurutani. All rights reserved.
        </p>
      </div>
    </div>

    <!-- RIGHT PANEL — auth form -->
    <div class="flex-1 relative z-10 flex items-center justify-center p-6 lg:p-12">
      <UColorModeButton class="absolute top-4 right-4 z-20" />

      <!-- Glassmorphism card -->
      <div class="w-full max-w-md">
        <div
          class="rounded-2xl overflow-hidden backdrop-blur-2xl transition-all duration-500"
          :class="isDark
            ? 'bg-white/[0.07] border border-white/[0.12] shadow-[0_8px_40px_rgba(0,0,0,0.6)] ring-1 ring-white/[0.06]'
            : 'bg-white/60 border border-green-200/60 shadow-[0_8px_40px_rgba(0,80,40,0.12)] ring-1 ring-green-300/30'"
        >
          <NuxtPage />
        </div>

        <!-- Mobile logo below card -->
        <div class="flex items-center justify-center gap-2 mt-6 lg:hidden">
          <img src="/jurutani.png" alt="Jurutani" class="w-5 h-5 object-contain opacity-60">
          <span class="text-xs transition-colors duration-500" :class="isDark ? 'text-white/40' : 'text-green-900/40'">Jurutani Admin</span>
        </div>
      </div>
    </div>

  </div>
</template>
