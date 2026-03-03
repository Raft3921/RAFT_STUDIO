# YouTube撮影プランナー (V1)

スマホ向けの撮影計画サイトです。GitHub Pagesで公開できます。

## 実装済み（V1）

- ホーム: 次の撮影、進行中の企画
- 企画: 作成（テンプレ選択）、一覧、詳細、ステータス更新、共有リンク
- 撮影日: 作成、一覧、出欠3択、持ち物チェック、段取り、共有リンク
- LINE通知: 手動送信用のテンプレ文を1タップで開く
- 自分: 表示名変更、通知ON/OFF、招待リンクコピー
- 共有: 同じ `ws` パラメータのURLを開いたメンバーでリアルタイム共有（Firebase設定時）

## ローカル起動

```bash
npm install
npm run dev
```

## GitHub Pages公開

1. GitHubでリポジトリを作成しpush
2. Pagesの公開元を `gh-pages` ブランチに設定
3. 以下を実行

```bash
npm run deploy
```

## Firebase共有を有効化

1. Firebaseプロジェクトを作成
2. Authenticationで匿名認証を有効化
3. Firestore Databaseを作成
4. `.env.example` を `.env` にコピーして値を設定

```bash
cp .env.example .env
```

5. 開発サーバー再起動

Firebase値が未設定のときは自動でローカル保存モードになります。

## Firestoreルール例（最小）

匿名ユーザー同士の共有に使う想定です。必要に応じて制限を追加してください。

```text
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /workspaces/{workspaceId}/{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```
