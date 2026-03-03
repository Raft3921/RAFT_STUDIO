import { Link } from 'react-router-dom'
import { useApp } from '../store/AppContext'
import { formatDateTime, nextEvent, responseCount, statusLabel } from '../lib/utils'

export const HomePage = () => {
  const { data } = useApp()
  const upcoming = nextEvent(data.events)
  const inProgressPlans = data.plans.filter((plan) => ['confirmed', 'shot'].includes(plan.status)).slice(0, 4)

  return (
    <div className="page-stack">
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
              {statusLabel[plan.status]} / {plan.duration} / {plan.memberSize}
            </p>
          </Link>
        ))}
      </section>
    </div>
  )
}
