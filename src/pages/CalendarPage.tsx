import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatDateTime } from '../lib/utils'
import { useApp } from '../store/AppContext'
import type { CalendarMark, CalendarMarkKind, EventItem } from '../types'

const weekLabels = ['日', '月', '火', '水', '木', '金', '土']
const kindOrder: CalendarMarkKind[] = ['shoot', 'edit', 'post']
const kindMeta: Record<CalendarMarkKind, { label: string; symbol: string; className: string }> = {
  shoot: { label: '撮影', symbol: 'REC', className: 'kind-shoot' },
  edit: { label: '編集', symbol: 'EDIT', className: 'kind-edit' },
  post: { label: '投稿', symbol: 'UP', className: 'kind-post' },
}

const pad = (value: number) => String(value).padStart(2, '0')
const dayKey = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1)
const endOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0)
const addMonths = (date: Date, diff: number) => new Date(date.getFullYear(), date.getMonth() + diff, 1)
const todayKey = dayKey(new Date())

const inRange = (key: string, startDate: string, endDate: string) => key >= startDate && key <= endDate

export const CalendarPage = () => {
  const { data, currentUserId, createCalendarMark, updateCalendarMark, deleteCalendarMark } = useApp()
  const [baseMonth, setBaseMonth] = useState(() => startOfMonth(new Date()))
  const [showEditor, setShowEditor] = useState(false)
  const [editingId, setEditingId] = useState('')
  const [kind, setKind] = useState<CalendarMarkKind>('shoot')
  const [startDate, setStartDate] = useState(todayKey)
  const [endDate, setEndDate] = useState(todayKey)
  const [title, setTitle] = useState('')
  const [selectingRange, setSelectingRange] = useState(false)
  const [rangeAnchor, setRangeAnchor] = useState<string | null>(null)

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
  const me = data.members.find((member) => member.id === currentUserId)
  const canEditMarks = (me?.displayName.trim() ?? '') === 'ラフト'
  const monthMarks = data.calendarMarks
    .filter((mark) => {
      const monthStartKey = dayKey(monthStart)
      const monthEndKey = dayKey(monthEnd)
      return !(mark.endDate < monthStartKey || mark.startDate > monthEndKey)
    })
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

  const marksByDay = new Map<string, CalendarMark[]>()
  cells.forEach((cell) => {
    if (!cell.date) return
    const key = dayKey(cell.date)
    const marks = monthMarks.filter((mark) => inRange(key, mark.startDate, mark.endDate))
    marksByDay.set(key, marks)
  })

  const loadToEditor = (mark: CalendarMark) => {
    setEditingId(mark.id)
    setKind(mark.kind)
    setStartDate(mark.startDate)
    setEndDate(mark.endDate)
    setTitle(mark.title ?? '')
    setShowEditor(true)
  }

  const onSaveMark = async () => {
    const payload = { kind, startDate, endDate, title }
    if (editingId) {
      await updateCalendarMark(editingId, payload)
    } else {
      await createCalendarMark(payload)
    }
    setEditingId('')
    setTitle('')
    setSelectingRange(false)
    setRangeAnchor(null)
  }

  const onTapDateForRange = (day: string) => {
    if (!selectingRange) return
    if (!rangeAnchor) {
      setRangeAnchor(day)
      setStartDate(day)
      setEndDate(day)
      return
    }
    if (day >= rangeAnchor) {
      setStartDate(rangeAnchor)
      setEndDate(day)
    } else {
      setStartDate(day)
      setEndDate(rangeAnchor)
    }
    setRangeAnchor(null)
  }

  return (
    <div className="page-stack">
      <section className="panel">
        <div className="section-head">
          <h2>カレンダー</h2>
          <div className="inline-row">
            {canEditMarks && (
              <button className="btn ghost" type="button" onClick={() => setShowEditor((prev) => !prev)}>
                {showEditor ? '編集メニューを閉じる' : '編集メニュー'}
              </button>
            )}
            <Link className="btn ghost" to="/events/new">
              撮影日作成
            </Link>
          </div>
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

      {showEditor && canEditMarks && (
        <section className="panel">
          <h3>{editingId ? 'カレンダー記号を編集' : 'カレンダー記号を追加'}</h3>
          <label>種類</label>
          <select className="field" value={kind} onChange={(event) => setKind(event.target.value as CalendarMarkKind)}>
            {kindOrder.map((item) => (
              <option key={item} value={item}>
                {kindMeta[item].label}
              </option>
            ))}
          </select>
          <label>メモ（任意）</label>
          <input className="field" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="例: 一次編集" />
          <label>開始日 / 終了日</label>
          <div className="inline-row">
            <input className="field" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
            <input className="field" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
          </div>
          <div className="calendar-range-arrow" aria-label="範囲プレビュー">
            <span>{startDate}</span>
            <span className="calendar-range-arrow-line" />
            <span>{endDate}</span>
          </div>
          <button
            type="button"
            className={`chip ${selectingRange ? 'active' : ''}`}
            onClick={() => {
              setSelectingRange((prev) => !prev)
              setRangeAnchor(null)
            }}
          >
            {selectingRange ? '範囲指定モード中（カレンダーの日付を2回タップ）' : '範囲指定モード'}
          </button>
          <div className="inline-row">
            <button className="btn" type="button" onClick={() => void onSaveMark()}>
              {editingId ? '更新' : '追加'}
            </button>
            {editingId && (
              <button
                className="btn warn"
                type="button"
                onClick={() => {
                  setEditingId('')
                  setTitle('')
                }}
              >
                新規入力に戻す
              </button>
            )}
          </div>
        </section>
      )}

      <section className="panel">
        <div className="calendar-legend">
          {kindOrder.map((item) => (
            <span key={item} className={`calendar-mark-badge ${kindMeta[item].className}`}>
              {kindMeta[item].symbol} {kindMeta[item].label}
            </span>
          ))}
        </div>
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
            const dayMarks = marksByDay.get(key) ?? []
            const isInSelectedRange = selectingRange && inRange(key, startDate, endDate)
            return (
              <div
                key={key}
                className={`calendar-cell ${isInSelectedRange ? 'calendar-cell-range' : ''}`}
                role={selectingRange ? 'button' : undefined}
                tabIndex={selectingRange ? 0 : -1}
                onClick={() => onTapDateForRange(key)}
                onKeyDown={(event) => {
                  if (!selectingRange) return
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    onTapDateForRange(key)
                  }
                }}
              >
                <div className="calendar-date">{cell.date.getDate()}</div>
                <div className="calendar-mark-row">
                  {kindOrder.map((k) => {
                    const has = dayMarks.some((mark) => mark.kind === k)
                    return (
                      <span key={k} className={`calendar-mark-dot ${kindMeta[k].className} ${has ? 'active' : ''}`}>
                        {kindMeta[k].symbol}
                      </span>
                    )
                  })}
                </div>
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
        <h3>この月の目安（撮影/編集/投稿）</h3>
        {monthMarks.length === 0 && <p className="muted">まだ目安はありません。</p>}
        {monthMarks.map((mark) => (
          <div key={mark.id} className="card">
            <p>
              <span className={`calendar-mark-badge ${kindMeta[mark.kind].className}`}>{kindMeta[mark.kind].symbol}</span>{' '}
              {kindMeta[mark.kind].label} / {mark.startDate} → {mark.endDate}
            </p>
            {mark.title && <p className="muted">{mark.title}</p>}
            {canEditMarks && (
              <div className="inline-row">
                <button className="btn ghost" type="button" onClick={() => loadToEditor(mark)}>
                  編集
                </button>
                <button className="btn warn" type="button" onClick={() => void deleteCalendarMark(mark.id)}>
                  削除
                </button>
              </div>
            )}
          </div>
        ))}
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
