import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useApp } from '../store/AppContext'

type MotionMode = 'idle' | 'run' | 'squat'

const frameSets: Record<MotionMode, string[]> = {
  idle: ['/raft/idle1.png', '/raft/idle2.png', '/raft/idle3.png'],
  run: ['/raft/run1.png', '/raft/run2.png', '/raft/run3.png', '/raft/run4.png', '/raft/run5.png', '/raft/run6.png'],
  squat: ['/raft/squat1.png', '/raft/squat2.png'],
}

const routeHintMap: Record<string, string[]> = {
  '/home': ['今日やるのは1つでOK。次の撮影カードから進めよう', '未回答を埋めるだけでも進行が一気に楽になる'],
  '/plans': ['企画はテンプレ選択だけで完成まで持っていける', '役割を先に決めると撮影日の調整が速い'],
  '/plans/new': ['尺はプリセットから選んで10秒調整すると決めやすい', 'テンプレ割り当てで役割をまず埋めよう'],
  '/events': ['次回撮影の未回答を0人にすると当日が安定する', '集合情報と持ち物を先に固めよう'],
  '/events/new': ['紐づけ企画を選ぶと役割が引き継げる', '段取りは3行だけでも十分効果がある'],
  '/me': ['招待リンクを送れば同じワークスペースで共有できる', '表示名を先に整えると役割表示が見やすい'],
}

const getPathKey = (pathname: string) => {
  if (pathname.startsWith('/plans/new')) return '/plans/new'
  if (pathname.startsWith('/plans/')) return '/plans'
  if (pathname.startsWith('/events/new')) return '/events/new'
  if (pathname.startsWith('/events/')) return '/events'
  if (pathname.startsWith('/home')) return '/home'
  if (pathname.startsWith('/me')) return '/me'
  return '/home'
}

export const RaftGuide = () => {
  const { pathname } = useLocation()
  const { data, ready } = useApp()

  const [hintIndex, setHintIndex] = useState(0)
  const [frameIndex, setFrameIndex] = useState(0)
  const [motion, setMotion] = useState<MotionMode>('idle')
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [hasImage, setHasImage] = useState(true)

  const pathKey = getPathKey(pathname)

  const pendingResponses = useMemo(() => {
    const nextEvent = data.events
      .slice()
      .sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime())[0]

    if (!nextEvent) return 0

    const answered = data.responses.filter((response) => response.eventId === nextEvent.id).length
    return Math.max(0, data.members.length - answered)
  }, [data.events, data.members.length, data.responses])

  const hints = useMemo(() => {
    const routeHints = routeHintMap[pathKey] ?? ['必要なら共有リンクを送って一緒に進めよう']

    if (!ready) {
      return ['データ同期中。終わったら次の一手を案内するよ']
    }

    if (data.plans.length === 0) {
      return ['まずは企画を1つ作って土台を作ろう', ...routeHints]
    }

    if (data.events.length === 0) {
      return ['次は撮影日を1つ作ろう。公開までの流れが見える', ...routeHints]
    }

    if (pendingResponses > 0) {
      return [`次の撮影で未回答が${pendingResponses}人。ここを埋めると進行が軽くなる`, ...routeHints]
    }

    return ['いい流れ。次は公開予定日まで埋めていこう', ...routeHints]
  }, [pathKey, ready, data.plans.length, data.events.length, pendingResponses])

  const currentFrames = frameSets[motion]

  useEffect(() => {
    const intervalMs = motion === 'run' ? 110 : motion === 'squat' ? 320 : 420
    const timer = window.setInterval(() => {
      setFrameIndex((prev) => (prev + 1) % currentFrames.length)
    }, intervalMs)
    return () => window.clearInterval(timer)
  }, [motion, currentFrames.length])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setHintIndex((prev) => (prev + 1) % hints.length)
    }, 13000)
    return () => window.clearInterval(timer)
  }, [hints.length])

  useEffect(() => {
    const timer = window.setInterval(() => {
      const roll = Math.random()

      if (roll < 0.22) {
        setMotion('squat')
        setOffset({ x: 0, y: 4 })
        return
      }

      const x = Math.floor(Math.random() * 46) - 23
      const y = Math.floor(Math.random() * 20) - 10
      setOffset({ x, y })
      setMotion(Math.abs(x) > 8 || Math.abs(y) > 4 ? 'run' : 'idle')
    }, 3600)

    return () => window.clearInterval(timer)
  }, [])

  return (
    <aside className="raft-guide" style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}>
      <div className="raft-guide-bg raft-guide-bg-a" />
      <div className="raft-guide-bg raft-guide-bg-b" />

      <div className="raft-bubble" onClick={() => setHintIndex((prev) => (prev + 1) % hints.length)}>
        {hints[hintIndex % hints.length]}
      </div>

      <button
        className="raft-avatar"
        type="button"
        aria-label="ラフトのヒントを切り替える"
        onClick={() => setHintIndex((prev) => (prev + 1) % hints.length)}
      >
        {hasImage ? (
          <img src={currentFrames[frameIndex % currentFrames.length]} alt="ラフト" onError={() => setHasImage(false)} />
        ) : (
          <img src="/raft/idle1.png" alt="ラフト" />
        )}
      </button>
    </aside>
  )
}
