import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useApp } from '../store/AppContext'

const idleFrames = ['/raft/idle1.png', '/raft/idle2.png', '/raft/idle3.png']
const runFrames = ['/raft/run1.png', '/raft/run2.png', '/raft/run3.png', '/raft/run4.png', '/raft/run5.png', '/raft/run6.png']

const routeHints: Record<string, string[]> = {
  '/home': ['次の撮影カードから出欠すれば早いよ', '未回答が多い撮影日から埋めよう'],
  '/plans': ['企画はテンプレから選ぶだけで作れるよ', '候補を決定にするとホームに出しやすい'],
  '/events': ['撮影日は持ち物テンプレを使うと速い', '共有リンクを先に送ると出欠が集まりやすい'],
  '/me': ['ここから招待リンクをコピーできるよ', '表示名を変えるとチームで見分けやすい'],
}

export const RaftGuide = () => {
  const { pathname } = useLocation()
  const { data, ready } = useApp()

  const [hintIndex, setHintIndex] = useState(0)
  const [frameIndex, setFrameIndex] = useState(0)
  const [useRun, setUseRun] = useState(false)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [hasImage, setHasImage] = useState(true)

  const pendingResponses = useMemo(() => {
    const nextEvent = data.events
      .slice()
      .sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime())[0]

    if (!nextEvent) return 0

    const answered = data.responses.filter((response) => response.eventId === nextEvent.id).length
    return Math.max(0, data.members.length - answered)
  }, [data.events, data.members.length, data.responses])

  const hints = useMemo(() => {
    const scoped = routeHints[pathname] ?? ['必要なら右下のボタンから共有してね']
    if (!ready) {
      return ['同期中... ちょっと待ってね', 'データを読み込んでるよ']
    }
    if (data.plans.length === 0) {
      return ['まずは企画タブで1本目を作ろう', ...scoped]
    }
    if (data.events.length === 0) {
      return ['次は撮影日を作ると進行しやすい', ...scoped]
    }
    if (pendingResponses > 0) {
      return [`次の撮影の未回答が ${pendingResponses} 人いるよ`, ...scoped]
    }
    return scoped
  }, [pathname, ready, data.plans.length, data.events.length, pendingResponses])

  const frames = ready && !useRun ? idleFrames : runFrames

  useEffect(() => {
    const timer = window.setInterval(() => {
      setFrameIndex((prev) => (prev + 1) % frames.length)
    }, 260)
    return () => window.clearInterval(timer)
  }, [frames.length])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setHintIndex((prev) => (prev + 1) % hints.length)
    }, 5800)
    return () => window.clearInterval(timer)
  }, [hints.length])

  useEffect(() => {
    const timer = window.setInterval(() => {
      const x = Math.floor(Math.random() * 34) - 17
      const y = Math.floor(Math.random() * 22) - 11
      setOffset({ x, y })
      setUseRun(Math.abs(x) > 9 || Math.abs(y) > 5)
    }, 2200)
    return () => window.clearInterval(timer)
  }, [])

  return (
    <aside className="raft-guide" style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}>
      <div className="raft-guide-bg raft-guide-bg-a" />
      <div className="raft-guide-bg raft-guide-bg-b" />

      <div className="raft-bubble" onClick={() => setHintIndex((prev) => (prev + 1) % hints.length)}>
        {hints[hintIndex]}
      </div>

      <button
        className="raft-avatar"
        type="button"
        aria-label="ラフトのヒントを切り替える"
        onClick={() => setHintIndex((prev) => (prev + 1) % hints.length)}
      >
        {hasImage ? (
          <img
            src={frames[frameIndex]}
            alt="ラフト"
            onError={() => setHasImage(false)}
            className={useRun ? 'raft-running' : 'raft-idle'}
          />
        ) : (
          <span className="raft-fallback">RAFT</span>
        )}
      </button>
    </aside>
  )
}
