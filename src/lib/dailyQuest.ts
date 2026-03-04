import type { DailyQuest, DailyQuestTemplate } from '../types'

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
