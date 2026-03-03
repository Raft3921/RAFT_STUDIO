import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { eventChecklistTemplates, eventTemplateNames } from '../data/templates'
import { roleSummaryText } from '../lib/plan'
import { useApp } from '../store/AppContext'
import type { EventChecklistItem } from '../types'

type ChecklistDraftItem = Pick<EventChecklistItem, 'label' | 'scope' | 'assigneeIds'>

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
  const [itemScopes, setItemScopes] = useState<Record<string, 'all' | 'member'>>({})
  const [itemAssignees, setItemAssignees] = useState<Record<string, string[]>>({})

  const selectedPlan = useMemo(() => data.plans.find((plan) => plan.id === planId), [data.plans, planId])
  const targetMembers = useMemo(
    () =>
      selectedPlan
        ? data.members.filter((member) => selectedPlan.participantIds.includes(member.id))
        : data.members,
    [data.members, selectedPlan],
  )
  const checklistDraft = useMemo(() => {
    const templateItems = eventChecklistTemplates[templateName].map((item) => ({ ...item, source: 'template' as const }))
    const extraItems = extraChecklist
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((label) => ({ label, scope: 'all' as const, source: 'extra' as const }))

    return [...templateItems, ...extraItems].map((item, index) => ({
      key: `${item.source}-${index}-${item.label}`,
      label: item.label,
      defaultScope: item.scope,
    }))
  }, [templateName, extraChecklist])

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const checklist: ChecklistDraftItem[] = checklistDraft.map((item) => {
      const selectedScope = itemScopes[item.key] ?? (item.defaultScope === 'all' ? 'all' : 'member')
      const assigneeIds = itemAssignees[item.key] ?? []
      if (selectedScope === 'member' && assigneeIds.length > 0) {
        return { label: item.label, scope: 'member', assigneeIds }
      }
      return { label: item.label, scope: 'all', assigneeIds: [] }
    })

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
      checklist,
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
        {selectedPlan && <p className="muted">役割: {roleSummaryText(selectedPlan, data.members, 5)}</p>}

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
        <p className="muted">持ち物ごとに担当メンバーを設定できます。</p>
        <div className="stack-gap">
          {checklistDraft.map((item) => {
            const mode = itemScopes[item.key] ?? (item.defaultScope === 'all' ? 'all' : 'member')
            const selectedAssignees = itemAssignees[item.key] ?? []

            return (
              <div className="role-row" key={item.key}>
                <strong>{item.label}</strong>
                <div className="chip-row">
                  <button
                    type="button"
                    className={`chip ${mode === 'all' ? 'active' : ''}`}
                    onClick={() =>
                      setItemScopes((prev) => ({
                        ...prev,
                        [item.key]: 'all',
                      }))
                    }
                  >
                    全員
                  </button>
                  <button
                    type="button"
                    className={`chip ${mode === 'member' ? 'active' : ''}`}
                    onClick={() =>
                      setItemScopes((prev) => ({
                        ...prev,
                        [item.key]: 'member',
                      }))
                    }
                  >
                    メンバー指定
                  </button>
                </div>
                {mode === 'member' && (
                  <div className="chip-row">
                    {targetMembers.map((member) => (
                      <button
                        type="button"
                        key={`${item.key}-${member.id}`}
                        className={`chip ${selectedAssignees.includes(member.id) ? 'active' : ''}`}
                        onClick={() =>
                          setItemAssignees((prev) => {
                            const current = prev[item.key] ?? []
                            const next = current.includes(member.id)
                              ? current.filter((id) => id !== member.id)
                              : [...current, member.id]
                            return { ...prev, [item.key]: next }
                          })
                        }
                      >
                        {member.displayName}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

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
