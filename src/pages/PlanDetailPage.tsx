import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { formatDuration, participantSummaryText, resolveRoleNames } from '../lib/plan'
import { roleDefinitions } from '../data/templates'
import { StatusBadge } from '../components/StatusBadge'
import { buildShareUrl, statusOrder } from '../lib/utils'
import { useApp } from '../store/AppContext'
import type { PlanStatus } from '../types'

export const PlanDetailPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data, updatePlanStatus, updatePlan, deletePlan } = useApp()
  const [draft, setDraft] = useState<{ title: string; memo: string } | null>(null)

  const plan = data.plans.find((item) => item.id === id)
  const relatedEvents = data.events.filter((event) => event.planId === id)

  if (!plan) {
    return <p className="panel">企画が見つかりません。</p>
  }
  const editing = draft !== null

  const share = async () => {
    const url = buildShareUrl(`/plans/${plan.id}`)
    await navigator.clipboard.writeText(url)
    window.alert('共有リンクをコピーしました')
  }

  const saveEdit = async () => {
    if (!draft) return
    await updatePlan(plan.id, {
      title: draft.title.trim() || plan.title,
      memo: draft.memo.trim(),
    })
    setDraft(null)
  }

  const removePlan = async () => {
    if (!window.confirm('この企画を削除しますか？')) return
    await deletePlan(plan.id)
    navigate('/plans')
  }

  return (
    <div className="page-stack">
      <section className="panel">
        <div className="section-head">
          <h2>{editing ? '企画を編集' : plan.title}</h2>
          <StatusBadge status={plan.status} />
        </div>
        {editing ? (
          <>
            <label>タイトル</label>
            <input
              className="field"
              value={draft?.title ?? ''}
              onChange={(event) =>
                setDraft((prev) =>
                  prev
                    ? { ...prev, title: event.target.value }
                    : { title: event.target.value, memo: plan.memo ?? '' },
                )
              }
            />
            <label>メモ</label>
            <textarea
              className="field"
              rows={3}
              value={draft?.memo ?? ''}
              onChange={(event) =>
                setDraft((prev) =>
                  prev
                    ? { ...prev, memo: event.target.value }
                    : { title: plan.title, memo: event.target.value },
                )
              }
            />
          </>
        ) : (
          <>
            <p>{plan.templateType}</p>
            <p>{plan.memo || 'メモなし'}</p>
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
              <button className="btn ghost" onClick={() => setDraft({ title: plan.title, memo: plan.memo ?? '' })}>
                編集
              </button>
              <button className="btn warn" onClick={removePlan}>
                削除
              </button>
            </>
          )}
        </div>
      </section>

      <section className="panel">
        <h3>ステータス</h3>
        <div className="chip-row">
          {statusOrder.map((status) => (
            <button
              className={`chip ${plan.status === status ? 'active' : ''}`}
              key={status}
              onClick={() => updatePlanStatus(plan.id, status as PlanStatus)}
            >
              {status}
            </button>
          ))}
        </div>
      </section>

      <section className="panel">
        <h3>仕様</h3>
        <p>尺: {formatDuration(plan.durationSec)}</p>
        <p>メンバー: {participantSummaryText(plan, data.members, 8)}</p>
        <p>目的: {plan.goal}</p>
        <p>素材: {plan.assets.join(' / ') || 'なし'}</p>
      </section>

      <section className="panel">
        <h3>役割まとめ</h3>
        <div className="stack-gap">
          {roleDefinitions.map((role) => (
            <p key={role.id}>
              {role.label.split('（')[0]}: {resolveRoleNames(plan.roleAssignments[role.id] ?? [], data.members)}
            </p>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="section-head">
          <h3>関連する撮影日</h3>
          <Link className="mini-link" to={`/events/new?planId=${plan.id}`}>
            撮影日作成
          </Link>
        </div>
        {relatedEvents.length === 0 && <p className="muted">まだ紐づく撮影日はありません。</p>}
        {relatedEvents.map((event) => (
          <Link key={event.id} className="card link-card" to={`/events/${event.id}`}>
            {event.title}
          </Link>
        ))}
      </section>

      <button className="btn" onClick={share}>
        共有リンクをコピー
      </button>
    </div>
  )
}
