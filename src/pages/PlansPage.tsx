import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { StatusBadge } from '../components/StatusBadge'
import { statusLabel, statusOrder } from '../lib/utils'
import { formatDuration, roleSummaryText } from '../lib/plan'
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
          <Link className="btn" to="/plans/new">
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
        {filtered.map((plan) => (
          <Link key={plan.id} to={`/plans/${plan.id}`} className="card link-card">
            <div className="section-head">
              <strong>{plan.title}</strong>
              <StatusBadge status={plan.status} />
            </div>
            <p>
              {plan.templateType} / {formatDuration(plan.durationSec)} / {plan.memberSize}
            </p>
            <p className="muted">{roleSummaryText(plan, data.members)}</p>
          </Link>
        ))}
      </section>
    </div>
  )
}
