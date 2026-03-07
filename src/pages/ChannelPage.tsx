import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { fetchLatestVideosByChannelUrl, type YouTubeVideo } from '../lib/youtube'
import bottleImage from '../../assets/bottle.png'

const channelUrlStorageKey = 'channel-page-url'
const defaultChannelUrl = 'https://youtube.com/channel/UCFdvUG1D6Dj6MzZjFw3Kttg'

const formatDate = (iso: string) => {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}


export const ChannelPage = () => {
  const apiKey = import.meta.env.VITE_YT_API_KEY
  const initialUrl = localStorage.getItem(channelUrlStorageKey) ?? defaultChannelUrl
  const [channelUrl, setChannelUrl] = useState(initialUrl)
  const [channelName, setChannelName] = useState('')
  const [subscriberCount, setSubscriberCount] = useState<number | null>(null)
  const [isSubscriberHidden, setIsSubscriberHidden] = useState(false)
  const [animatedFillRatio, setAnimatedFillRatio] = useState(0)
  const [videos, setVideos] = useState<YouTubeVideo[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const requestIdRef = useRef(0)
  const bottleMax = 500

  const isConfigured = useMemo(() => !!apiKey, [apiKey])
  const fillRatio = useMemo(() => {
    if (!subscriberCount || subscriberCount < 0) return 0
    return Math.min(1, subscriberCount / bottleMax)
  }, [subscriberCount])
  const bottleStyle = useMemo(
    () =>
      ({
        '--bottle-fill-ratio': `${Math.max(0, Math.min(100, Math.round(animatedFillRatio * 100)))}%`,
      }) as CSSProperties,
    [animatedFillRatio],
  )
  const filledDots = useMemo(() => {
    if (!subscriberCount || subscriberCount < 0) return 0
    return Math.min(bottleMax, subscriberCount)
  }, [subscriberCount])

  useEffect(() => {
    if (!isConfigured || !apiKey) {
      setError('YouTube APIキー（VITE_YT_API_KEY）が未設定です。')
      setVideos([])
      setChannelName('')
      setSubscriberCount(null)
      setIsSubscriberHidden(false)
      return
    }

    const raw = channelUrl.trim()
    if (!raw) {
      setVideos([])
      setChannelName('')
      setSubscriberCount(null)
      setIsSubscriberHidden(false)
      setError('チャンネルURLを入力してください。')
      return
    }

    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId
    const timer = window.setTimeout(() => {
      setLoading(true)
      setError('')
      void (async () => {
        try {
          const { channel, videos: latest } = await fetchLatestVideosByChannelUrl(apiKey, raw, {
            maxResults: 12,
            videosMaxAgeMs: 1000 * 60 * 60 * 6,
          })
          if (requestId !== requestIdRef.current) return
          setChannelName(channel.title)
          setSubscriberCount(channel.subscriberCount ?? null)
          setIsSubscriberHidden(Boolean(channel.hiddenSubscriberCount))
          setVideos(latest)
          localStorage.setItem(channelUrlStorageKey, raw)
        } catch {
          if (requestId !== requestIdRef.current) return
          setVideos([])
          setChannelName('')
          setSubscriberCount(null)
          setIsSubscriberHidden(false)
          setError('URLの形式かAPI設定を確認してください。例: /channel/xxxx または /@handle')
        } finally {
          if (requestId === requestIdRef.current) {
            setLoading(false)
          }
        }
      })()
    }, 380)

    return () => window.clearTimeout(timer)
  }, [apiKey, channelUrl, isConfigured])

  useEffect(() => {
    setAnimatedFillRatio(0)
    const timer = window.setTimeout(() => setAnimatedFillRatio(fillRatio), 90)
    return () => window.clearTimeout(timer)
  }, [fillRatio, channelUrl])

  return (
    <div className="page-stack">
      <section className="panel">
        <h2>チャンネル登録者数</h2>
        <p className="channel-subscriber-count">
          {isSubscriberHidden ? '非公開' : subscriberCount === null ? '-' : `${subscriberCount.toLocaleString('ja-JP')}人`}
        </p>
        <div className="channel-bottle-wrap" aria-label="500人MAXの登録者ボトル">
          <div className="channel-bottle-pixel" style={bottleStyle}>
            <div className="channel-bottle-liquid-canvas" aria-hidden>
              <div className="channel-bottle-liquid-max" />
              <div className="channel-bottle-liquid-mask" />
            </div>
            <img src={bottleImage} className="channel-bottle-pixel-img" alt="" aria-hidden />
          </div>
        </div>
        <p className="muted">
          500人MAX表示（現在 {filledDots}/{bottleMax}）
        </p>
        {isSubscriberHidden && <p className="muted">このチャンネルは登録者数を公開していません。</p>}
      </section>

      <section className="panel">
        <h2>チャンネル</h2>
        <p className="muted">YouTubeチャンネルURLから最新動画を取得</p>
        <input
          className="field"
          value={channelUrl}
          onChange={(event) => setChannelUrl(event.target.value)}
          placeholder="https://youtube.com/channel/..."
        />
        <div className="inline-row">
          <span className="muted">{loading ? '動画を自動取得中...' : 'チャンネルタブで自動取得'}</span>
          {channelName && <span className="muted">チャンネル: {channelName}</span>}
        </div>
        {!isConfigured && (
          <p className="muted">`.env` に `VITE_YT_API_KEY` を設定後に再ビルドしてください。</p>
        )}
        {error && <p className="rafine-inline-notice">{error}</p>}
      </section>

      <section className="panel">
        {videos.length === 0 && <p className="muted">{loading ? '読み込み中...' : '表示できる動画がありません。'}</p>}
        <div className="channel-video-grid">
          {videos.map((video) => (
            <a className="channel-video-card" key={video.id} href={video.videoUrl} target="_blank" rel="noreferrer">
              {video.thumbnail ? (
                <img className="channel-video-thumb" src={video.thumbnail} alt={video.title} />
              ) : (
                <div className="channel-video-thumb channel-video-thumb-empty">NO IMAGE</div>
              )}
              <div className="channel-video-meta">
                <strong>{video.title}</strong>
                <span className="muted">{formatDate(video.publishedAt)}</span>
              </div>
            </a>
          ))}
        </div>
      </section>
    </div>
  )
}
