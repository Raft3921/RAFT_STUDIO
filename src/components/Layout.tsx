import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore'
import { firestoreDb } from '../lib/firebase'
import { useApp } from '../store/AppContext'
import { RaftGuide } from './RaftGuide'

const tabs = [
  { to: '/home', label: 'ホーム', tour: 'tab-home' },
  { to: '/plans', label: '企画', tour: 'tab-plans' },
  { to: '/events', label: '撮影日', tour: 'tab-events' },
  { to: '/rafine', label: 'RAFINE', tour: 'tab-rafine' },
  { to: '/me', label: '自分', tour: 'tab-me' },
]

const onboardingStorageKey = 'onboarding-v2-done'
const toNoticeText = (text?: string, mediaType?: string) => {
  const body = text?.trim()
  if (body) return body
  if (mediaType?.startsWith('image/')) return '[画像]'
  if (mediaType?.startsWith('video/')) return '[動画]'
  return '[添付ファイル]'
}

export const Layout = () => {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { ready, workspaceId, storageMode, currentUserId, data } = useApp()
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
  const [onboardingActive, setOnboardingActive] = useState(false)
  const [onboardingIndex, setOnboardingIndex] = useState(0)
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null)
  const currentMember = data.members.find((member) => member.id === currentUserId)
  const onboardingSteps = useMemo(
    () =>
      [
        {
          path: '/home',
          target: '[data-tour="tab-me"]',
          title: '最初にここ',
          text: 'まずは「自分」タブで名前を選択しよう。',
        },
        {
          path: '/me',
          target: '[data-tour="me-name-select"]',
          title: '表示名を選択',
          text: currentMember?.displayName
            ? `今は「${currentMember.displayName}」。必要なら候補から切り替えよう。`
            : '過去メンバー名の候補から自分の名前を選ぼう。',
        },
        {
          path: '/me',
          target: '[data-tour="me-name-save"]',
          title: '保存',
          text: '保存すると、同じ名前のメンバーとして扱われる。',
        },
        {
          path: '/me',
          target: '[data-tour="tab-plans"]',
          title: '次は企画',
          text: '次は「企画」タブへ。',
        },
        {
          path: '/plans',
          target: '[data-tour="plans-create-button"]',
          title: '企画を作成',
          text: 'ここから新しい企画カードを作る。',
        },
        {
          path: '/plans/new',
          target: '[data-tour="plan-template"]',
          title: 'テンプレ選択',
          text: '最初に企画テンプレを選ぶ。',
        },
        {
          path: '/plans/new',
          target: '[data-tour="plan-members"]',
          title: 'メンバー選択',
          text: '参加メンバーを選択する。',
        },
        {
          path: '/plans/new',
          target: '[data-tour="plan-submit"]',
          title: '作成完了',
          text: '最後に作成ボタンで企画カード完成。',
        },
      ] as const,
    [currentMember],
  )

  useEffect(() => {
    if (!ready) return
    const done = window.localStorage.getItem(onboardingStorageKey)
    if (done === '1') return
    const timer = window.setTimeout(() => {
      setOnboardingActive(true)
      setOnboardingIndex(0)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [ready])

  useEffect(() => {
    if (!onboardingActive) return
    const step = onboardingSteps[onboardingIndex]
    if (!step) return
    if (pathname !== step.path) {
      navigate(step.path)
    }
  }, [navigate, onboardingActive, onboardingIndex, onboardingSteps, pathname])

  useEffect(() => {
    if (!onboardingActive) return
    const step = onboardingSteps[onboardingIndex]
    if (!step) return

    let frame = 0
    let cancelled = false
    const measure = () => {
      if (cancelled) return
      const target = document.querySelector(step.target)
      if (target instanceof HTMLElement) {
        setHighlightRect(target.getBoundingClientRect())
        return
      }
      frame += 1
      if (frame < 40) {
        window.requestAnimationFrame(measure)
      } else {
        setHighlightRect(null)
      }
    }
    measure()

    const onResize = () => measure()
    window.addEventListener('resize', onResize)
    return () => {
      cancelled = true
      window.removeEventListener('resize', onResize)
    }
  }, [onboardingActive, onboardingIndex, onboardingSteps, pathname])

  useEffect(() => {
    if (!onboardingActive) return
    const onScroll = () => {
      const step = onboardingSteps[onboardingIndex]
      const target = document.querySelector(step.target)
      if (target instanceof HTMLElement) {
        setHighlightRect(target.getBoundingClientRect())
      }
    }
    window.addEventListener('scroll', onScroll, true)
    return () => window.removeEventListener('scroll', onScroll, true)
  }, [onboardingActive, onboardingIndex, onboardingSteps])

  const closeOnboarding = () => {
    window.localStorage.setItem(onboardingStorageKey, '1')
    setOnboardingActive(false)
    setHighlightRect(null)
  }

  const nextOnboarding = () => {
    if (onboardingIndex >= onboardingSteps.length - 1) {
      closeOnboarding()
      return
    }
    setOnboardingIndex((prev) => prev + 1)
  }

  const prevOnboarding = () => {
    setOnboardingIndex((prev) => Math.max(0, prev - 1))
  }

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
          mediaType?: string
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
        showNotice(`${data.displayName ?? 'メンバー'}: ${toNoticeText(data.text, data.mediaType)}`)
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
          mediaType?: string
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
        showNotice(`${latest.displayName}: ${toNoticeText(latest.text, latest.mediaType)}`)
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
            data-tour={tab.tour}
            className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>
      {onboardingActive && (
        <div className="onboarding-layer" role="dialog" aria-modal="true" aria-label="初回ガイド">
          {highlightRect && (
            <div
              className="onboarding-focus"
              style={{
                top: highlightRect.top - 6,
                left: highlightRect.left - 6,
                width: highlightRect.width + 12,
                height: highlightRect.height + 12,
              }}
            />
          )}
          <div
            className="onboarding-popover"
            style={{
              top: highlightRect ? Math.min(window.innerHeight - 170, highlightRect.bottom + 14) : 86,
              left: highlightRect
                ? Math.max(10, Math.min(window.innerWidth - 294, highlightRect.left))
                : 10,
            }}
          >
            <p className="onboarding-step">ガイド {onboardingIndex + 1}/{onboardingSteps.length}</p>
            <h3>{onboardingSteps[onboardingIndex].title}</h3>
            <p>{onboardingSteps[onboardingIndex].text}</p>
            <div className="onboarding-actions">
              <button type="button" className="btn ghost" onClick={closeOnboarding}>
                スキップ
              </button>
              {onboardingIndex > 0 && (
                <button type="button" className="btn ghost" onClick={prevOnboarding}>
                  戻る
                </button>
              )}
              <button type="button" className="btn" onClick={nextOnboarding}>
                {onboardingIndex === onboardingSteps.length - 1 ? '完了' : '次へ'}
              </button>
            </div>
          </div>
        </div>
      )}
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
