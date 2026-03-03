import type { AppData } from '../types'
import { normalizePlan } from './plan'

const APP_STORAGE_KEY = 'youtube-planner-v1'

const defaultData: AppData = {
  members: [
    { id: 'u-me', displayName: '自分', role: '管理者', notificationsEnabled: true },
    { id: 'u-1', displayName: 'メンバーA', role: '撮影', notificationsEnabled: true },
    { id: 'u-2', displayName: 'メンバーB', role: '編集', notificationsEnabled: true },
  ],
  plans: [],
  events: [],
  responses: [],
}

export const loadData = (): AppData => {
  try {
    const raw = localStorage.getItem(APP_STORAGE_KEY)
    if (!raw) return defaultData
    const parsed = JSON.parse(raw) as AppData
    return {
      members: parsed.members ?? defaultData.members,
      plans: (parsed.plans ?? []).map((plan) => normalizePlan(plan)),
      events: parsed.events ?? [],
      responses: parsed.responses ?? [],
    }
  } catch {
    return defaultData
  }
}

export const saveData = (data: AppData) => {
  localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(data))
}
