import { useEffect, useMemo, useRef, useState } from 'react'
import { getMemberIcon } from '../lib/memberIcon'
import { formatDateTime } from '../lib/utils'
import { useApp } from '../store/AppContext'

const gamePagePath = 'raft-world/index.html'

const tapKey = (targetWindow: Window, code: string, key: string) => {
  const payload = { key, code, bubbles: true, cancelable: true }
  targetWindow.dispatchEvent(new KeyboardEvent('keydown', payload))
  window.setTimeout(() => {
    targetWindow.dispatchEvent(new KeyboardEvent('keyup', payload))
  }, 40)
}

export const MePage = () => {
  const {
    data,
    currentUserId,
    workspaceId,
    storageMode,
    firebaseAvailable,
    ready,
    copyWorkspaceLink,
    toggleMyNotification,
    updateMyProfile,
    switchStorageMode,
  } = useApp()

  const me = data.members.find((member) => member.id === currentUserId) ?? data.members[0]
  const [draftNames, setDraftNames] = useState<Record<string, string>>({})
  const [nameSaving, setNameSaving] = useState(false)
  const [showRaftWorld, setShowRaftWorld] = useState(false)
  const frameRef = useRef<HTMLIFrameElement | null>(null)
  const heldKeysRef = useRef(new Set<string>())

  if (!ready) {
    return <section className="panel">同期を開始しています...</section>
  }

  if (!me) {
    return <section className="panel">メンバー情報がありません。</section>
  }
  const displayName = draftNames[me.id] ?? me.displayName

  const memberNameOptions = (() => {
    const seen = new Set<string>()
    return data.members
      .map((member) => member.displayName.trim())
      .filter((name) => {
        const key = name.toLowerCase()
        if (!name || seen.has(key)) return false
        seen.add(key)
        return true
      })
  })()

  const handleSaveDisplayName = async () => {
    const nextName = displayName.trim()
    if (!nextName) {
      window.alert('表示名を選択してください。')
      return
    }
    setNameSaving(true)
    try {
      await updateMyProfile(nextName)
      setDraftNames({})
      window.alert('表示名を更新しました。')
    } catch {
      window.alert('表示名の更新に失敗しました。通信状態を確認して再度お試しください。')
    } finally {
      setNameSaving(false)
    }
  }

  const myEvents = data.responses
    .filter((response) => response.userId === currentUserId)
    .map((response) => ({
      response: response.response,
      event: data.events.find((event) => event.id === response.eventId),
    }))
    .filter((item) => item.event)
  const raftWorldUrl = useMemo(() => {
    const base = new URL(window.location.href.split('#')[0])
    return new URL(gamePagePath, base).toString()
  }, [])

  useEffect(() => {
    return () => {
      const frameWindow = frameRef.current?.contentWindow
      if (!frameWindow) return
      heldKeysRef.current.forEach((encoded) => {
        const [code, key] = encoded.split('::')
        frameWindow.dispatchEvent(new KeyboardEvent('keyup', { key, code, bubbles: true, cancelable: true }))
      })
      heldKeysRef.current.clear()
    }
  }, [])

  const sendHeldKey = (code: string, key: string, pressed: boolean) => {
    const frameWindow = frameRef.current?.contentWindow
    if (!frameWindow) return
    const encoded = `${code}::${key}`
    if (pressed) {
      if (heldKeysRef.current.has(encoded)) return
      heldKeysRef.current.add(encoded)
      frameWindow.dispatchEvent(new KeyboardEvent('keydown', { key, code, bubbles: true, cancelable: true }))
      return
    }
    if (!heldKeysRef.current.has(encoded)) return
    heldKeysRef.current.delete(encoded)
    frameWindow.dispatchEvent(new KeyboardEvent('keyup', { key, code, bubbles: true, cancelable: true }))
  }

  const tapGameKey = (code: string, key: string) => {
    const frameWindow = frameRef.current?.contentWindow
    if (!frameWindow) return
    tapKey(frameWindow, code, key)
  }

  const holdBinder = (code: string, key: string) => ({
    onPointerDown: () => sendHeldKey(code, key, true),
    onPointerUp: () => sendHeldKey(code, key, false),
    onPointerCancel: () => sendHeldKey(code, key, false),
    onPointerLeave: () => sendHeldKey(code, key, false),
  })

  return (
    <div className="page-stack">
      <section className="panel">
        <div className="section-head">
          <h2>自分</h2>
          <div className="storage-switch">
            <button
              type="button"
              className={`chip ${storageMode === 'local' ? 'active' : ''}`}
              onClick={() => switchStorageMode('local')}
              disabled={!ready && storageMode === 'firebase'}
            >
              この端末のみ
            </button>
            <button
              type="button"
              className={`chip ${storageMode === 'firebase' ? 'active' : ''}`}
              onClick={() => switchStorageMode('firebase')}
              disabled={!firebaseAvailable || (!ready && storageMode === 'firebase')}
              title={firebaseAvailable ? 'Firebase共有に切り替え' : 'Firebase未設定'}
            >
              Firebase共有
            </button>
          </div>
        </div>
        {!firebaseAvailable && <p className="muted">Firebase未設定のため共有モードは使えません。</p>}
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
        <div className="member-chip-label">
          <img src={getMemberIcon(me.displayName)} alt="" className="member-chip-icon member-chip-icon-lg" />
          <strong>{me.displayName}</strong>
        </div>
        <label>表示名（過去メンバーから選択）</label>
        <select
          data-tour="me-name-select"
          className="field"
          value={displayName}
          onChange={(event) =>
            setDraftNames((prev) => ({
              ...prev,
              [me.id]: event.target.value,
            }))
          }
        >
          {memberNameOptions.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <button
          data-tour="me-name-save"
          className="btn"
          onClick={() => void handleSaveDisplayName()}
          disabled={nameSaving}
        >
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

      <section className="panel">
        <div className="section-head">
          <h3>ラフトの世界</h3>
          <button className="btn" type="button" onClick={() => setShowRaftWorld((prev) => !prev)}>
            {showRaftWorld ? '閉じる' : 'プレイ'}
          </button>
        </div>
        <p className="muted">自分タブ内でプレイできます。スマホは下の仮想ボタンで操作可能です。</p>
        {showRaftWorld && (
          <div className="raft-world-shell">
            <iframe
              ref={frameRef}
              className="raft-world-frame"
              src={raftWorldUrl}
              title="ラフトの世界"
              allow="fullscreen"
            />
            <div className="raft-world-mobile-controls">
              <div className="raft-world-dpad">
                <button className="chip raft-world-control up" type="button" {...holdBinder('ArrowUp', 'ArrowUp')}>
                  ↑
                </button>
                <button className="chip raft-world-control left" type="button" {...holdBinder('ArrowLeft', 'ArrowLeft')}>
                  ←
                </button>
                <button className="chip raft-world-control down" type="button" {...holdBinder('ArrowDown', 'ArrowDown')}>
                  ↓
                </button>
                <button className="chip raft-world-control right" type="button" {...holdBinder('ArrowRight', 'ArrowRight')}>
                  →
                </button>
              </div>
              <div className="raft-world-action-grid">
                <button className="chip raft-world-action" type="button" {...holdBinder('Space', ' ')}>
                  ジャンプ
                </button>
                <button className="chip raft-world-action" type="button" {...holdBinder('ShiftLeft', 'Shift')}>
                  ダッシュ
                </button>
                <button className="chip raft-world-action" type="button" onClick={() => tapGameKey('KeyQ', 'q')}>
                  採取
                </button>
                <button className="chip raft-world-action" type="button" onClick={() => tapGameKey('KeyE', 'e')}>
                  装備
                </button>
                <button className="chip raft-world-action" type="button" onClick={() => tapGameKey('KeyM', 'm')}>
                  マップ
                </button>
                <button className="chip raft-world-action" type="button" onClick={() => tapGameKey('Enter', 'Enter')}>
                  決定
                </button>
                <button className="chip raft-world-action" type="button" onClick={() => tapGameKey('Escape', 'Escape')}>
                  戻る
                </button>
                <button className="chip raft-world-action" type="button" onClick={() => tapGameKey('KeyP', 'p')}>
                  ポーズ
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
