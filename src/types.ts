export type PlanStatus = 'candidate' | 'confirmed' | 'shot' | 'editing' | 'published'
export type Attendance = 'yes' | 'no' | 'maybe'
export type RoleSelection = 'single' | 'multi'
export type RoleAssignments = Record<string, string[]>

export interface Member {
  id: string
  displayName: string
  role: string
  lineContact?: string
  notificationsEnabled: boolean
  lastActiveAt?: string
}

export interface Plan {
  id: string
  title: string
  templateType: string
  status: PlanStatus
  durationSec: number
  participantIds: string[]
  goal: '笑い' | '驚き' | '感動' | '学び' | '上達'
  assets: string[]
  roleAssignments: RoleAssignments
  memo?: string
  createdAt: string
  createdBy: string
}

export interface EventChecklistItem {
  id: string
  label: string
  scope: 'all' | 'role' | 'member'
  assigneeIds?: string[]
  doneBy: string[]
}

export interface EventItem {
  id: string
  planId?: string
  title: string
  datetime: string
  meetingPoint: string
  location: string
  timeline: string[]
  checklist: EventChecklistItem[]
  createdAt: string
}

export interface EventResponse {
  eventId: string
  userId: string
  response: Attendance
  comment?: string
}

export interface AppData {
  members: Member[]
  plans: Plan[]
  events: EventItem[]
  responses: EventResponse[]
}
