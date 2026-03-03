import { useMemo, useState } from 'react'
import { getMemberIcon } from '../lib/memberIcon'
import { useApp } from '../store/AppContext'

const sanitizeRoom = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

export const RafinePage = () => {
  const { data, currentUserId, workspaceId } = useApp()
  const me = data.members.find((member) => member.id === currentUserId) ?? data.members[0]

  const [roomInput, setRoomInput] = useState(`raft-${workspaceId}`)
  const [joined, setJoined] = useState(false)
  const roomName = sanitizeRoom(roomInput) || `raft-${workspaceId}`

  const callUrl = useMemo(() => {
    const base = `https://meet.jit.si/${roomName}`
    const displayName = encodeURIComponent(me?.displayName ?? 'メンバー')
    return `${base}#config.prejoinPageEnabled=false&userInfo.displayName=%22${displayName}%22`
  }, [me?.displayName, roomName])

  return (
    <div className="page-stack">
      <section className="panel">
        <h2>RAFINE</h2>
        <p className="muted">ラフト版LINE通話。メンバー全員で同じルームに入れます。</p>
      </section>

      <section className="panel">
        <label>通話ルーム名</label>
        <input className="field" value={roomInput} onChange={(event) => setRoomInput(event.target.value)} />
        <div className="inline-row">
          <button className="btn" type="button" onClick={() => setJoined(true)}>
            通話を開く
          </button>
          <button
            className="btn ghost"
            type="button"
            onClick={async () => {
              await navigator.clipboard.writeText(callUrl)
              window.alert('通話リンクをコピーしました')
            }}
          >
            通話リンクをコピー
          </button>
        </div>
      </section>

      <section className="panel">
        <h3>メンバー</h3>
        <div className="chip-row">
          {data.members.map((member) => (
            <span key={member.id} className={`chip ${member.id === currentUserId ? 'active' : ''}`}>
              <span className="member-chip-label">
                <img src={getMemberIcon(member.displayName)} alt="" className="member-chip-icon" />
                <span>{member.displayName}</span>
              </span>
            </span>
          ))}
        </div>
      </section>

      {joined && (
        <section className="panel">
          <h3>通話中: {roomName}</h3>
          <div className="rafine-call-frame-wrap">
            <iframe
              className="rafine-call-frame"
              src={callUrl}
              title="RAFINE Call"
              allow="camera; microphone; display-capture; fullscreen; clipboard-read; clipboard-write"
            />
          </div>
        </section>
      )}
    </div>
  )
}
