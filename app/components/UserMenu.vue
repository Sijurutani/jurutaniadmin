<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

defineProps<{
  collapsed?: boolean
}>()

const colorMode = useColorMode()
const authStore = useAuthStore()

const user = computed(() => ({
  name: authStore.displayName,
  avatar: {
    src: authStore.avatarUrl || undefined,
    alt: authStore.displayName
  }
}))

const isAdmin = computed(() => authStore.isAdmin)

const items = computed<DropdownMenuItem[][]>(() => ([[{
  type: 'label',
  label: user.value.name,
  avatar: user.value.avatar
}], [{
  label: 'Settings',
  icon: 'i-lucide-settings',
  to: '/settings'
}], [{
  label: 'Appearance',
  icon: 'i-lucide-sun-moon',
  children: [{
    label: 'Light',
    icon: 'i-lucide-sun',
    type: 'checkbox',
    checked: colorMode.preference === 'light',
    onSelect(e: Event) {
      e.preventDefault()
      colorMode.preference = 'light'
    }
  }, {
    label: 'Dark',
    icon: 'i-lucide-moon',
    type: 'checkbox',
    checked: colorMode.preference === 'dark',
    onSelect(e: Event) {
      e.preventDefault()
      colorMode.preference = 'dark'
    }
  }, {
    label: 'System',
    icon: 'i-lucide-monitor',
    type: 'checkbox',
    checked: colorMode.preference === 'system',
    onSelect(e: Event) {
      e.preventDefault()
      colorMode.preference = 'system'
    }
  }]
}], [{
  label: 'Log out',
  icon: 'i-lucide-log-out',
  color: 'error' as const,
  onSelect: () => authStore.signOut()
}]]))
</script>

<template>
  <UDropdownMenu
    :items="items"
    :content="{ align: 'center', collisionPadding: 12 }"
    :ui="{ content: collapsed ? 'w-48' : 'w-(--reka-dropdown-menu-trigger-width)' }"
  >
    <UButton
      v-bind="{
        ...user,
        label: collapsed ? undefined : user?.name,
        trailingIcon: collapsed ? undefined : 'i-lucide-chevrons-up-down'
      }"
      color="neutral"
      variant="ghost"
      block
      :square="collapsed"
      class="data-[state=open]:bg-elevated"
      :ui="{
        trailingIcon: 'text-dimmed'
      }"
    >
      <template
        v-if="!collapsed && isAdmin"
        #trailing
      >
        <UBadge
          label="Admin"
          color="primary"
          variant="subtle"
          size="sm"
          class="ml-auto"
        />
        <UIcon
          name="i-lucide-chevrons-up-down"
          class="text-dimmed shrink-0"
        />
      </template>
    </UButton>

  </UDropdownMenu>
</template>
