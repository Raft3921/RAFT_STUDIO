import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { StatusBadge } from '../components/StatusBadge'
import { getMemberIcon } from '../lib/memberIcon'
import { statusLabel, statusOrder } from '../lib/utils'
import { formatDuration, participantSummaryText, roleSummaryText } from '../lib/plan'
import { useApp } from '../store/AppContext'
import type { PlanStatus } from '../types'

export const PlansPage = () => {
  const { data } = useApp()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<PlanStatus | 'all'>('all')

  const filtered = useMemo(() => {
    return data.plans.filter((plan) => {
      const matchedQuery = query.trim() === '' || plan.title.toLowerCase().includes(query.toLowerCase())
      const matchedStatus = status === 'all' || plan.status === status
      return matchedQuery && matchedStatus
    })
  }, [data.plans, query, status])

  return (
    <div className="page-stack">
      <section className="panel">
        <div className="section-head">
          <h2>企画一覧</h2>
          <Link data-tour="plans-create-button" className="btn" to="/plans/new">
            企画作成
          </Link>
        </div>
        <input
          className="field"
          placeholder="タイトル検索"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <div className="chip-row">
          <button className={`chip ${status === 'all' ? 'active' : ''}`} onClick={() => setStatus('all')}>
            全て
          </button>
          {statusOrder.map((item) => (
            <button
              className={`chip ${status === item ? 'active' : ''}`}
              key={item}
              onClick={() => setStatus(item)}
            >
              {statusLabel[item]}
            </button>
          ))}
        </div>
      </section>

      <section className="panel">
        {filtered.length === 0 && <p className="muted">条件に一致する企画はありません。</p>}
        {filtered.map((plan) => {
          const creator = data.members.find((member) => member.id === plan.createdBy)
          const editor = plan.updatedBy ? data.members.find((member) => member.id === plan.updatedBy) : null
          return (
          <Link key={plan.id} to={`/plans/${plan.id}`} className="card link-card">
            <div className="section-head">
              <strong>{plan.title}</strong>
              <div className="plan-card-meta">
                <StatusBadge status={plan.status} />
                <img
                  src={getMemberIcon(creator?.displayName ?? 'ラフト')}
                  alt={creator?.displayName ? `${creator.displayName}が作成` : '作成者'}
                  title={creator?.displayName ? `作成者: ${creator.displayName}` : '作成者'}
                  className="plan-creator-icon"
                />
              </div>
            </div>
            <p className="muted plan-owner-line">
              作成: {creator?.displayName ?? '不明'}
              {editor && editor.id !== creator?.id ? ` / 編集: ${editor.displayName}` : ''}
            </p>
            <p>
              {(plan.gameTitle || '未設定ゲーム')} / {plan.templateType} / {formatDuration(plan.durationSec)} / {participantSummaryText(plan, data.members)}
            </p>
            {plan.overview && <p className="muted">{plan.overview}</p>}
            <p className="muted">{roleSummaryText(plan, data.members)}</p>
          </Link>
          )
        })}
      </section>
    </div>
  )
}
