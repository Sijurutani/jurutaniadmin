export interface EmbedItem {
  id: string
  platform: string
  url: string
  order: number
}

/**
 * Safely parse a Supabase Json column value into EmbedItem[].
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseEmbeds(json: any): EmbedItem[] {
  if (!Array.isArray(json)) return []
  return json as EmbedItem[]
}

/**
 * Auto-detect platform from a social media URL.
 * Returns null if the URL is not recognized.
 */
export function detectPlatform(url: string): string | null {
  try {
    const u = new URL(url)
    const host = u.hostname.replace('www.', '')

    if (host === 'instagram.com') {
      if (u.pathname.includes('/reel/')) return 'instagram_reel'
      if (u.pathname.includes('/p/')) return 'instagram_post'
      return 'instagram_post'
    }
    if (host === 'facebook.com' || host === 'fb.watch' || host === 'm.facebook.com') {
      if (u.pathname.includes('/videos/') || u.pathname.includes('/video/')) return 'facebook_video'
      return 'facebook_post'
    }
    if (host === 'youtube.com' || host === 'youtu.be') return 'youtube'
    if (host === 'tiktok.com') return 'tiktok'
    if (host === 'twitter.com' || host === 'x.com') return 'twitter'
  } catch {}
  return null
}

/**
 * Convert a social media post URL into an embeddable iframe src.
 * Returns null for platforms that cannot be simply iframed (e.g. Twitter).
 */
export function getEmbedSrc(item: EmbedItem): string | null {
  try {
    const u = new URL(item.url)

    switch (item.platform) {
      case 'instagram_post': {
        const match = u.pathname.match(/\/p\/([A-Za-z0-9_-]+)/)
        if (match) return `https://www.instagram.com/p/${match[1]}/embed/`
        break
      }
      case 'instagram_reel': {
        const match = u.pathname.match(/\/reel\/([A-Za-z0-9_-]+)/)
        if (match) return `https://www.instagram.com/reel/${match[1]}/embed/`
        break
      }
      case 'youtube': {
        let videoId: string | null = null
        if (u.hostname === 'youtu.be') {
          videoId = u.pathname.slice(1).split('?')[0] ?? null
        } else {
          videoId = u.searchParams.get('v')
        }
        if (videoId) return `https://www.youtube.com/embed/${videoId}?rel=0`
        break
      }
      case 'facebook_post':
      case 'facebook_video': {
        const encoded = encodeURIComponent(item.url)
        return `https://www.facebook.com/plugins/post.php?href=${encoded}&show_text=true&width=500&appId`
      }
      case 'tiktok': {
        const match = u.pathname.match(/\/video\/(\d+)/)
        if (match) return `https://www.tiktok.com/embed/v2/${match[1]}`
        break
      }
      case 'twitter':
        // Twitter/X doesn't support direct iframe embedding
        return null
    }
  } catch {}
  return null
}

/**
 * Returns the aspect ratio class for a given platform.
 */
export function getEmbedAspect(platform: string): string {
  switch (platform) {
    case 'youtube':
      return 'aspect-video'
    case 'instagram_post':
    case 'instagram_reel':
    case 'tiktok':
      return 'aspect-[9/16]'
    case 'facebook_post':
    case 'facebook_video':
    default:
      return 'aspect-video'
  }
}
