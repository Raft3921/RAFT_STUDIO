import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useApp } from '../store/AppContext'

type MotionMode = 'idle' | 'run' | 'squat'
type HintKind = '案内'

interface HintItem {
  kind: HintKind
  text: string
}

const hint = (kind: HintKind, text: string): HintItem => ({ kind, text })

const assetUrl = (fileName: string) => `${import.meta.env.BASE_URL}raft/${fileName}`

const frameSets: Record<MotionMode, string[]> = {
  idle: [assetUrl('idle1.png'), assetUrl('idle2.png'), assetUrl('idle3.png')],
  run: [
    assetUrl('run1.png'),
    assetUrl('run2.png'),
    assetUrl('run3.png'),
    assetUrl('run4.png'),
    assetUrl('run5.png'),
    assetUrl('run6.png'),
  ],
  squat: [assetUrl('squat1.png'), assetUrl('squat2.png')],
}

const tabGuides: Record<string, HintItem[]> = {
  '/home': [
    hint('案内', 'まず企画。話はそれから。'),
    hint('案内', '出欠、空欄。犯人はだれ。'),
    hint('案内', '集合書いとこ。聞かれる回数が減る。'),
    hint('案内', '未定でも押しとこ。あとで変えられる。'),
  ],
  '/plans': [
    hint('案内', 'タイトル迷ったら、あとでいい。'),
    hint('案内', '尺を決めると、編集が助かる。'),
    hint('案内', 'ジャンル0はさすがに無属性。'),
    hint('案内', '司会いないと進行が迷子。'),
  ],
  '/plans/new': [
    hint('案内', '出るメンバー先に選ぶと迷子にならない。'),
    hint('案内', '役割は必須だけ先に埋めればOK。'),
    hint('案内', '出欠だけ押して。マジ助かる。'),
  ],
  '/events': [
    hint('案内', '集合書いとこ。聞かれる回数が減る。'),
    hint('案内', '持ち物チェックすると、当日が平和。'),
    hint('案内', '未定でも押して。あとで変えられる。'),
    hint('案内', '参加むずいも正義。早いほど正義。'),
  ],
  '/events/new': [
    hint('案内', '集合と場所だけ入れれば運用できる。'),
    hint('案内', '段取りは3行あれば実戦で使える。'),
  ],
  '/me': [
    hint('案内', '招待リンクを送ると共有が始まる。'),
    hint('案内', '表示名を整えた。もうチーム運用できる。'),
  ],
}

const genericAttendanceHints: HintItem[] = [
  hint('案内', '出欠だけ先に押して。マジ助かる。'),
  hint('案内', '参加/不参加だけでも押しとこ。'),
  hint('案内', '未定でもOK。押しとけば進む。'),
  hint('案内', '出欠が空欄だと、予定が組めん...!'),
  hint('案内', '"未回答"がいると、時間が決められないやつ。'),
  hint('案内', '出欠は3秒。悩むのはそのあとでOK。'),
]

const successHints: HintItem[] = [
  hint('案内', '出欠が揃うと、段取りが決まる。'),
  hint('案内', '出欠埋める=全員のストレス減る。'),
  hint('案内', 'この進み方、かなり良い。次もこの調子。'),
]

const getPathKey = (pathname: string) => {
  if (pathname.startsWith('/plans/new')) return '/plans/new'
  if (pathname.startsWith('/plans/')) return '/plans'
  if (pathname.startsWith('/events/new')) return '/events/new'
  if (pathname.startsWith('/events/')) return '/events'
  if (pathname.startsWith('/home')) return '/home'
  if (pathname.startsWith('/me')) return '/me'
  return '/home'
}

const pickByIndex = (items: HintItem[], index: number) => items[index % items.length]

export const RaftGuide = () => {
  const { pathname } = useLocation()
  const { data, ready } = useApp()

  const [hintIndex, setHintIndex] = useState(0)
  const [frameIndex, setFrameIndex] = useState(0)
  const [motion, setMotion] = useState<MotionMode>('idle')
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [hasImage, setHasImage] = useState(true)

  const pathKey = getPathKey(pathname)

  const situation = useMemo(() => {
    const nextEvent = data.events
      .slice()
      .sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime())[0]

    const answered = nextEvent
      ? data.responses.filter((response) => response.eventId === nextEvent.id).length
      : 0

    const pendingResponses = nextEvent ? Math.max(0, data.members.length - answered) : 0

    return {
      hasPlan: data.plans.length > 0,
      hasEvent: data.events.length > 0,
      pendingResponses,
      hasMeetingInfo: nextEvent ? !!nextEvent.meetingPoint && !!nextEvent.location : false,
      pendingChecklist: nextEvent
        ? nextEvent.checklist.filter((item) => item.doneBy.length === 0).length
        : 0,
    }
  }, [data.events, data.members.length, data.plans.length, data.responses])

  const hints = useMemo(() => {
    if (!ready) {
      return [hint('案内', '同期中。終わったら次にやることを教える。')]
    }

    const scoped = tabGuides[pathKey] ?? tabGuides['/home']

    if (!situation.hasPlan) {
      return [hint('案内', 'まず企画を1つ作ろう。ここが全部の始点。'), ...scoped]
    }

    if (!situation.hasEvent) {
      return [hint('案内', '次は撮影日。1つ入れるだけで進行が見える。'), ...scoped]
    }

    if (situation.pendingResponses > 0) {
      return [
        hint('案内', `未回答が${situation.pendingResponses}人いる。先に回収しよう。`),
        ...genericAttendanceHints,
        ...scoped,
      ]
    }

    if (!situation.hasMeetingInfo) {
      return [hint('案内', '集合か場所が未入力。ここ埋まると当日が静か。'), ...scoped]
    }

    if (situation.pendingChecklist > 0) {
      return [
        hint('案内', `持ち物の未チェックが${situation.pendingChecklist}個。今のうちに潰そう。`),
        ...scoped,
      ]
    }

    return [...successHints, ...scoped]
  }, [pathKey, ready, situation])

  const currentHint = pickByIndex(hints, hintIndex)
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
    }, 16000)
    return () => window.clearInterval(timer)
  }, [hints.length])

  useEffect(() => {
    const timer = window.setInterval(() => {
      const roll = Math.random()

      if (roll < 0.18) {
        setMotion('squat')
        setOffset({ x: 0, y: 4 })
        return
      }

      const x = Math.floor(Math.random() * 46) - 23
      const y = Math.floor(Math.random() * 20) - 10
      setOffset({ x, y })
      setMotion(Math.abs(x) > 8 || Math.abs(y) > 4 ? 'run' : 'idle')
    }, 3800)

    return () => window.clearInterval(timer)
  }, [])

  return (
    <aside className="raft-guide" style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}>
      <div className="raft-guide-bg raft-guide-bg-a" />
      <div className="raft-guide-bg raft-guide-bg-b" />

      <div className="raft-bubble" onClick={() => setHintIndex((prev) => (prev + 1) % hints.length)}>
        <span className={`raft-bubble-kind kind-${currentHint.kind}`}>{currentHint.kind}</span>
        <span>{currentHint.text}</span>
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
          <img src={assetUrl('idle1.png')} alt="ラフト" />
        )}
      </button>
    </aside>
  )
}
