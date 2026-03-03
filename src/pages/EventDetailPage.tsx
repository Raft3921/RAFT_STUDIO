import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { roleDefinitions } from '../data/templates'
import { resolveRoleNames } from '../lib/plan'
import { attendanceLabel, buildLineMessage, buildShareUrl, formatDateTime, responseCount } from '../lib/utils'
import { useApp } from '../store/AppContext'
import type { Attendance } from '../types'

const attendanceOptions: Attendance[] = ['yes', 'no', 'maybe']

export const EventDetailPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data, setAttendance, toggleChecklist, currentUserId, updateEvent, deleteEvent } = useApp()
  const [comment, setComment] = useState('')
  const [draft, setDraft] = useState<{
    title: string
    datetime: string
    meetingPoint: string
    location: string
  } | null>(null)

  const event = data.events.find((item) => item.id === id)
  const linkedPlan = data.plans.find((plan) => plan.id === event?.planId)
  const myResponse = data.responses.find((item) => item.eventId === id && item.userId === currentUserId)

  const counts = useMemo(() => (event ? responseCount(event.id, data.responses) : null), [event, data.responses])
  const visibleChecklist = useMemo(
    () =>
      event
        ? event.checklist.filter(
            (item) => item.scope !== 'member' || !item.assigneeIds || item.assigneeIds.includes(currentUserId),
          )
        : [],
    [currentUserId, event],
  )

  if (!event || !counts) {
    return <p className="panel">撮影日が見つかりません。</p>
  }
  const editing = draft !== null

  const share = async () => {
    const url = buildShareUrl(`/events/${event.id}`)
    await navigator.clipboard.writeText(url)
    window.alert('共有リンクをコピーしました')
  }

  const notifyLine = () => {
    const text = buildLineMessage(event)
    window.open(`https://line.me/R/msg/text/?${encodeURIComponent(text)}`, '_blank')
  }

  const saveEdit = async () => {
    if (!draft) return
    await updateEvent(event.id, {
      title: draft.title.trim() || event.title,
      datetime: draft.datetime,
      meetingPoint: draft.meetingPoint.trim() || event.meetingPoint,
      location: draft.location.trim() || event.location,
    })
    setDraft(null)
  }

  const removeEvent = async () => {
    if (!window.confirm('この撮影日を削除しますか？')) return
    await deleteEvent(event.id)
    navigate('/events')
  }

  return (
    <div className="page-stack">
      <section className="panel">
        <h2>{editing ? '撮影日を編集' : event.title}</h2>
        {editing ? (
          <>
            <label>タイトル</label>
            <input
              className="field"
              value={draft?.title ?? ''}
              onChange={(e) =>
                setDraft((prev) =>
                  prev
                    ? { ...prev, title: e.target.value }
                    : {
                        title: e.target.value,
                        datetime: event.datetime,
                        meetingPoint: event.meetingPoint,
                        location: event.location,
                      },
                )
              }
            />
            <label>日時</label>
            <input
              className="field"
              type="datetime-local"
              value={draft?.datetime ?? ''}
              onChange={(e) =>
                setDraft((prev) =>
                  prev
                    ? { ...prev, datetime: e.target.value }
                    : {
                        title: event.title,
                        datetime: e.target.value,
                        meetingPoint: event.meetingPoint,
                        location: event.location,
                      },
                )
              }
            />
            <label>集合</label>
            <input
              className="field"
              value={draft?.meetingPoint ?? ''}
              onChange={(e) =>
                setDraft((prev) =>
                  prev
                    ? { ...prev, meetingPoint: e.target.value }
                    : {
                        title: event.title,
                        datetime: event.datetime,
                        meetingPoint: e.target.value,
                        location: event.location,
                      },
                )
              }
            />
            <label>場所</label>
            <input
              className="field"
              value={draft?.location ?? ''}
              onChange={(e) =>
                setDraft((prev) =>
                  prev
                    ? { ...prev, location: e.target.value }
                    : {
                        title: event.title,
                        datetime: event.datetime,
                        meetingPoint: event.meetingPoint,
                        location: e.target.value,
                      },
                )
              }
            />
          </>
        ) : (
          <>
            <p>{formatDateTime(event.datetime)}</p>
            <p>集合: {event.meetingPoint}</p>
            <p>場所: {event.location}</p>
          </>
        )}
        <div className="inline-row">
          {editing ? (
            <>
              <button className="btn" onClick={saveEdit}>
                保存
              </button>
              <button className="btn ghost" onClick={() => setDraft(null)}>
                キャンセル
              </button>
            </>
          ) : (
            <>
              <button
                className="btn ghost"
                onClick={() =>
                  setDraft({
                    title: event.title,
                    datetime: event.datetime,
                    meetingPoint: event.meetingPoint,
                    location: event.location,
                  })
                }
              >
                編集
              </button>
              <button className="btn warn" onClick={removeEvent}>
                削除
              </button>
            </>
          )}
        </div>
      </section>

      {linkedPlan && (
        <section className="panel">
          <h3>役割（企画から）</h3>
          <div className="stack-gap">
            {roleDefinitions.map((role) => (
              <p key={role.id}>
                {role.label.split('（')[0]}: {resolveRoleNames(linkedPlan.roleAssignments[role.id] ?? [], data.members)}
              </p>
            ))}
          </div>
        </section>
      )}

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
          {visibleChecklist.map((item) => {
            const checked = item.doneBy.includes(currentUserId)
            return (
              <label className="check-row" key={item.id}>
                <input type="checkbox" checked={checked} onChange={() => toggleChecklist(event.id, item.id)} />
                <span>{item.label}</span>
              </label>
            )
          })}
          {visibleChecklist.length === 0 && <p className="muted">あなた向けの持ち物はありません。</p>}
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
