import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  where,
} from 'firebase/firestore'
import { deleteObject, getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage'
import { useSearchParams } from 'react-router-dom'
import { getMemberIcon } from '../lib/memberIcon'
import { firebaseStorage, firestoreDb } from '../lib/firebase'
import { isNewerThanSeen, loadSeenState, markSeenNow } from '../lib/notice'
import { useApp } from '../store/AppContext'

interface RafineMessage {
  id: string
  text: string
  userId: string
  recipientId?: string
  displayName: string
  createdAt: string
  mediaUrl?: string
  mediaType?: string
  mediaName?: string
  attachmentId?: string
  attachmentPath?: string
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

const toNoticeText = (message: Pick<RafineMessage, 'text' | 'mediaType'>) => {
  const body = message.text.trim()
  if (body) return body
  if (message.mediaType?.startsWith('image/')) return '[画像]'
  if (message.mediaType?.startsWith('video/')) return '[動画]'
  return '[添付ファイル]'
}

const stripUndefinedFields = <T extends Record<string, unknown>>(value: T) => {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  ) as T
}

const base64ToBlob = (base64: string, mediaType: string) => {
  const binary = window.atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return new Blob([bytes], { type: mediaType })
}

export const RafinePage = () => {
  const { data, currentUserId, workspaceId, storageMode } = useApp()
  const [searchParams, setSearchParams] = useSearchParams()
  const me =
    data.members.find((member) => member.id === currentUserId) ??
    data.members[0] ?? {
      id: currentUserId,
      displayName: '自分',
      role: 'メンバー',
      notificationsEnabled: true,
    }
  const dmTargetId = searchParams.get('dm') ?? ''
  const dmTarget = data.members.find((member) => member.id === dmTargetId && member.id !== currentUserId)
  const [text, setText] = useState('')
  const [attachedFile, setAttachedFile] = useState<File | null>(null)
  const [messages, setMessages] = useState<RafineMessage[]>([])
  const [attachmentUrls, setAttachmentUrls] = useState<Record<string, string>>({})
  const [localVersion, setLocalVersion] = useState(0)
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    typeof Notification === 'undefined' ? 'denied' : Notification.permission,
  )
  const [inlineNotice, setInlineNotice] = useState('')
  const listRef = useRef<HTMLDivElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const lastMessageIdRef = useRef<string | null>(null)
  const attachmentUrlsRef = useRef<Record<string, string>>({})
  const localMessages = useMemo(() => {
    void localVersion
    return loadLocalMessages(workspaceId)
  }, [workspaceId, localVersion])
  const attachedPreviewUrl = useMemo(
    () => (attachedFile ? URL.createObjectURL(attachedFile) : ''),
    [attachedFile],
  )
  const allMessages = storageMode === 'firebase' ? messages : localMessages
  const seenRafineAt = loadSeenState(workspaceId, currentUserId).rafine
  const displayedMessages = useMemo(
    () =>
      allMessages.filter((message) => {
        if (!dmTarget) return !message.recipientId
        return (
          (message.userId === currentUserId && message.recipientId === dmTarget.id) ||
          (message.userId === dmTarget.id && message.recipientId === currentUserId)
        )
      }),
    [allMessages, currentUserId, dmTarget],
  )
  const attachmentIdsToLoad = useMemo(() => {
    if (storageMode !== 'firebase') return []
    const ids = new Set<string>()
    displayedMessages.forEach((message) => {
      const key = message.attachmentPath ?? message.attachmentId
      if (key && !message.mediaUrl && !attachmentUrls[key]) {
        ids.add(key)
      }
    })
    return [...ids]
  }, [attachmentUrls, displayedMessages, storageMode])

  useEffect(() => {
    if (displayedMessages.length === 0) return
    markSeenNow(workspaceId, currentUserId, 'rafine')
  }, [displayedMessages.length, workspaceId, currentUserId])

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
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') {
      const openTimer = window.setTimeout(() => {
        setInlineNotice(`${latest.displayName}: ${toNoticeText(latest)}`)
      }, 0)
      const closeTimer = window.setTimeout(() => setInlineNotice(''), 4200)
      return () => {
        window.clearTimeout(openTimer)
        window.clearTimeout(closeTimer)
      }
    }

    const notification = new Notification(`RAFINE: ${latest.displayName}`, {
      body: toNoticeText(latest),
      tag: 'rafine-message',
    })
    notification.onclick = () => window.focus()
  }, [currentUserId, displayedMessages])

  useEffect(() => {
    if (!attachedPreviewUrl) return
    return () => URL.revokeObjectURL(attachedPreviewUrl)
  }, [attachedPreviewUrl])

  useEffect(() => {
    attachmentUrlsRef.current = attachmentUrls
  }, [attachmentUrls])

  useEffect(() => {
    if (storageMode !== 'firebase' || !firestoreDb) return
    const db = firestoreDb
    if (attachmentIdsToLoad.length === 0) return

    let cancelled = false

    const loadAttachments = async () => {
      const nextUrls: Record<string, string> = {}

      await Promise.all(
        attachmentIdsToLoad.map(async (attachmentKey) => {
          const message = displayedMessages.find(
            (entry) => entry.attachmentPath === attachmentKey || entry.attachmentId === attachmentKey,
          )
          if (!message) return

          if (message.attachmentPath) {
            if (!firebaseStorage) return
            nextUrls[attachmentKey] = await getDownloadURL(storageRef(firebaseStorage, message.attachmentPath))
            return
          }

          const chunksSnap = await getDocs(
            query(
              collection(db, 'workspaces', workspaceId, 'rafine_attachments'),
              where('attachmentId', '==', attachmentKey),
            ),
          )
          const chunks = chunksSnap.docs
            .map((item) => item.data() as { attachmentId: string; index: number; data: string })
            .sort((left, right) => left.index - right.index)
          const mediaType = message.mediaType ?? 'application/octet-stream'
          const blob = base64ToBlob(chunks.map((chunk) => chunk.data).join(''), mediaType)
          nextUrls[attachmentKey] = URL.createObjectURL(blob)
        }),
      )

      if (cancelled) {
        Object.values(nextUrls).forEach((url) => URL.revokeObjectURL(url))
        return
      }

      setAttachmentUrls((prev) => ({ ...prev, ...nextUrls }))
    }

    void loadAttachments()

    return () => {
      cancelled = true
    }
  }, [attachmentIdsToLoad, displayedMessages, firestoreDb, storageMode, workspaceId])

  useEffect(() => {
    return () => {
      Object.values(attachmentUrlsRef.current).forEach((url) => URL.revokeObjectURL(url))
    }
  }, [])

  const canSend = text.trim().length > 0 || !!attachedFile
  const onlineLabel = useMemo(
    () => (storageMode === 'firebase' ? '共有メッセージ（全員同期）' : 'この端末のみ'),
    [storageMode],
  )

  const onPickFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      window.alert('画像または動画ファイルを選択してください。')
      event.target.value = ''
      return
    }
    if (storageMode === 'local' && file.size > 4 * 1024 * 1024) {
      window.alert('この端末のみモードでは、4MB以下の画像/動画を選択してください。')
      event.target.value = ''
      return
    }
    setAttachedFile(file)
  }

  const clearAttachedFile = () => {
    setAttachedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const onSend = async () => {
    if (!canSend) return
    const payloadBase = stripUndefinedFields({
      text: text.trim(),
      userId: currentUserId,
      recipientId: dmTarget?.id,
      displayName: me.displayName,
      createdAt: new Date().toISOString(),
    })
    const payload: Omit<RafineMessage, 'id'> = { ...payloadBase }

    try {
      if (attachedFile) {
        if (storageMode === 'firebase' && firestoreDb) {
          if (!firebaseStorage) throw new Error('firebase-storage-unavailable')
          const attachmentId = crypto.randomUUID()
          const attachmentPath = `workspaces/${workspaceId}/rafine/${attachmentId}-${attachedFile.name}`
          await uploadBytes(storageRef(firebaseStorage, attachmentPath), attachedFile, {
            contentType: attachedFile.type,
          })
          payload.attachmentPath = attachmentPath
          payload.attachmentId = attachmentId
          payload.mediaName = attachedFile.name
          payload.mediaType = attachedFile.type
        } else {
          payload.mediaUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve(String(reader.result ?? ''))
            reader.onerror = () => reject(new Error('read-failed'))
            reader.readAsDataURL(attachedFile)
          })
          payload.mediaType = attachedFile.type
          payload.mediaName = attachedFile.name
        }
      }

      if (storageMode === 'firebase' && firestoreDb) {
        await addDoc(collection(firestoreDb, 'workspaces', workspaceId, 'rafine_messages'), payload)
      } else {
        const next = [...localMessages, { id: crypto.randomUUID(), ...payload }]
        saveLocalMessages(workspaceId, next)
        setLocalVersion((prev) => prev + 1)
      }
      setText('')
      clearAttachedFile()
    } catch (error) {
      console.error('[RAFINE] send failed', error)
      setInlineNotice('送信に失敗しました。通信状態を確認して再送してください。')
      window.setTimeout(() => setInlineNotice(''), 4200)
    }
  }

  const onDelete = async (messageId: string) => {
    if (!window.confirm('このメッセージを削除しますか？')) return
    if (storageMode === 'firebase' && firestoreDb) {
      const db = firestoreDb
      const target = messages.find((message) => message.id === messageId)
      const attachmentKey = target?.attachmentPath ?? target?.attachmentId
      if (attachmentKey) {
        if (target?.attachmentPath && firebaseStorage) {
          await deleteObject(storageRef(firebaseStorage, target.attachmentPath))
        } else if (target?.attachmentId) {
          const attachmentsSnap = await getDocs(
            query(
              collection(db, 'workspaces', workspaceId, 'rafine_attachments'),
              where('attachmentId', '==', target.attachmentId),
            ),
          )
          await Promise.all(
            attachmentsSnap.docs.map((item) =>
              deleteDoc(doc(db, 'workspaces', workspaceId, 'rafine_attachments', item.id)),
            ),
          )
        }
        setAttachmentUrls((prev) => {
          const next = { ...prev }
          if (next[attachmentKey]) {
            URL.revokeObjectURL(next[attachmentKey])
            delete next[attachmentKey]
          }
          return next
        })
      }
      await deleteDoc(doc(db, 'workspaces', workspaceId, 'rafine_messages', messageId))
      return
    }
    const next = localMessages.filter((message) => message.id !== messageId)
    saveLocalMessages(workspaceId, next)
    setLocalVersion((prev) => prev + 1)
  }

  const requestNotification = async () => {
    if (typeof Notification === 'undefined') {
      window.alert('この環境ではブラウザ通知が使えません。RAFINEの画面内通知で受け取れます。')
      return
    }
    const result = await Notification.requestPermission()
    setNotificationPermission(result)
    if (result !== 'granted') {
      window.alert('通知が許可されていません。必要ならブラウザ設定で通知を許可してください。')
    }
  }

  return (
    <div className="page-stack">
      <section className="panel">
        <h2>RAFINE</h2>
        <p className="muted">メッセージ</p>
        {dmTarget && <p className="muted">DM相手: {dmTarget.displayName}</p>}
        <div className="inline-row">
          {dmTarget && (
            <button className="btn ghost" type="button" onClick={() => setSearchParams({})}>
              全体チャットへ戻る
            </button>
          )}
          <button className="btn ghost" type="button" onClick={() => void requestNotification()}>
            通知を許可
          </button>
          <span className="muted">通知: {notificationPermission}</span>
          <span className="muted">{onlineLabel}</span>
        </div>
        {inlineNotice && <p className="rafine-inline-notice">{inlineNotice}</p>}
      </section>

      <section className="panel">
        <div className="rafine-message-list" ref={listRef}>
          {displayedMessages.length === 0 && <p className="muted">まだメッセージがありません。</p>}
          {displayedMessages.map((message) => {
            const mine = message.userId === currentUserId
            const isNew =
              !mine &&
              (!message.recipientId || message.recipientId === currentUserId) &&
              isNewerThanSeen(message.createdAt, seenRafineAt)
            const resolvedMediaUrl = message.mediaUrl ?? (message.attachmentId ? attachmentUrls[message.attachmentId] : '')
            return (
              <div key={message.id} className={`rafine-message-item ${mine ? 'mine' : ''}`}>
                <img src={getMemberIcon(message.displayName)} alt="" className="member-chip-icon rafine-msg-icon" />
                <div className="rafine-message-body">
                  <div className="rafine-message-head">
                    <strong className="card-title-with-dot">
                      {message.displayName}
                      {isNew && <span className="item-new-dot" aria-label="新着" />}
                    </strong>
                    <div className="rafine-message-actions">
                      <span className="muted">{formatTime(message.createdAt)}</span>
                      {mine && (
                        <button className="rafine-message-delete" type="button" onClick={() => void onDelete(message.id)}>
                          削除
                        </button>
                      )}
                    </div>
                  </div>
                  {message.text && <p>{message.text}</p>}
                  {resolvedMediaUrl && message.mediaType?.startsWith('image/') && (
                    <img src={resolvedMediaUrl} alt={message.mediaName ?? '添付画像'} className="rafine-media" />
                  )}
                  {resolvedMediaUrl && message.mediaType?.startsWith('video/') && (
                    <video className="rafine-media" controls preload="metadata" src={resolvedMediaUrl}>
                      お使いの環境では動画を再生できません。
                    </video>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        <form
          className="rafine-compose"
          onSubmit={(event) => {
            event.preventDefault()
            void onSend()
          }}
        >
          <input
            className="field"
            placeholder="メッセージを入力"
            autoComplete="off"
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                void onSend()
              }
            }}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            className="rafine-file-input"
            onChange={onPickFile}
          />
          <button className="btn ghost" type="button" onClick={() => fileInputRef.current?.click()}>
            画像/動画
          </button>
          <button className="btn" type="submit" disabled={!canSend}>
            送信
          </button>
        </form>
        {attachedFile && (
          <div className="rafine-attach-preview">
            <p className="muted">添付: {attachedFile.name}</p>
            {attachedPreviewUrl && attachedFile.type.startsWith('image/') && (
              <img src={attachedPreviewUrl} alt="添付プレビュー" className="rafine-media" />
            )}
            {attachedPreviewUrl && attachedFile.type.startsWith('video/') && (
              <video className="rafine-media" controls preload="metadata" src={attachedPreviewUrl}>
                お使いの環境では動画を再生できません。
              </video>
            )}
            <button className="btn ghost" type="button" onClick={clearAttachedFile}>
              添付を外す
            </button>
          </div>
        )}
      </section>
    </div>
  )
}
