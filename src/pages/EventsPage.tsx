import { Link } from 'react-router-dom'
import { formatDateTime, responseCount } from '../lib/utils'
import { useApp } from '../store/AppContext'

export const EventsPage = () => {
  const { data } = useApp()

  const events = [...data.events].sort(
    (a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime(),
  )

  return (
    <div className="page-stack">
      <section className="panel">
        <div className="section-head">
          <h2>撮影日一覧</h2>
          <Link className="btn" to="/events/new">
            撮影日作成
          </Link>
        </div>
      </section>

      <section className="panel">
        {events.length === 0 && <p className="muted">撮影日はまだありません。</p>}
        {events.map((event) => {
          const counts = responseCount(event.id, data.responses)
          const pending = data.members.length - (counts.yes + counts.no + counts.maybe)
          const unchecked = event.checklist.filter((item) => item.doneBy.length === 0).length
          return (
            <Link key={event.id} to={`/events/${event.id}`} className="card link-card">
              <strong>{event.title}</strong>
              <p>{formatDateTime(event.datetime)}</p>
              <p>
                集合: {event.meetingPoint} / 場所: {event.location}
              </p>
              <p>
                出欠: ◯{counts.yes} / △{counts.no} / ?{counts.maybe} / 未回答 {pending}
              </p>
              <p>持ち物: 未チェック {unchecked}</p>
            </Link>
          )
        })}
      </section>
    </div>
  )
}
