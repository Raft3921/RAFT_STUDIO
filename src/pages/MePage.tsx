import { useState } from 'react'
import { formatDateTime } from '../lib/utils'
import { useApp } from '../store/AppContext'

export const MePage = () => {
  const {
    data,
    currentUserId,
    workspaceId,
    storageMode,
    ready,
    copyWorkspaceLink,
    toggleMyNotification,
    updateMyProfile,
  } = useApp()

  const me = data.members.find((member) => member.id === currentUserId)
  const [displayName, setDisplayName] = useState(me?.displayName ?? '')

  if (!ready) {
    return <section className="panel">同期を開始しています...</section>
  }

  if (!me) return null

  const myEvents = data.responses
    .filter((response) => response.userId === currentUserId)
    .map((response) => ({
      response: response.response,
      event: data.events.find((event) => event.id === response.eventId),
    }))
    .filter((item) => item.event)

  return (
    <div className="page-stack">
      <section className="panel">
        <h2>自分</h2>
        <p className="muted">保存先: {storageMode === 'firebase' ? 'Firebase共有' : 'この端末のみ'}</p>
        <p className="muted">Workspace: {workspaceId}</p>
        <button
          className="btn ghost"
          onClick={async () => {
            await copyWorkspaceLink()
            window.alert('招待リンクをコピーしました')
          }}
        >
          招待リンクをコピー
        </button>
      </section>

      <section className="panel">
        <label>表示名</label>
        <input className="field" value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
        <button className="btn" onClick={() => updateMyProfile(displayName)}>
          表示名を保存
        </button>
      </section>

      <section className="panel">
        <h3>通知</h3>
        <button className="btn ghost" onClick={toggleMyNotification}>
          {me.notificationsEnabled ? '通知ON' : '通知OFF'}
        </button>
      </section>

      <section className="panel">
        <h3>自分の出欠一覧</h3>
        {myEvents.length === 0 && <p className="muted">まだ回答がありません。</p>}
        {myEvents.map((item) => (
          <div className="card" key={item.event?.id}>
            <strong>{item.event?.title}</strong>
            <p>{item.event ? formatDateTime(item.event.datetime) : ''}</p>
            <p>回答: {item.response}</p>
          </div>
        ))}
      </section>
    </div>
  )
}
