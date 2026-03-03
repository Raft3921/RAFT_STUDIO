import { Link } from 'react-router-dom'
import { formatDuration, participantSummaryText, roleSummaryText } from '../lib/plan'
import { useApp } from '../store/AppContext'
import { formatDateTime, nextEvent, responseCount, statusLabel } from '../lib/utils'

export const HomePage = () => {
  const { data } = useApp()
  const upcoming = nextEvent(data.events)
  const inProgressPlans = data.plans.filter((plan) => ['confirmed', 'shot'].includes(plan.status)).slice(0, 4)

  const completionPoints =
    (data.plans.length > 0 ? 35 : 0) +
    (data.events.length > 0 ? 35 : 0) +
    (upcoming && responseCount(upcoming.id, data.responses).maybe === 0 ? 30 : 10)

  const nextStep = (() => {
    if (data.plans.length === 0) return 'まず企画1枚。話はそれから。'
    if (data.events.length === 0) return '撮影日を1つ作る。逃げない。'
    if (upcoming) {
      const counts = responseCount(upcoming.id, data.responses)
      const unanswered = data.members.length - (counts.yes + counts.no + counts.maybe)
      if (unanswered > 0) return `未回答 ${unanswered} 人。出欠から片付ける。`
    }
    return '次の公開へ。決定ステータスまで進める。'
  })()

  return (
    <div className="page-stack">
      <section className="panel hero-panel">
        <p className="hero-kicker">QUEST</p>
        <h2>本日のクエスト</h2>
        <p>{nextStep}</p>
        <div className="progress-wrap" aria-label="進行度">
          <div className="progress-fill" style={{ width: `${Math.min(100, completionPoints)}%` }} />
        </div>
        <p className="muted">進行度 {Math.min(100, completionPoints)}%</p>
        <div className="inline-row">
          <Link className="btn btn-primary" to="/plans/new">
            企画を作る
          </Link>
          <Link className="btn btn-secondary" to="/events/new">
            撮影日を作る
          </Link>
        </div>
      </section>

      <section className="panel">
        <h2>次の撮影</h2>
        {!upcoming && <p className="muted">まだ撮影日がありません。</p>}
        {upcoming && (
          <div className="card">
            <strong>{upcoming.title}</strong>
            <p>{formatDateTime(upcoming.datetime)}</p>
            <p>集合: {upcoming.meetingPoint}</p>
            <p>場所: {upcoming.location}</p>
            <div className="inline-row">
              {(() => {
                const counts = responseCount(upcoming.id, data.responses)
                return (
                  <span className="muted">
                    出欠: ◯{counts.yes} / △{counts.no} / ?{counts.maybe}
                  </span>
                )
              })()}
            </div>
            <div className="inline-row">
              <Link className="btn" to={`/events/${upcoming.id}`}>
                出欠する
              </Link>
              <Link className="btn ghost" to={`/events/${upcoming.id}`}>
                持ち物を見る
              </Link>
            </div>
          </div>
        )}
      </section>

      <section className="panel">
        <div className="section-head">
          <h2>進行中の企画</h2>
          <Link to="/plans" className="mini-link">
            一覧へ
          </Link>
        </div>
        {inProgressPlans.length === 0 && <p className="muted">進行中の企画はありません。</p>}
        {inProgressPlans.map((plan) => (
          <Link className="card link-card" key={plan.id} to={`/plans/${plan.id}`}>
            <strong>{plan.title}</strong>
            <p>
              {statusLabel[plan.status]} / {formatDuration(plan.durationSec)} / {participantSummaryText(plan, data.members)}
            </p>
            <p className="muted">{roleSummaryText(plan, data.members, 3)}</p>
          </Link>
        ))}
      </section>
    </div>
  )
}
