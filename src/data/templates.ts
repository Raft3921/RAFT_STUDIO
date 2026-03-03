import type { EventChecklistItem } from '../types'

export const planTemplates = ['検証', 'ドッキリ', '建築', 'PvP', 'マルチ企画', 'Shorts切り抜き']

export const assetChoices = ['BGM', 'SE', 'サムネ素材', '立ち絵', '特殊効果']

export const eventChecklistTemplates: Record<string, Omit<EventChecklistItem, 'id' | 'doneBy'>[]> = {
  'PC収録': [
    { label: '収録用PCの空き容量確認', scope: 'all' },
    { label: 'マイクと音量チェック', scope: 'all' },
    { label: 'OBSシーン設定確認', scope: 'role' },
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
