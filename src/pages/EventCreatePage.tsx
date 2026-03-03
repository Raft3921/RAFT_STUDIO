import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { eventChecklistTemplates, eventTemplateNames } from '../data/templates'
import { useApp } from '../store/AppContext'

export const EventCreatePage = () => {
  const { data, createEvent } = useApp()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const initialPlanId = searchParams.get('planId') || ''
  const [planId, setPlanId] = useState(initialPlanId)
  const [title, setTitle] = useState('')
  const [datetime, setDatetime] = useState('')
  const [meetingPoint, setMeetingPoint] = useState('Discord集合')
  const [location, setLocation] = useState('オンライン')
  const [timelineRaw, setTimelineRaw] = useState('開始\n撮影\n終了')
  const [templateName, setTemplateName] = useState(eventTemplateNames[0])
  const [extraChecklist, setExtraChecklist] = useState('')

  const selectedPlan = useMemo(() => data.plans.find((plan) => plan.id === planId), [data.plans, planId])

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const templateItems = eventChecklistTemplates[templateName]
    const extraItems = extraChecklist
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((label) => ({ label, scope: 'all' as const }))

    createEvent({
      title: title.trim() || `${selectedPlan?.title ?? '新規企画'} 撮影日`,
      planId: selectedPlan?.id,
      datetime,
      meetingPoint,
      location,
      timeline: timelineRaw
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean),
      checklist: [...templateItems, ...extraItems],
    })

    navigate('/events')
  }

  return (
    <form className="page-stack" onSubmit={onSubmit}>
      <section className="panel">
        <h2>撮影イベント作成</h2>
      </section>

      <section className="panel">
        <label>紐づける企画</label>
        <select className="field" value={planId} onChange={(event) => setPlanId(event.target.value)}>
          <option value="">未選択</option>
          {data.plans.map((plan) => (
            <option key={plan.id} value={plan.id}>
              {plan.title}
            </option>
          ))}
        </select>

        <label>タイトル</label>
        <input className="field" value={title} onChange={(event) => setTitle(event.target.value)} />

        <label>日時</label>
        <input
          className="field"
          type="datetime-local"
          value={datetime}
          onChange={(event) => setDatetime(event.target.value)}
          required
        />

        <label>集合</label>
        <input className="field" value={meetingPoint} onChange={(event) => setMeetingPoint(event.target.value)} />

        <label>場所</label>
        <input className="field" value={location} onChange={(event) => setLocation(event.target.value)} />
      </section>

      <section className="panel">
        <label>持ち物テンプレ</label>
        <div className="chip-row">
          {eventTemplateNames.map((name) => (
            <button
              className={`chip ${templateName === name ? 'active' : ''}`}
              type="button"
              key={name}
              onClick={() => setTemplateName(name)}
            >
              {name}
            </button>
          ))}
        </div>

        <label>追加持ち物（改行区切り）</label>
        <textarea
          className="field"
          rows={3}
          value={extraChecklist}
          onChange={(event) => setExtraChecklist(event.target.value)}
        />

        <label>段取り（改行区切り）</label>
        <textarea
          className="field"
          rows={4}
          value={timelineRaw}
          onChange={(event) => setTimelineRaw(event.target.value)}
        />
      </section>

      <button className="btn full" type="submit">
        撮影日を作成
      </button>
    </form>
  )
}
