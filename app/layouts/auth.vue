<template>
  <div class="h-screen flex flex-col items-center justify-center gap-4 p-4">
    <UColorModeButton class="absolute top-4 right-4" />
    <UPageCard
      class="w-full max-w-md"
      :ui="{ container: 'lg:p-8!' }"
    >
      <NuxtPage />
    </UPageCard>
  </div>
</template>
