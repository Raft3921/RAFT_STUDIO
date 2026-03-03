import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { attendanceLabel, buildLineMessage, buildShareUrl, formatDateTime, responseCount } from '../lib/utils'
import { useApp } from '../store/AppContext'
import type { Attendance } from '../types'

const attendanceOptions: Attendance[] = ['yes', 'no', 'maybe']

export const EventDetailPage = () => {
  const { id } = useParams()
  const { data, setAttendance, toggleChecklist } = useApp()
  const [comment, setComment] = useState('')

  const event = data.events.find((item) => item.id === id)
  const myResponse = data.responses.find((item) => item.eventId === id && item.userId === 'u-me')

  const counts = useMemo(() => (event ? responseCount(event.id, data.responses) : null), [event, data.responses])

  if (!event || !counts) {
    return <p className="panel">撮影日が見つかりません。</p>
  }

  const share = async () => {
    const url = buildShareUrl(`/events/${event.id}`)
    await navigator.clipboard.writeText(url)
    window.alert('共有リンクをコピーしました')
  }

  const notifyLine = () => {
    const text = buildLineMessage(event)
    window.open(`https://line.me/R/msg/text/?${encodeURIComponent(text)}`, '_blank')
  }

  return (
    <div className="page-stack">
      <section className="panel">
        <h2>{event.title}</h2>
        <p>{formatDateTime(event.datetime)}</p>
        <p>集合: {event.meetingPoint}</p>
        <p>場所: {event.location}</p>
      </section>

      <section className="panel">
        <h3>出欠</h3>
        <div className="chip-row">
          {attendanceOptions.map((option) => (
            <button
              key={option}
              className={`chip ${myResponse?.response === option ? 'active' : ''}`}
              onClick={() => setAttendance(event.id, option, comment)}
            >
              {attendanceLabel[option]}
            </button>
          ))}
        </div>
        <input
          className="field"
          placeholder="コメント（任意）"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
        <p className="muted">
          集計: ◯{counts.yes} / △{counts.no} / ?{counts.maybe}
        </p>
      </section>

      <section className="panel">
        <h3>持ち物チェック</h3>
        <div className="stack-gap">
          {event.checklist.map((item) => {
            const checked = item.doneBy.includes('u-me')
            return (
              <label className="check-row" key={item.id}>
                <input type="checkbox" checked={checked} onChange={() => toggleChecklist(event.id, item.id)} />
                <span>{item.label}</span>
              </label>
            )
          })}
        </div>
      </section>

      <section className="panel">
        <h3>当日の段取り</h3>
        <ol className="timeline">
          {event.timeline.map((item, index) => (
            <li key={`${item}-${index}`}>{item}</li>
          ))}
        </ol>
      </section>

      <div className="inline-row">
        <button className="btn" onClick={share}>
          共有リンク
        </button>
        <button className="btn warn" onClick={notifyLine}>
          LINE通知文を開く
        </button>
      </div>
    </div>
  )
}
