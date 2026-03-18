# Item Definitions Sync TODO

目的: `index copy3.html` のアイテム一覧を常に `item-definitions.js` と同期する。

## 運用チェック
1. アイテムを追加・変更したら `item-definitions.js` を更新する。
2. `index copy3.html` を再読み込みし、左パネルの「アイテム一覧」に新規/更新内容が出ることを確認する。
3. 画像パス(`img`)を変更した場合、一覧サムネイルが表示されることを確認する。
4. `collision-data.js` 保存前に、必要なアイテムIDが一覧に存在することを確認する。

## 変更時の注意
1. `item-definitions.js` は `window.itemDefinitions` を維持する（copy3がここを参照）。
2. `img` は文字列パスにする（copy3はこの値をそのまま画像読込に使う）。
3. ID重複は後勝ちになるため、意図しない上書きがないか確認する。

## 定期タスク
1. 新しい装備/素材/武器を追加した週は、エディタ表示を1回目視確認する。
2. 不要アイテムを削除した時は、一覧検索で古いIDが残っていないことを確認する。
