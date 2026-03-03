import { useEffect, useMemo, useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { useApp } from '../store/AppContext'
import { RaftGuide } from './RaftGuide'

const tabs = [
  { to: '/home', label: 'ホーム' },
  { to: '/plans', label: '企画' },
  { to: '/events', label: '撮影日' },
  { to: '/me', label: '自分' },
]

export const Layout = () => {
  const { ready } = useApp()
  const [displayLoading, setDisplayLoading] = useState(!ready)
  const [progress, setProgress] = useState(12)
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

  return (
    <div className="app-shell">
      <header className="app-header">
        <Link to="/home" className="brand">
          YouTube撮影プランナー
        </Link>
      </header>
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
