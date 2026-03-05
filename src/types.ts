export type PlanStatus = 'candidate' | 'confirmed' | 'shot' | 'editing' | 'published'
export type Attendance = 'yes' | 'no' | 'maybe'
export type RoleSelection = 'single' | 'multi'
export type RoleAssignments = Record<string, string[]>
export type CalendarMarkKind = 'shoot' | 'edit' | 'post'
export type DailyQuestTemplate =
  | 'plan_create'
  | 'event_create'
  | 'attendance_reply'
  | 'checklist_done'
  | 'rafine_message'
  | 'channel_check'
  | 'share_link'
  | 'bring_item'

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
  gameTitle?: string
  templateType: string
  status: PlanStatus
  durationSec: number
  participantIds: string[]
  goal: '笑い' | '驚き' | '感動' | '学び' | '上達'
  subtitleStyle: 'フル字幕' | 'ちょっと字幕' | '字幕無し'
  overview?: string
  roleAssignments: RoleAssignments
  memo?: string
  createdAt: string
  createdBy: string
  updatedAt?: string
  updatedBy?: string
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
  createdBy?: string
}

export interface EventResponse {
  eventId: string
  userId: string
  response: Attendance
  comment?: string
  respondedAt?: string
}

export interface DailyQuest {
  id: string
  questDate: string
  assigneeId: string
  template: DailyQuestTemplate
  amount: number
  customText?: string
  done: boolean
  doneAt?: string | null
  createdAt: string
  createdBy: string
}

export interface CalendarMark {
  id: string
  kind: CalendarMarkKind
  startDate: string
  endDate: string
  title?: string
  createdAt: string
  createdBy: string
}

export interface AppData {
  members: Member[]
  plans: Plan[]
  events: EventItem[]
  responses: EventResponse[]
  dailyQuests: DailyQuest[]
  calendarMarks: CalendarMark[]
}
