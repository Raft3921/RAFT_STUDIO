import { useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { formatDuration, participantSummaryText, resolveRoleNames } from '../lib/plan'
import { roleDefinitions } from '../data/templates'
import { StatusBadge } from '../components/StatusBadge'
import { getMemberIcon } from '../lib/memberIcon'
import { markSeenNow } from '../lib/notice'
import { buildShareUrl, statusLabel, statusOrder } from '../lib/utils'
import { useApp } from '../store/AppContext'
import type { PlanStatus } from '../types'

export const PlanDetailPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data, updatePlanStatus, deletePlan, reassignPlanCreator, workspaceId, currentUserId } = useApp()

  const plan = data.plans.find((item) => item.id === id)
  const relatedEvents = data.events.filter((event) => event.planId === id)

  useEffect(() => {
    markSeenNow(workspaceId, currentUserId, 'plans')
  }, [workspaceId, currentUserId])

  if (!plan) {
    return <p className="panel">企画が見つかりません。</p>
  }

  const share = async () => {
    const url = buildShareUrl(`/plans/${plan.id}`)
    await navigator.clipboard.writeText(url)
    window.alert('共有リンクをコピーしました')
  }

  const removePlan = async () => {
    if (!window.confirm('この企画を削除しますか？')) return
    await deletePlan(plan.id)
    navigate('/plans')
  }
  const creator = data.members.find((member) => member.id === plan.createdBy)
  const editor = plan.updatedBy ? data.members.find((member) => member.id === plan.updatedBy) : null
  const changeCreator = async () => {
    const options = data.members.map((member, index) => `${index + 1}: ${member.displayName}`).join('\n')
    const selected = window.prompt(`作成者を選んでください:\n${options}`)
    if (!selected) return
    const pickedIndex = Number(selected) - 1
    const picked = data.members[pickedIndex]
    if (!picked) {
      window.alert('番号が正しくありません。')
      return
    }
    await reassignPlanCreator(plan.id, picked.id)
  }

  return (
    <div className="page-stack">
      <section className="panel">
        <div className="section-head">
          <h2>{plan.title}</h2>
          <div className="plan-card-meta">
            <StatusBadge status={plan.status} />
            <button type="button" className="plan-creator-button" onClick={() => void changeCreator()}>
              <img
                src={getMemberIcon(creator?.displayName ?? 'ラフト')}
                alt={creator?.displayName ? `${creator.displayName}が作成` : '作成者'}
                title={creator?.displayName ? `作成者: ${creator.displayName}（クリックで変更）` : '作成者（クリックで変更）'}
                className="plan-creator-icon"
              />
            </button>
          </div>
        </div>
        <p>{plan.gameTitle || '未設定ゲーム'} / {plan.templateType}</p>
        <p className="muted plan-owner-line">
          作成: {creator?.displayName ?? '不明'}
          {editor && editor.id !== creator?.id ? ` / 編集: ${editor.displayName}` : ''}
        </p>
        {plan.overview && <p>{plan.overview}</p>}
        <p>{plan.memo || 'メモなし'}</p>
        <div className="inline-row">
          <Link className="btn ghost" to={`/plans/${plan.id}/edit`}>
            編集
          </Link>
          <button className="btn warn" onClick={removePlan}>
            削除
          </button>
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
              {statusLabel[status]}
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
