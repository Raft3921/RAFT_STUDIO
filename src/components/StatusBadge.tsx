import { statusLabel } from '../lib/utils'
import type { PlanStatus } from '../types'

export const StatusBadge = ({ status }: { status: PlanStatus }) => {
  return <span className={`status-badge status-${status}`}>{statusLabel[status]}</span>
}
