type NoticeSection = 'plans' | 'events' | 'rafine'

interface SeenState {
  plans?: string
  events?: string
  rafine?: string
}

const seenKey = (workspaceId: string, userId: string) => `seen-v1:${workspaceId}:${userId}`

export const loadSeenState = (workspaceId: string, userId: string): SeenState => {
  try {
    const raw = localStorage.getItem(seenKey(workspaceId, userId))
    if (!raw) return {}
    return JSON.parse(raw) as SeenState
  } catch {
    return {}
  }
}

export const markSeenNow = (workspaceId: string, userId: string, section: NoticeSection) => {
  const current = loadSeenState(workspaceId, userId)
  const next = { ...current, [section]: new Date().toISOString() }
  localStorage.setItem(seenKey(workspaceId, userId), JSON.stringify(next))
  return next
}

export const isNewerThanSeen = (createdAt: string | undefined, seenAt: string | undefined) => {
  if (!createdAt) return false
  if (!seenAt) return true
  const createdMs = new Date(createdAt).getTime()
  const seenMs = new Date(seenAt).getTime()
  if (Number.isNaN(createdMs) || Number.isNaN(seenMs)) return false
  return createdMs > seenMs
}

