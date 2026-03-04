import type { AppData } from '../types'
import { normalizePlan } from './plan'

const APP_STORAGE_KEY = 'youtube-planner-v1'
const legacyMemberNames = ['自分', 'メンバー', 'メンバーA', 'メンバーB', 'unknown', '名無し']

export const defaultMembers = [
  { id: 'm-raft', displayName: 'ラフト', role: '司会', notificationsEnabled: true },
  { id: 'm-mai', displayName: 'まい', role: '進行', notificationsEnabled: true },
  { id: 'm-tanutsuna', displayName: 'たぬつな', role: 'リアクション', notificationsEnabled: true },
  { id: 'm-yansan', displayName: 'やんさん', role: 'アクション', notificationsEnabled: true },
  { id: 'm-muto', displayName: 'ムート', role: '技術', notificationsEnabled: true },
  { id: 'm-moron', displayName: 'もろん', role: 'サムネ', notificationsEnabled: true },
  { id: 'm-week', displayName: 'ウィーク', role: '編集', notificationsEnabled: true },
  { id: 'm-gyoza', displayName: 'ギョーザ', role: '撮影', notificationsEnabled: true },
]

const defaultData: AppData = {
  members: defaultMembers,
  plans: [],
  events: [],
  responses: [],
  dailyQuests: [],
}

export const loadData = (): AppData => {
  try {
    const raw = localStorage.getItem(APP_STORAGE_KEY)
    if (!raw) return defaultData
    const parsed = JSON.parse(raw) as AppData
    const memberNames = (parsed.members ?? []).map((member) => member.displayName)
    const shouldReplaceWithDefaultMembers =
      memberNames.length === 0 ||
      memberNames.some((name) => legacyMemberNames.includes(name))

    return {
      members: shouldReplaceWithDefaultMembers ? defaultData.members : parsed.members,
      plans: (parsed.plans ?? []).map((plan) => normalizePlan(plan)),
      events: parsed.events ?? [],
      responses: parsed.responses ?? [],
      dailyQuests: parsed.dailyQuests ?? [],
    }
  } catch {
    return defaultData
  }
}

export const saveData = (data: AppData) => {
  localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(data))
}
