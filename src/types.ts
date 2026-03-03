export type PlanStatus = 'candidate' | 'confirmed' | 'shot' | 'editing' | 'published'
export type Attendance = 'yes' | 'no' | 'maybe'

export interface Member {
  id: string
  displayName: string
  role: string
  lineContact?: string
  notificationsEnabled: boolean
}

export interface Plan {
  id: string
  title: string
  templateType: string
  status: PlanStatus
  duration: 'Short' | '8分' | '15分'
  memberSize: 'ソロ' | '2人' | '3〜5人' | '多人数'
  goal: '笑い' | '驚き' | '感動' | '学び' | '上達'
  assets: string[]
  memo?: string
  createdAt: string
  createdBy: string
}

export interface EventChecklistItem {
  id: string
  label: string
  scope: 'all' | 'role'
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
