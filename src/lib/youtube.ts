export interface YouTubeVideo {
  id: string
  title: string
  thumbnail: string
  publishedAt: string
  videoUrl: string
}

export interface YouTubeChannelInfo {
  channelId: string
  title: string
}

interface CacheEntry<T> {
  savedAt: number
  value: T
}

const cachePrefix = 'yt-api-cache-v1'
const defaultChannelCacheMs = 1000 * 60 * 60 * 24 * 30
const defaultVideosCacheMs = 1000 * 60 * 60 * 6

const normalizeUrl = (value: string) => {
  const input = value.trim()
  if (!input) return ''
  if (input.startsWith('http://') || input.startsWith('https://')) return input
  return `https://${input}`
}

const parseYouTubePath = (input: string) => {
  const url = new URL(normalizeUrl(input))
  const segments = url.pathname.split('/').filter(Boolean)
  const first = segments[0] ?? ''
  const second = segments[1] ?? ''
  if (first === 'channel' && second) {
    return { channelId: second, cacheId: `channel:${second}` }
  }
  if (first.startsWith('@')) {
    const handle = first.replace(/^@/, '')
    return { handle, cacheId: `handle:${handle.toLowerCase()}` }
  }
  throw new Error('unsupported-url')
}

const readCache = <T,>(key: string, maxAgeMs: number): T | null => {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CacheEntry<T>
    if (!parsed.savedAt || Date.now() - parsed.savedAt > maxAgeMs) return null
    return parsed.value
  } catch {
    return null
  }
}

const writeCache = <T,>(key: string, value: T) => {
  try {
    const payload: CacheEntry<T> = { savedAt: Date.now(), value }
    localStorage.setItem(key, JSON.stringify(payload))
  } catch {
    // ignore storage quota errors
  }
}

const fetchJson = async <T,>(url: string) => {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`request-failed:${res.status}`)
  }
  return (await res.json()) as T
}

export const resolveChannelInfo = async (
  apiKey: string,
  channelUrl: string,
  maxAgeMs = defaultChannelCacheMs,
): Promise<YouTubeChannelInfo> => {
  const parsed = parseYouTubePath(channelUrl)
  const cacheKey = `${cachePrefix}:channel:${parsed.cacheId}`
  const cached = readCache<YouTubeChannelInfo>(cacheKey, maxAgeMs)
  if (cached) return cached

  const base = 'https://www.googleapis.com/youtube/v3/channels'
  const query = parsed.channelId
    ? `part=snippet&id=${encodeURIComponent(parsed.channelId)}&key=${encodeURIComponent(apiKey)}`
    : `part=snippet&forHandle=${encodeURIComponent(parsed.handle ?? '')}&key=${encodeURIComponent(apiKey)}`
  const json = await fetchJson<{ items?: Array<{ id?: string; snippet?: { title?: string } }> }>(`${base}?${query}`)
  const item = json.items?.[0]
  if (!item?.id || !item.snippet?.title) {
    throw new Error('channel-not-found')
  }
  const value = { channelId: item.id, title: item.snippet.title }
  writeCache(cacheKey, value)
  return value
}

export const loadLatestVideos = async (
  apiKey: string,
  channelId: string,
  options?: { maxResults?: number; maxAgeMs?: number },
): Promise<YouTubeVideo[]> => {
  const maxResults = options?.maxResults ?? 20
  const maxAgeMs = options?.maxAgeMs ?? defaultVideosCacheMs
  const cacheKey = `${cachePrefix}:videos:${channelId}:max${maxResults}`
  const cached = readCache<YouTubeVideo[]>(cacheKey, maxAgeMs)
  if (cached) return cached

  const json = await fetchJson<{
    items?: Array<{
      id?: { videoId?: string }
      snippet?: {
        title?: string
        publishedAt?: string
        thumbnails?: { medium?: { url?: string }; high?: { url?: string } }
      }
    }>
  }>(
    `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${encodeURIComponent(
      channelId,
    )}&order=date&type=video&maxResults=${maxResults}&key=${encodeURIComponent(apiKey)}`,
  )

  const value = (json.items ?? [])
    .map((item) => {
      const videoId = item.id?.videoId
      if (!videoId) return null
      const title = item.snippet?.title ?? 'タイトル未取得'
      const thumbnail = item.snippet?.thumbnails?.high?.url ?? item.snippet?.thumbnails?.medium?.url ?? ''
      const publishedAt = item.snippet?.publishedAt ?? ''
      return {
        id: videoId,
        title,
        thumbnail,
        publishedAt,
        videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
      } satisfies YouTubeVideo
    })
    .filter((video): video is YouTubeVideo => !!video)

  writeCache(cacheKey, value)
  return value
}

export const fetchLatestVideosByChannelUrl = async (
  apiKey: string,
  channelUrl: string,
  options?: { maxResults?: number; channelMaxAgeMs?: number; videosMaxAgeMs?: number },
) => {
  const channel = await resolveChannelInfo(apiKey, channelUrl, options?.channelMaxAgeMs)
  const videos = await loadLatestVideos(apiKey, channel.channelId, {
    maxResults: options?.maxResults,
    maxAgeMs: options?.videosMaxAgeMs,
  })
  return { channel, videos }
}
