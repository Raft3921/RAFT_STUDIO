import type { AppData, DailyQuest, DailyQuestTemplate } from '../types'

export const dailyQuestTemplates: Array<{ value: DailyQuestTemplate; label: string; defaultAmount: number }> = [
  { value: 'plan_create', label: '企画を作る', defaultAmount: 1 },
  { value: 'event_create', label: '撮影日を作る', defaultAmount: 1 },
  { value: 'attendance_reply', label: '出欠を回答する', defaultAmount: 1 },
  { value: 'checklist_done', label: '持ち物をチェックする', defaultAmount: 1 },
  { value: 'rafine_message', label: 'RAFINEで連絡する', defaultAmount: 1 },
  { value: 'channel_check', label: 'チャンネル動画を確認する', defaultAmount: 1 },
  { value: 'share_link', label: '共有リンクを送る', defaultAmount: 1 },
  { value: 'bring_item', label: '持ってくる物を指定', defaultAmount: 1 },
]

export const dailyQuestText = (quest: Pick<DailyQuest, 'template' | 'amount' | 'customText'>) => {
  const amount = Math.max(1, quest.amount || 1)
  switch (quest.template) {
    case 'plan_create':
      return `企画を${amount}件作る`
    case 'event_create':
      return `撮影日を${amount}件作る`
    case 'attendance_reply':
      return `出欠を${amount}件回答する`
    case 'checklist_done':
      return `持ち物チェックを${amount}件完了する`
    case 'rafine_message':
      return `RAFINEで${amount}件連絡する`
    case 'channel_check':
      return `チャンネル動画を${amount}本確認する`
    case 'share_link':
      return `共有リンクを${amount}件送る`
    case 'bring_item':
      return `${quest.customText?.trim() || '指定アイテム'}を持ってくる`
    default:
      return '本日のクエスト'
  }
}

const toDateKey = (isoText?: string) => {
  if (!isoText) return ''
  const date = new Date(isoText)
  if (Number.isNaN(date.getTime())) return ''
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export const dailyQuestProgress = (quest: DailyQuest, data: AppData) => {
  const eventById = new Map(data.events.map((event) => [event.id, event]))
  const assigneeId = quest.assigneeId

  switch (quest.template) {
    case 'plan_create':
      return data.plans.filter(
        (plan) => plan.createdBy === assigneeId && toDateKey(plan.createdAt) === quest.questDate,
      ).length
    case 'event_create':
      return data.events.filter(
        (event) => event.createdBy === assigneeId && toDateKey(event.createdAt) === quest.questDate,
      ).length
    case 'attendance_reply':
      return data.responses.filter((response) => {
        if (response.userId !== assigneeId) return false
        if (toDateKey(response.respondedAt) === quest.questDate) return true
        const linkedEvent = eventById.get(response.eventId)
        return toDateKey(linkedEvent?.datetime) === quest.questDate
      }).length
    case 'checklist_done':
      return data.events.reduce((sum, event) => {
        if (toDateKey(event.datetime) !== quest.questDate) return sum
        return sum + event.checklist.filter((item) => item.doneBy.includes(assigneeId)).length
      }, 0)
    case 'bring_item':
      return data.events.reduce((sum, event) => {
        if (toDateKey(event.datetime) !== quest.questDate) return sum
        return sum + event.checklist.filter((item) => item.doneBy.includes(assigneeId)).length
      }, 0)
    default:
      return 0
  }
}

export const isDailyQuestDone = (quest: DailyQuest, data: AppData) =>
  dailyQuestProgress(quest, data) >= Math.max(1, quest.amount || 1)
