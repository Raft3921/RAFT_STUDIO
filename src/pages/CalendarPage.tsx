import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatDateTime } from '../lib/utils'
import { useApp } from '../store/AppContext'
import type { EventItem } from '../types'

const weekLabels = ['日', '月', '火', '水', '木', '金', '土']

const pad = (value: number) => String(value).padStart(2, '0')
const dayKey = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1)
const endOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0)
const addMonths = (date: Date, diff: number) => new Date(date.getFullYear(), date.getMonth() + diff, 1)

export const CalendarPage = () => {
  const { data } = useApp()
  const [baseMonth, setBaseMonth] = useState(() => startOfMonth(new Date()))

  const eventsByDay = useMemo(() => {
    const map = new Map<string, EventItem[]>()
    data.events.forEach((event) => {
      const key = dayKey(new Date(event.datetime))
      const list = map.get(key) ?? []
      map.set(key, [...list, event].sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime()))
    })
    return map
  }, [data.events])

  const monthStart = startOfMonth(baseMonth)
  const monthEnd = endOfMonth(baseMonth)
  const headBlankCount = monthStart.getDay()
  const dayCount = monthEnd.getDate()

  const cells: Array<{ date: Date | null }> = [
    ...Array.from({ length: headBlankCount }, () => ({ date: null })),
    ...Array.from({ length: dayCount }, (_, index) => ({
      date: new Date(baseMonth.getFullYear(), baseMonth.getMonth(), index + 1),
    })),
  ]

  const monthTitle = `${baseMonth.getFullYear()}年${baseMonth.getMonth() + 1}月`

  return (
    <div className="page-stack">
      <section className="panel">
        <div className="section-head">
          <h2>カレンダー</h2>
          <Link className="btn ghost" to="/events/new">
            撮影日作成
          </Link>
        </div>
        <div className="inline-row">
          <button type="button" className="chip" onClick={() => setBaseMonth((prev) => addMonths(prev, -1))}>
            ← 前月
          </button>
          <strong>{monthTitle}</strong>
          <button type="button" className="chip" onClick={() => setBaseMonth((prev) => addMonths(prev, 1))}>
            次月 →
          </button>
        </div>
      </section>

      <section className="panel">
        <div className="calendar-grid calendar-week">
          {weekLabels.map((label) => (
            <div key={label} className="calendar-week-cell">
              {label}
            </div>
          ))}
        </div>
        <div className="calendar-grid">
          {cells.map((cell, index) => {
            if (!cell.date) {
              return <div key={`blank-${index}`} className="calendar-cell calendar-cell-blank" />
            }
            const key = dayKey(cell.date)
            const events = eventsByDay.get(key) ?? []
            return (
              <div key={key} className="calendar-cell">
                <div className="calendar-date">{cell.date.getDate()}</div>
                <div className="calendar-events">
                  {events.slice(0, 2).map((event) => (
                    <Link key={event.id} to={`/events/${event.id}`} className="calendar-event-link">
                      {new Date(event.datetime).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}{' '}
                      {event.title}
                    </Link>
                  ))}
                  {events.length > 2 && <span className="muted">+{events.length - 2}件</span>}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <section className="panel">
        <h3>この月の撮影日</h3>
        {data.events
          .filter((event) => {
            const date = new Date(event.datetime)
            return date.getFullYear() === baseMonth.getFullYear() && date.getMonth() === baseMonth.getMonth()
          })
          .sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime())
          .map((event) => (
            <Link key={event.id} to={`/events/${event.id}`} className="card link-card">
              <strong>{event.title}</strong>
              <p>{formatDateTime(event.datetime)}</p>
            </Link>
          ))}
      </section>
    </div>
  )
}
