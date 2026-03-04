import { useEffect, useMemo, useRef, useState } from 'react'
import { fetchLatestVideosByChannelUrl, type YouTubeVideo } from '../lib/youtube'

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
  const [videos, setVideos] = useState<YouTubeVideo[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const requestIdRef = useRef(0)

  const isConfigured = useMemo(() => !!apiKey, [apiKey])

  useEffect(() => {
    if (!isConfigured || !apiKey) {
      setError('YouTube APIキー（VITE_YT_API_KEY）が未設定です。')
      setVideos([])
      setChannelName('')
      return
    }

    const raw = channelUrl.trim()
    if (!raw) {
      setVideos([])
      setChannelName('')
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
          setVideos(latest)
          localStorage.setItem(channelUrlStorageKey, raw)
        } catch {
          if (requestId !== requestIdRef.current) return
          setVideos([])
          setChannelName('')
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

  return (
    <div className="page-stack">
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
