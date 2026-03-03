import { ALL_MEMBERS_TOKEN, roleDefinitions } from '../data/templates'
import type { Member, Plan, RoleAssignments } from '../types'

const legacyDurationMap: Record<string, number> = {
  Short: 60,
  '8分': 480,
  '15分': 900,
}

export const clampDuration = (seconds: number) => Math.min(1800, Math.max(0, Math.round(seconds / 10) * 10))

export const formatDuration = (seconds: number) => {
  const sec = clampDuration(seconds)
  const mm = String(Math.floor(sec / 60)).padStart(2, '0')
  const ss = String(sec % 60).padStart(2, '0')
  return `${mm}:${ss}`
}

export const createEmptyRoleAssignments = (): RoleAssignments =>
  roleDefinitions.reduce<RoleAssignments>((acc, definition) => {
    acc[definition.id] = []
    return acc
  }, {})

type LegacyPlan = Partial<Plan> & { id: string; duration?: string }

export const normalizePlan = (raw: LegacyPlan): Plan => {
  const legacyDuration = typeof raw.durationSec === 'number' ? raw.durationSec : legacyDurationMap[String(raw.duration)]

  const roleAssignments = createEmptyRoleAssignments()
  Object.entries((raw.roleAssignments ?? {}) as RoleAssignments).forEach(([roleId, members]) => {
    roleAssignments[roleId] = members
  })

  return {
    id: raw.id,
    title: raw.title ?? '無題の企画',
    templateType: raw.templateType ?? '検証',
    status: raw.status ?? 'candidate',
    durationSec: clampDuration(legacyDuration ?? 480),
    memberSize: raw.memberSize ?? '2人',
    goal: raw.goal ?? '笑い',
    assets: raw.assets ?? [],
    roleAssignments,
    memo: raw.memo,
    createdAt: raw.createdAt ?? new Date().toISOString(),
    createdBy: raw.createdBy ?? 'u-me',
  }
}

export const resolveRoleNames = (memberIds: string[], members: Member[]) => {
  if (memberIds.includes(ALL_MEMBERS_TOKEN)) return '全員'

  const names = memberIds
    .map((id) => members.find((member) => member.id === id)?.displayName)
    .filter((name): name is string => !!name)

  return names.length > 0 ? names.join('・') : '未割当'
}

export const roleSummaryText = (plan: Plan, members: Member[], maxItems = 4) => {
  const items = roleDefinitions
    .map((role) => {
      const assignees = plan.roleAssignments[role.id] ?? []
      if (assignees.length === 0) return null
      return `${role.label.split('（')[0]}:${resolveRoleNames(assignees, members)}`
    })
    .filter((item): item is string => !!item)

  if (items.length === 0) return '役割未設定'

  if (items.length > maxItems) {
    return `${items.slice(0, maxItems).join('｜')}…`
  }
  return items.join('｜')
}
