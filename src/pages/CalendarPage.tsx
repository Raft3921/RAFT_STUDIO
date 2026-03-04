import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchLatestVideosByChannelUrl, type YouTubeVideo } from '../lib/youtube'
import { formatDateTime } from '../lib/utils'
import { useApp } from '../store/AppContext'
import type { EventItem } from '../types'

const channelUrlStorageKey = 'channel-page-url'
const defaultChannelUrl = 'https://youtube.com/channel/UCFdvUG1D6Dj6MzZjFw3Kttg'
const weekLabels = ['日', '月', '火', '水', '木', '金', '土']

const pad = (value: number) => String(value).padStart(2, '0')
const dayKey = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1)
const endOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0)
const addMonths = (date: Date, diff: number) => new Date(date.getFullYear(), date.getMonth() + diff, 1)

export const CalendarPage = () => {
  const { data } = useApp()
  const apiKey = import.meta.env.VITE_YT_API_KEY
  const [baseMonth, setBaseMonth] = useState(() => startOfMonth(new Date()))
  const [channelName, setChannelName] = useState('')
  const [publishedVideos, setPublishedVideos] = useState<YouTubeVideo[]>([])
  const [loadingPosts, setLoadingPosts] = useState(false)
  const [postError, setPostError] = useState('')

  const eventsByDay = useMemo(() => {
    const map = new Map<string, EventItem[]>()
    data.events.forEach((event) => {
      const key = dayKey(new Date(event.datetime))
      const list = map.get(key) ?? []
      map.set(key, [...list, event].sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime()))
    })
    return map
  }, [data.events])

  useEffect(() => {
    if (!apiKey) {
      setPostError('VITE_YT_API_KEY 未設定のため投稿マークは表示できません。')
      setPublishedVideos([])
      return
    }
    const channelUrl = localStorage.getItem(channelUrlStorageKey) ?? defaultChannelUrl
    let cancelled = false
    setLoadingPosts(true)
    setPostError('')
    void (async () => {
      try {
        const { channel, videos } = await fetchLatestVideosByChannelUrl(apiKey, channelUrl, {
          maxResults: 25,
          videosMaxAgeMs: 1000 * 60 * 60 * 6,
        })
        if (cancelled) return
        setChannelName(channel.title)
        setPublishedVideos(videos)
      } catch {
        if (cancelled) return
        setPublishedVideos([])
        setChannelName('')
        setPostError('投稿動画の取得に失敗しました。チャンネルURLまたはAPI設定を確認してください。')
      } finally {
        if (!cancelled) {
          setLoadingPosts(false)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [apiKey])

  const monthStart = startOfMonth(baseMonth)
  const monthEnd = endOfMonth(baseMonth)
  const headBlankCount = monthStart.getDay()
  const dayCount = monthEnd.getDate()

  const cells: Array<{ date: Date | null }> = [
    ...Array.from({ length: headBlankCount }, () => ({ date: null })),
    ...Array.from({ length: dayCount }, (_, index) => ({
      date: new Date(baseMonth.getFullYear(), baseMonth.getMonth(), index + 1),
    })),
  ]

  const postDaySet = useMemo(() => {
    const set = new Set<string>()
    publishedVideos.forEach((video) => {
      if (!video.publishedAt) return
      set.add(dayKey(new Date(video.publishedAt)))
    })
    return set
  }, [publishedVideos])

  const monthTitle = `${baseMonth.getFullYear()}年${baseMonth.getMonth() + 1}月`
  const monthPosts = publishedVideos
    .filter((video) => {
      const date = new Date(video.publishedAt)
      return date.getFullYear() === baseMonth.getFullYear() && date.getMonth() === baseMonth.getMonth()
    })
    .sort((a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime())

  return (
    <div className="page-stack">
      <section className="panel">
        <div className="section-head">
          <h2>カレンダー</h2>
          <Link className="btn ghost" to="/events/new">
            撮影日作成
          </Link>
        </div>
        <div className="inline-row">
          <button type="button" className="chip" onClick={() => setBaseMonth((prev) => addMonths(prev, -1))}>
            ← 前月
          </button>
          <strong>{monthTitle}</strong>
          <button type="button" className="chip" onClick={() => setBaseMonth((prev) => addMonths(prev, 1))}>
            次月 →
          </button>
        </div>
      </section>

      <section className="panel">
        <div className="calendar-legend">
          <span className="calendar-mark-badge flag-shoot">● 撮影</span>
          <span className="calendar-mark-badge flag-post">▲ 投稿</span>
          {channelName && <span className="muted">投稿元: {channelName}</span>}
          {loadingPosts && <span className="muted">投稿データ取得中...</span>}
        </div>
        {postError && <p className="rafine-inline-notice">{postError}</p>}

        <div className="calendar-grid calendar-week">
          {weekLabels.map((label) => (
            <div key={label} className="calendar-week-cell">
              {label}
            </div>
          ))}
        </div>
        <div className="calendar-grid">
          {cells.map((cell, index) => {
            if (!cell.date) {
              return <div key={`blank-${index}`} className="calendar-cell calendar-cell-blank" />
            }
            const key = dayKey(cell.date)
            const events = eventsByDay.get(key) ?? []
            const hasShoot = events.length > 0
            const hasPost = postDaySet.has(key)
            return (
              <div key={key} className="calendar-cell">
                <div className="calendar-date">{cell.date.getDate()}</div>
                <div className="calendar-day-flags">
                  <span className={`calendar-day-flag flag-shoot ${hasShoot ? 'active' : ''}`}>●撮</span>
                  <span className={`calendar-day-flag flag-post ${hasPost ? 'active' : ''}`}>▲投</span>
                </div>
                <div className="calendar-events">
                  {events.slice(0, 2).map((event) => (
                    <Link key={event.id} to={`/events/${event.id}`} className="calendar-event-link">
                      {new Date(event.datetime).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}{' '}
                      {event.title}
                    </Link>
                  ))}
                  {events.length > 2 && <span className="muted">+{events.length - 2}件</span>}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <section className="panel">
        <h3>この月の撮影日</h3>
        {data.events
          .filter((event) => {
            const date = new Date(event.datetime)
            return date.getFullYear() === baseMonth.getFullYear() && date.getMonth() === baseMonth.getMonth()
          })
          .sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime())
          .map((event) => (
            <Link key={event.id} to={`/events/${event.id}`} className="card link-card">
              <strong>{event.title}</strong>
              <p>{formatDateTime(event.datetime)}</p>
            </Link>
          ))}
      </section>

      <section className="panel">
        <h3>この月の投稿</h3>
        {monthPosts.length === 0 && <p className="muted">投稿はまだありません。</p>}
        {monthPosts.map((video) => (
          <a key={video.id} href={video.videoUrl} target="_blank" rel="noreferrer" className="card link-card">
            <strong>{video.title}</strong>
            <p>{formatDateTime(video.publishedAt)}</p>
          </a>
        ))}
      </section>
    </div>
  )
}
