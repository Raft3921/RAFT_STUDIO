import type { Attendance, EventItem, EventResponse, PlanStatus } from '../types'

export const statusLabel: Record<PlanStatus, string> = {
  candidate: '候補',
  confirmed: '決定',
  shot: '撮影済',
  editing: '編集',
  published: '公開済',
}

export const statusOrder: PlanStatus[] = ['candidate', 'confirmed', 'shot', 'editing', 'published']

export const attendanceLabel: Record<Attendance, string> = {
  yes: '参加できる',
  no: '参加むずい',
  maybe: '未定',
}

export const attendanceShort: Record<Attendance, string> = {
  yes: '◯',
  no: '△',
  maybe: '?',
}

export const formatDateTime = (isoDate: string) => {
  const date = new Date(isoDate)
  if (Number.isNaN(date.getTime())) return '未設定'
  return new Intl.DateTimeFormat('ja-JP', {
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export const nextEvent = (events: EventItem[]) => {
  const now = Date.now()
  return [...events]
    .filter((event) => new Date(event.datetime).getTime() >= now)
    .sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime())[0]
}

export const responseCount = (eventId: string, responses: EventResponse[]) => {
  return responses
    .filter((item) => item.eventId === eventId)
    .reduce(
      (acc, item) => {
        acc[item.response] += 1
        return acc
      },
      { yes: 0, no: 0, maybe: 0 },
    )
}

export const buildShareUrl = (path: string) => {
  const url = new URL(window.location.href)
  url.hash = `#${path}`
  return url.toString()
}

export const buildLineMessage = (event: EventItem) => {
  return [
    `【撮影リマインド】${event.title}`,
    `日時: ${formatDateTime(event.datetime)}`,
    `集合: ${event.meetingPoint}`,
    `場所: ${event.location}`,
    `持ち物確認をお願いします`,
  ].join('\n')
}
