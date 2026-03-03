import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore'
import { firestoreDb } from '../lib/firebase'
import { useApp } from '../store/AppContext'
import { RaftGuide } from './RaftGuide'

const tabs = [
  { to: '/home', label: 'ホーム' },
  { to: '/plans', label: '企画' },
  { to: '/events', label: '撮影日' },
  { to: '/rafine', label: 'RAFINE' },
  { to: '/me', label: '自分' },
]

export const Layout = () => {
  const { pathname } = useLocation()
  const { ready, workspaceId, storageMode, currentUserId } = useApp()
  const defaultChannelTitle = '無念のラフト'
  const [channelTitle, setChannelTitle] = useState(defaultChannelTitle)
  const [displayLoading, setDisplayLoading] = useState(!ready)
  const [progress, setProgress] = useState(12)
  const [homeMessageNotice, setHomeMessageNotice] = useState('')
  const seenMessageIdRef = useRef<string | null>(null)
  const noticeTimerRef = useRef<number | null>(null)
  const runFrames = useMemo(
    () =>
      [1, 2, 3, 4, 5, 6].map(
        (index) => `${import.meta.env.BASE_URL}raft/run${index}.png`,
      ),
    [],
  )
  const [frameIndex, setFrameIndex] = useState(0)

  useEffect(() => {
    if (ready) {
      const completeTimer = window.setTimeout(() => setProgress(100), 0)
      const timer = window.setTimeout(() => setDisplayLoading(false), 380)
      return () => {
        window.clearTimeout(completeTimer)
        window.clearTimeout(timer)
      }
    }

    const startTimer = window.setTimeout(() => {
      setDisplayLoading(true)
      setProgress(12)
    }, 0)

    const timer = window.setInterval(() => {
      setProgress((prev) => Math.min(92, prev + Math.random() * 7))
    }, 220)
    return () => {
      window.clearTimeout(startTimer)
      window.clearInterval(timer)
    }
  }, [ready])

  useEffect(() => {
    if (!displayLoading) return
    const timer = window.setInterval(() => {
      setFrameIndex((prev) => (prev + 1) % runFrames.length)
    }, 90)
    return () => window.clearInterval(timer)
  }, [displayLoading, runFrames.length])

  useEffect(() => {
    const channelId = import.meta.env.VITE_YT_CHANNEL_ID || 'UCFdvUG1D6Dj6MzZjFw3Kttg'
    const apiKey = import.meta.env.VITE_YT_API_KEY
    if (!apiKey) {
      return
    }

    const controller = new AbortController()
    const load = async () => {
      try {
        const url = `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${encodeURIComponent(channelId)}&key=${encodeURIComponent(apiKey)}`
        const res = await fetch(url, { signal: controller.signal })
        if (!res.ok) return
        const json = (await res.json()) as {
          items?: Array<{ snippet?: { title?: string } }>
        }
        const title = json.items?.[0]?.snippet?.title?.trim()
        if (title) setChannelTitle(title)
      } catch {
        setChannelTitle(defaultChannelTitle)
      }
    }

    load()
    return () => controller.abort()
  }, [])

  useEffect(() => {
    const showNotice = (text: string) => {
      if (noticeTimerRef.current) {
        window.clearTimeout(noticeTimerRef.current)
      }
      setHomeMessageNotice(text)
      noticeTimerRef.current = window.setTimeout(() => setHomeMessageNotice(''), 4000)
    }

    const isHome = pathname.startsWith('/home')
    if (!isHome) return

    if (storageMode === 'firebase' && firestoreDb) {
      const ref = collection(firestoreDb, 'workspaces', workspaceId, 'rafine_messages')
      const unsub = onSnapshot(query(ref, orderBy('createdAt', 'desc'), limit(1)), (snap) => {
        const latest = snap.docs[0]
        if (!latest) return
        const data = latest.data() as {
          id?: string
          text?: string
          userId?: string
          recipientId?: string
          displayName?: string
        }
        const messageId = latest.id
        if (!seenMessageIdRef.current) {
          seenMessageIdRef.current = messageId
          return
        }
        if (seenMessageIdRef.current === messageId) return
        seenMessageIdRef.current = messageId
        if (data.userId === currentUserId) return
        if (data.recipientId && data.recipientId !== currentUserId) return
        showNotice(`${data.displayName ?? 'メンバー'}: ${data.text ?? ''}`)
      })
      return () => unsub()
    }

    const localKey = `rafine-messages-${workspaceId}`
    const timer = window.setInterval(() => {
      try {
        const raw = localStorage.getItem(localKey)
        if (!raw) return
        const messages = JSON.parse(raw) as Array<{
          id: string
          text: string
          userId: string
          recipientId?: string
          displayName: string
        }>
        const latest = messages[messages.length - 1]
        if (!latest) return
        if (!seenMessageIdRef.current) {
          seenMessageIdRef.current = latest.id
          return
        }
        if (seenMessageIdRef.current === latest.id) return
        seenMessageIdRef.current = latest.id
        if (latest.userId === currentUserId) return
        if (latest.recipientId && latest.recipientId !== currentUserId) return
        showNotice(`${latest.displayName}: ${latest.text}`)
      } catch {
        // ignore malformed local data
      }
    }, 2000)
    return () => window.clearInterval(timer)
  }, [currentUserId, pathname, storageMode, workspaceId])

  return (
    <div className="app-shell">
      <header className="app-header">
        <Link to="/home" className="brand">
          {channelTitle}撮影プランナー
        </Link>
      </header>
      {homeMessageNotice && pathname.startsWith('/home') && (
        <div className="home-message-notice" role="status" aria-live="polite">
          {homeMessageNotice}
        </div>
      )}
      <main className="app-main">
        <Outlet />
      </main>
      <RaftGuide />
      <nav className="bottom-nav">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>
      {displayLoading && (
        <div className="sync-loading-overlay" role="status" aria-live="polite">
          <div className="sync-loading-inner">
            <p className="sync-loading-title">同期中...</p>
            <div className="sync-loading-track">
              <div className="sync-loading-fill" style={{ width: `${progress}%` }} />
              <span className="sync-loading-raft-wrap" style={{ left: `calc(${progress}% - 24px)` }}>
                <img
                  src={runFrames[frameIndex]}
                  className="sync-loading-raft sync-loading-raft-outline"
                  alt=""
                  aria-hidden="true"
                />
                <img
                  src={runFrames[frameIndex]}
                  className="sync-loading-raft sync-loading-raft-base"
                  alt="同期中のラフト"
                />
              </span>
            </div>
            <p className="sync-loading-percent">{Math.round(progress)}%</p>
          </div>
        </div>
      )}
    </div>
  )
}
