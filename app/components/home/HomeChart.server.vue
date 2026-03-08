<template>
  <UCard :ui="{ body: '!px-0 !pt-0 !pb-3', header: 'pb-2' }">
    <template #header>
      <div class="flex items-start justify-between gap-4">
        <div>
          <USkeleton class="h-3 w-24 mb-2" />
          <USkeleton class="h-8 w-32" />
        </div>
        <div class="flex items-center gap-4">
          <div class="hidden sm:flex gap-4">
            <div>
              <USkeleton class="h-3 w-16 mb-1" />
              <USkeleton class="h-4 w-10" />
            </div>
            <div>
              <USkeleton class="h-3 w-10 mb-1" />
              <USkeleton class="h-4 w-10" />
            </div>
          </div>
          <USkeleton class="h-7 w-36 rounded-md" />
        </div>
      </div>
    </template>
    <div class="h-56" />
  </UCard>
</template>
