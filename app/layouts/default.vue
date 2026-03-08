<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

defineOptions({ inheritAttrs: false })

const route = useRoute()
const toast = useToast()

const open = ref(false)

const links = [[
  { label: 'Admin', type: 'label' },
  { label: 'Home', icon: 'i-lucide-house', to: '/', exact: true },
  { label: 'News', icon: 'i-lucide-newspaper', to: '/news' },
  { label: 'Market', icon: 'i-lucide-shopping-cart', to: '/markets' },
  { label: 'Inbox', icon: 'i-lucide-inbox', to: '/inbox', badge: '4',}, 
  { label: 'Resources', type: 'label' },
  { label: 'Videos', icon: 'i-lucide-video', to: '/videos' },
  { label: 'Meeting', icon: 'i-lucide-calendar', to: '/meetings' },
  { label: 'Courses', icon: 'i-lucide-book-open', to: '/courses' },
  { label: 'Users Management', type: 'label' },
  { label: 'Dashboard', icon: 'i-lucide-chart-spline', to: '/dashboard-user' },
  { label: 'Experts', icon: 'i-lucide-brain', to: '/experts' },
  { label: 'Instructors', icon: 'i-lucide-book-open', to: '/instructors' },
  { label: 'Users', icon: 'i-lucide-users', to: '/users' },
  { label: 'Admin Settings', type: 'label' },
  { label: 'Contents', icon: 'i-lucide-layout-template', to: '/contents' },
  { label: 'Maps', icon: 'i-lucide-map-pin', to: '/maps' },
  { label: 'Tags', icon: 'i-lucide-tag', to: '/tags' },
  { label: 'Customers', icon: 'i-lucide-users', to: '/customers',}, 
  {
  label: 'Settings',
  to: '/settings',
  icon: 'i-lucide-settings',
  defaultOpen: true,
  type: 'trigger',
  children: [{
    label: 'General',
    to: '/settings',
    exact: true,
    onSelect: () => {
      open.value = false
    }
  }, {
    label: 'Members',
    to: '/settings/members',
    onSelect: () => {
      open.value = false
    }
  }, {
    label: 'Notifications',
    to: '/settings/notifications',
    onSelect: () => {
      open.value = false
    }
  }, {
    label: 'Security',
    to: '/settings/security',
    onSelect: () => {
      open.value = false
    }
  }]
}], [{
  label: 'Feedback',
  icon: 'i-lucide-message-circle',
  to: 'https://github.com/nuxt-ui-templates/dashboard',
  target: '_blank'
}, {
  label: 'Help & Support',
  icon: 'i-lucide-info',
  to: 'https://github.com/nuxt-ui-templates/dashboard',
  target: '_blank'
}]] satisfies NavigationMenuItem[][]

const groups = computed(() => [{
  id: 'links',
  label: 'Go to',
  items: links.flat()
}, {
  id: 'code',
  label: 'Code',
  items: [{
    id: 'source',
    label: 'View page source',
    icon: 'i-simple-icons-github',
    to: `https://github.com/nuxt-ui-templates/dashboard/blob/main/app/pages${route.path === '/' ? '/index' : route.path}.vue`,
    target: '_blank'
  }]
}])

onMounted(async () => {
  const cookie = useCookie('cookie-consent')
  if (cookie.value === 'accepted') {
    return
  }

  toast.add({
    title: 'We use first-party cookies to enhance your experience on our website.',
    duration: 0,
    close: false,
    actions: [{
      label: 'Accept',
      color: 'neutral',
      variant: 'outline',
      onClick: () => {
        cookie.value = 'accepted'
      }
    }, {
      label: 'Opt out',
      color: 'neutral',
      variant: 'ghost'
    }]
  })
})
</script>

<template>
  <UDashboardGroup unit="rem">
    <UDashboardSidebar
      id="default"
      v-model:open="open"
      collapsible
      resizable
      class="bg-elevated/25"
      :ui="{ footer: 'lg:border-t lg:border-default' }"
    >
      <template #header="{ collapsed }">
        <TeamsMenu :collapsed="collapsed" />
      </template>

      <template #default="{ collapsed }">
        <UDashboardSearchButton :collapsed="collapsed" class="bg-transparent ring-default" />

        <UNavigationMenu
          :collapsed="collapsed"
          :items="links[0]"
          orientation="vertical"
          tooltip
          popover
        />

        <UNavigationMenu
          :collapsed="collapsed"
          :items="links[1]"
          orientation="vertical"
          tooltip
          class="mt-auto"
        />
        <div class="grow" />
        <UPageCard
          v-if="!collapsed"
          title="Ask AI"
          description="Get instant answers and insights"
          :ui="{ description: 'text-sm', container: 'lg:p-5' }"
          spotlight
        >
          <UButton
            icon="i-lucide-bot"
            color="primary"
            variant="soft"
            label="Ask Now"
            class="w-min"
            disabled
          />
        </UPageCard>
      </template>

      <template #footer="{ collapsed }">
        <ClientOnly>
          <UserMenu :collapsed="collapsed" />
          <template #fallback>
            <div class="flex items-center gap-2 px-3 py-2">
              <div class="size-8 rounded-full bg-elevated animate-pulse shrink-0" />
              <div v-if="!collapsed" class="flex-1 space-y-1">
                <div class="h-3 w-24 rounded bg-elevated animate-pulse" />
                <div class="h-2.5 w-16 rounded bg-elevated animate-pulse" />
              </div>
            </div>
          </template>
        </ClientOnly>
      </template>
    </UDashboardSidebar>

    <UDashboardSearch :groups="groups" />

    <slot />

    <NotificationsSlideover />
  </UDashboardGroup>
</template>
