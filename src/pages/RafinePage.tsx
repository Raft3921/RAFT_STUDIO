import { useEffect, useMemo, useRef, useState } from 'react'
import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query } from 'firebase/firestore'
import { getMemberIcon } from '../lib/memberIcon'
import { firestoreDb } from '../lib/firebase'
import { useApp } from '../store/AppContext'

interface RafineMessage {
  id: string
  text: string
  userId: string
  displayName: string
  createdAt: string
}

const localKey = (workspaceId: string) => `rafine-messages-${workspaceId}`

const loadLocalMessages = (workspaceId: string): RafineMessage[] => {
  try {
    const raw = localStorage.getItem(localKey(workspaceId))
    if (!raw) return []
    return JSON.parse(raw) as RafineMessage[]
  } catch {
    return []
  }
}

const saveLocalMessages = (workspaceId: string, messages: RafineMessage[]) => {
  localStorage.setItem(localKey(workspaceId), JSON.stringify(messages))
}

const formatTime = (iso: string) => {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '--:--'
  return date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
}

export const RafinePage = () => {
  const { data, currentUserId, workspaceId, storageMode } = useApp()
  const me = data.members.find((member) => member.id === currentUserId) ?? data.members[0]
  const [text, setText] = useState('')
  const [messages, setMessages] = useState<RafineMessage[]>([])
  const [localVersion, setLocalVersion] = useState(0)
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    typeof Notification === 'undefined' ? 'denied' : Notification.permission,
  )
  const listRef = useRef<HTMLDivElement | null>(null)
  const lastMessageIdRef = useRef<string | null>(null)
  const localMessages = useMemo(() => {
    void localVersion
    return loadLocalMessages(workspaceId)
  }, [workspaceId, localVersion])
  const displayedMessages = storageMode === 'firebase' ? messages : localMessages

  useEffect(() => {
    if (storageMode !== 'firebase' || !firestoreDb) return

    const ref = collection(firestoreDb, 'workspaces', workspaceId, 'rafine_messages')
    const unsub = onSnapshot(query(ref, orderBy('createdAt', 'asc')), (snap) => {
      const next = snap.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<RafineMessage, 'id'>) }))
      setMessages(next)
    })
    return () => unsub()
  }, [storageMode, workspaceId])

  useEffect(() => {
    const node = listRef.current
    if (!node) return
    node.scrollTop = node.scrollHeight
  }, [displayedMessages.length])

  useEffect(() => {
    const latest = displayedMessages[displayedMessages.length - 1]
    if (!latest) return

    if (!lastMessageIdRef.current) {
      lastMessageIdRef.current = latest.id
      return
    }

    if (lastMessageIdRef.current === latest.id) return
    lastMessageIdRef.current = latest.id

    if (latest.userId === currentUserId) return
    if (typeof Notification === 'undefined') return
    if (Notification.permission !== 'granted') return

    const notification = new Notification(`RAFINE: ${latest.displayName}`, {
      body: latest.text,
      tag: 'rafine-message',
    })
    notification.onclick = () => window.focus()
  }, [currentUserId, displayedMessages])

  const canSend = text.trim().length > 0 && !!me
  const onlineLabel = useMemo(
    () => (storageMode === 'firebase' ? '共有メッセージ（全員同期）' : 'この端末のみ'),
    [storageMode],
  )

  const onSend = async () => {
    if (!canSend || !me) return
    const payload: Omit<RafineMessage, 'id'> = {
      text: text.trim(),
      userId: currentUserId,
      displayName: me.displayName,
      createdAt: new Date().toISOString(),
    }

    if (storageMode === 'firebase' && firestoreDb) {
      await addDoc(collection(firestoreDb, 'workspaces', workspaceId, 'rafine_messages'), payload)
    } else {
      const next = [...localMessages, { id: crypto.randomUUID(), ...payload }]
      saveLocalMessages(workspaceId, next)
      setLocalVersion((prev) => prev + 1)
    }

    setText('')
  }

  const onDelete = async (messageId: string) => {
    if (!window.confirm('このメッセージを削除しますか？')) return
    if (storageMode === 'firebase' && firestoreDb) {
      await deleteDoc(doc(firestoreDb, 'workspaces', workspaceId, 'rafine_messages', messageId))
      return
    }
    const next = localMessages.filter((message) => message.id !== messageId)
    saveLocalMessages(workspaceId, next)
    setLocalVersion((prev) => prev + 1)
  }

  const requestNotification = async () => {
    if (typeof Notification === 'undefined') {
      window.alert('このブラウザは通知に対応していません。')
      return
    }
    const result = await Notification.requestPermission()
    setNotificationPermission(result)
  }

  return (
    <div className="page-stack">
      <section className="panel">
        <h2>RAFINE</h2>
        <p className="muted">メッセージ</p>
        <div className="inline-row">
          <button className="btn ghost" type="button" onClick={() => void requestNotification()}>
            通知を許可
          </button>
          <span className="muted">通知: {notificationPermission}</span>
          <span className="muted">{onlineLabel}</span>
        </div>
      </section>

      <section className="panel">
        <div className="rafine-message-list" ref={listRef}>
          {displayedMessages.length === 0 && <p className="muted">まだメッセージがありません。</p>}
          {displayedMessages.map((message) => {
            const mine = message.userId === currentUserId
            return (
              <div key={message.id} className={`rafine-message-item ${mine ? 'mine' : ''}`}>
                <img src={getMemberIcon(message.displayName)} alt="" className="member-chip-icon rafine-msg-icon" />
                <div className="rafine-message-body">
                  <div className="rafine-message-head">
                    <strong>{message.displayName}</strong>
                    <div className="rafine-message-actions">
                      <span className="muted">{formatTime(message.createdAt)}</span>
                      {mine && (
                        <button className="rafine-message-delete" type="button" onClick={() => void onDelete(message.id)}>
                          削除
                        </button>
                      )}
                    </div>
                  </div>
                  <p>{message.text}</p>
                </div>
              </div>
            )
          })}
        </div>
        <div className="rafine-compose">
          <input
            className="field"
            placeholder="メッセージを入力"
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                void onSend()
              }
            }}
          />
          <button className="btn" type="button" onClick={() => void onSend()} disabled={!canSend}>
            送信
          </button>
        </div>
      </section>
    </div>
  )
}
