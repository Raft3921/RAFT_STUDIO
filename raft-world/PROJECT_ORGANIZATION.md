# プロジェクト整理メモ（2026-02-24 時点）

## 1. 全体像
- このプロジェクトは、`index.html` を中心にしたブラウザゲームです。
- 実行ロジックは `index.html` に大きく集約され、地形・背景・当たり判定・アイテム定義は外部ファイルで差し替えできる構成です。
- `index copy*.html` は用途別の編集ツール（エディタ）として運用されています。

## 2. ゲーム本体（実行系）
- `index.html`
  - メインエントリ。
  - UI、入力、描画、オーディオ、セーブ/ロード、インベントリ、装備、敵処理などの中核ロジックを保持。
  - `window.RAFT_*` 系の共有データを参照可能。
- `terrain-data.js`
  - メイン地形データ（`window.RAFT_TERRAIN_DATA` / `window.FALLBACK_TERRAIN_DATA`）。
- `background-data.js`
  - 背景バイオーム設定（`window.RAFT_BACKGROUND_DATA`）。
- `collision-data.js`
  - タイル当たり判定マスク（`window.RAFT_COLLISION_DATA`）。
- `tile-definitions.js`
  - タイル定義（`window.RAFT_TILE_DEFINITIONS`）。
- `item-definitions.js`
  - アイテム定義（`window.itemDefinitions`）。
- `legacy-collision-defaults.js`
  - 旧当たり判定のフォールバック定義。

## 3. エディタ群（`index copy*.html`）
- `index copy.html`
  - メイン地形/マップ編集用エディタ。
  - パレットとワールドスロット運用が前提。
- `index copy2.html`
  - 背景エディタ。
  - 列単位バイオーム塗り分けと `background-data.js` 書き出しを担当。
- `index copy3.html`
  - 当たり判定エディタ。
  - `collision-data.js` を編集・保存。
- `index copy4.html`
  - 服スキンエディタ。
  - ピクセル編集、フレーム確認、カラーパレット運用。

## 4. アセット・データ・検証出力
- `assets/`
  - タイル、キャラ、敵、UI、服スキン、音声などの素材群。
- `データ/`
  - ローカル保存スロットJSON。
- `output/`
  - Playwright/開発ループのスクリーンショット、エラーログ、検証結果。
- `scripts/playwright_clambon_drop_test.mjs`
  - 実プレイ手順を再現する自動検証スクリプト。

## 5. 補助ファイル
- `package.json`
  - 開発依存は Playwright が中心の最小構成。
- `memo-local-server.js`
  - ローカルメモ共有サーバー（HTTP + SSE、`/messages` `/stream` `/health`）。
- `progress.md`
  - 変更履歴・調査ログの時系列記録。
- `item-definitions-sync-todo.md`
  - アイテム定義とエディタ表示の同期チェック用メモ。

## 6. 大容量ファイル（編集注意）
- `index.html`（約1.5MB）
- `debug.js`（約1.6MB）
- `terrain-data.js`（約18MB）
- `test.js`（約51MB）

※ 大容量ファイルは広範囲置換や一括整形で事故が起きやすいため、ピンポイント編集推奨。

## 7. 現在の運用整理（実務目線）
- プレイ実行: `index.html` + `assets/` + 各 `*-data.js`。
- コンテンツ編集: `index copy*.html`。
- 回帰確認: `scripts/` と `output/`。
- 変更意図の追跡: `progress.md`。

## 8. 次の整理候補（任意）
- 実運用ファイルとアーカイブ（古いコピー/過去出力）を分離。
- この整理メモを起点に、短い `README.md` を追加。
- 将来的に `index.html` の機能分割（モジュール化）を検討。

## 9. `E`で開くポーチ機能の移植テンプレ
「別ゲームでもすぐ使える形」で、`index.html` の実装を最小構成に分解。

### 9-1. まず持つ状態（State）
- `clothingUI.active`: 何らかの装備UIが開いているか。
- `clothingUI.slot`: 今どの画面か（`'pouch'` など）。
- `clothingUI.entryMode`: 開き方モード（この実装では `'pouch'` / `'legacy'`）。
- `clothingUI.pouch`: ポーチ専用状態（`category`, `scroll`, `menu`, `map...`）。
- `inventoryVisible`: 旧インベントリ画面が開いているか。

### 9-2. 開く/閉じる関数を分離
`index.html` では以下の責務で分割されている。

1. `openClothingUI('pouch')`
- ポーチUIを開く共通関数。
- `clothingUI.active = true` と `clothingUI.slot = 'pouch'` をセット。
- 必要なUI配列（`itemRects` など）を初期化。

2. `closeClothingUI()`
- ポーチを含む装備UIを閉じる共通関数。
- ポーチ内の一時状態（メニュー、ドラッグ状態など）をリセット。

3. `openPouchMapDirect()`
- 「ポーチを地図タブで直接開く」専用関数。
- `openClothingUI('pouch')` の後に `category='misc'` などを上書き。

### 9-3. `E`キーの実処理（トグル動作）
`window.addEventListener('keydown', ...)` 内で `KeyE` を処理し、以下の順で分岐。

1. すでに装備UIが開いているとき:
- 適用処理（`applyClothingSelection`）→ `closeClothingUI()`

2. 旧インベントリが開いているとき:
- `inventoryVisible = false` で閉じる

3. どちらも開いていないとき:
- `clothingUI.entryMode = 'pouch'`
- `openClothingUI('pouch')`

要点:
- `E` は「開く」だけでなく「閉じる」にも使う設計（実質トグル）。
- `event.repeat` を弾いて、押しっぱなし連打を防止。

### 9-4. 画面内操作（ポーチを開いた後）
- 左右キー: `cyclePouchCategory(direction)` でカテゴリ切替。
- 上下キー:
  - 地図カテゴリ（`misc`）ではマーカー選択移動。
  - それ以外はスクロール。
- `Escape`: `closeClothingUI()` で閉じる。
- マウスホイール:
  - 地図カテゴリではズーム。
  - 通常カテゴリでは縦スクロール。

### 9-5. 最小実装サンプル（コピペ土台）
```js
const ui = {
  active: false,
  slot: null, // 'pouch'
  pouch: { category: 'top', scroll: 0 }
};

function openPouch() {
  ui.active = true;
  ui.slot = 'pouch';
}

function closeUI() {
  ui.active = false;
  ui.slot = null;
}

window.addEventListener('keydown', (event) => {
  if (event.code !== 'KeyE') return;
  event.preventDefault();
  if (event.repeat) return;

  if (ui.active && ui.slot === 'pouch') {
    closeUI();        // Eで閉じる
  } else {
    openPouch();      // Eで開く
  }
});
```

### 9-6. 実装時のチェックリスト
- `KeyE` で開く/閉じるの両方ができる。
- `event.repeat` 対策がある。
- `Escape` でも閉じられる。
- ポーズ中・タイトル中など、開かせたくない状態を先に除外している。
- ポーチを閉じる時に一時状態（選択中メニュー、ドラッグ状態）をリセットしている。

### 9-7. 元実装の参照位置（`index.html`）
- 状態定義: `9738` 付近（`inventoryChoiceMenu`, `clothingUI` まわり）。
- 開閉本体: `15974` 付近（`openClothingUI`）、`16082` 付近（`closeClothingUI`）。
- ポーチ直開き: `16173` 付近（`openPouchMapDirect`）。
- キー入力: `21981` 以降、特に `22199` 以降（`KeyE` / `KeyM`）。
- ポーチ操作キー: `22262` 以降（カテゴリ切替、スクロール、地図選択）。

### 9-8. 今の「`E`で開く panel画像UI」表示方式まとめ
`E`で開くUIは、**キー入力**と**画像スキン描画**が分離されている。

1. 開閉トリガー（`KeyE`）
- `keydown` の `event.code === 'KeyE'` で処理。
- `event.repeat` を弾く。
- 分岐は以下:
  - `clothingUI.active === true` → `applyClothingSelection()` → `closeClothingUI()`
  - `inventoryVisible === true` → 旧インベントリを閉じる
  - それ以外 → `clothingUI.entryMode = 'pouch'` + `openClothingUI('pouch')`

2. `openClothingUI('pouch')` で初期化する内容
- `clothingUI.active = true`
- `clothingUI.slot = 'pouch'`
- ポーチ描画用配列を初期化（`categoryRects`, `itemRects` など）
- カテゴリ未設定時は `'top'` を確保

3. 使うパネル画像（`uiSkin`）
- パネル9分割:
  - `panel_tl.png`, `panel_top.png`, `panel_tr.png`
  - `panel_left.png`, `panel_center.png`, `panel_right.png`
  - `panel_bl.png`, `panel_bottom.png`, `panel_br.png`
- タブ:
  - 通常 `tab_l.png`, `tab_m.png`, `tab_r.png`
  - 選択中 `tab_l_on.png`, `tab_m_on.png`, `tab_r_on.png`

4. 描画フロー（毎フレーム）
- `drawClothingSelector()` が `clothingUI.active` 時に走る。
- `entryMode === 'pouch'` のとき `drawPouchPanel()` へ。
- `drawPouchPanel()` 内で:
  - `drawUiPanel()` でパネル枠を9分割描画
  - `drawUiTab()` でカテゴリタブ描画（active/normalを切替）
  - 中身（アイテム一覧 or 地図）を描画

5. パネル描画の中核関数
- `drawUiPanel(ctx, x, y, w, h)`
  - `panel_*` の9分割で拡縮対応の枠描画。
  - 枠画像不足時は `panel_center` タイル埋め、さらに無ければ単色塗りでフォールバック。
- `drawUiTab(ctx, parts, x, y, w, h)`
  - `tab_*` の左中右を横方向に並べてタブ化。

6. 実務で移植する最小セット
- 状態: `clothingUI.active / slot / entryMode / pouch.*`
- 入力: `KeyE` の3分岐（開く・閉じる・旧UI閉じる）
- 画像: `panel_*` 一式 + `tab_*` 一式
- 描画: `drawUiPanel`, `drawUiTab`, `drawPouchPanel`, `drawClothingSelector`
