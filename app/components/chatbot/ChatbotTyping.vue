<template>
  <div class="flex gap-2 justify-start w-full">
    <UAvatar
      icon="i-lucide-bot"
      size="xs"
      color="primary"
      variant="soft"
      class="shrink-0 mt-1"
    />
    <div class="bg-elevated rounded-xl rounded-bl-none px-3 py-2">
      <div class="flex gap-1 items-center h-4">
        <span class="size-1.5 rounded-full bg-muted animate-bounce [animation-delay:0ms]" />
        <span class="size-1.5 rounded-full bg-muted animate-bounce [animation-delay:150ms]" />
        <span class="size-1.5 rounded-full bg-muted animate-bounce [animation-delay:300ms]" />
      </div>
    </div>
  </div>
</template>
