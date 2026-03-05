import type { EventChecklistItem, RoleSelection } from '../types'

export const planTemplates = ['検証', 'ドッキリ', '建築', 'PvP', 'マルチ企画', 'Shorts切り抜き']

export const assetChoices = ['BGM', 'SE', 'サムネ素材', '立ち絵', '特殊効果']

export const eventChecklistTemplates: Record<string, Omit<EventChecklistItem, 'id' | 'doneBy'>[]> = {
  'PC収録': [
    { label: '収録用PCの空き容量確認', scope: 'all' },
    { label: 'マイクと音量チェック', scope: 'all' },
    { label: '録画設定確認', scope: 'role' },
  ],
  'Switch収録': [
    { label: 'Switch本体と充電器', scope: 'all' },
    { label: 'キャプチャーボード接続確認', scope: 'role' },
    { label: '予備コントローラー', scope: 'all' },
  ],
  外ロケ: [
    { label: '撮影許可・天気確認', scope: 'role' },
    { label: 'モバイルバッテリー', scope: 'all' },
    { label: '集合場所ピン共有', scope: 'all' },
  ],
  室内トーク: [
    { label: '照明・背景セット', scope: 'role' },
    { label: '飲み物・台本メモ', scope: 'all' },
    { label: 'ノイズ源チェック', scope: 'all' },
  ],
}

export const eventTemplateNames = Object.keys(eventChecklistTemplates)

export const durationPresets = [30, 60, 180, 480, 900, 1800]

export const ALL_MEMBERS_TOKEN = '__all__'

export interface RoleDefinition {
  id: string
  label: string
  selection: RoleSelection
  required?: boolean
  allowAllToken?: boolean
}

export const roleDefinitions: RoleDefinition[] = [
  { id: 'mc', label: '司会（MC）', selection: 'single', required: true },
  { id: 'reaction', label: 'リアクション', selection: 'multi' },
  { id: 'action', label: 'アクション', selection: 'multi' },
  { id: 'tech', label: '技術', selection: 'single', required: true },
  { id: 'progress', label: '進行', selection: 'single' },
]

export const roleTemplatePresets = {
  minecraftVerification: {
    label: 'Minecraft × 検証',
    membersByRole: {
      mc: ['ラフト'],
      tech: ['ムート'],
      reaction: ['まい', 'たぬつな'],
      action: ['やんさん'],
    },
  },
  minecraftLargeGroup: {
    label: 'Minecraft × 多人数',
    membersByRole: {
      mc: ['ラフト'],
      progress: ['まい'],
      tech: ['ムート'],
      reaction: ['ラフト', 'まい', 'たぬつな', 'やんさん', 'ムート', 'もろん', 'ウィーク', 'ギョーザ'],
    },
  },
  shortsClip: {
    label: 'Shorts切り抜き',
    membersByRole: {
      mc: ['ラフト'],
    },
  },
} as const
