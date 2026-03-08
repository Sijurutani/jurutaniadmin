import { createSharedComposable } from '@vueuse/core'

const _useSidebarBadges = () => {
  const supabase = useSupabase()

  const inboxUnread = ref(0)
  const newsPending = ref(0)
  const marketsPending = ref(0)
  const coursesPending = ref(0)

  async function fetchAll() {
    const [inbox, news, markets, courses] = await Promise.all([
      supabase.rpc('get_unread_messages_count'),
      supabase.from('news_updated').select('id', { count: 'exact', head: true }).eq('status_news', 'pending').is('deleted_at', null),
      supabase.from('product_markets').select('id', { count: 'exact', head: true }).eq('status', 'pending').is('deleted_at', null),
      supabase.from('learning_courses').select('id', { count: 'exact', head: true }).eq('status', 'pending').is('deleted_at', null)
    ])
    inboxUnread.value = (inbox.data as number) ?? 0
    newsPending.value = news.count ?? 0
    marketsPending.value = markets.count ?? 0
    coursesPending.value = courses.count ?? 0
  }

  onMounted(() => {
    fetchAll()

    const channel = supabase
      .channel('sidebar-badges')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'news_updated' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'product_markets' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'learning_courses' }, fetchAll)
      .subscribe()

    onUnmounted(() => supabase.removeChannel(channel))
  })

  function fmtBadge(n: number) {
    if (n <= 0) return undefined
    return n > 99 ? '99+' : String(n)
  }

  return { inboxUnread, newsPending, marketsPending, coursesPending, fmtBadge, fetchAll }
}

export const useSidebarBadges = createSharedComposable(_useSidebarBadges)
