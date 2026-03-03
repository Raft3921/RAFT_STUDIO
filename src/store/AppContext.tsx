/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { signInAnonymously } from 'firebase/auth'
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import { firestoreDb, firebaseAuth, isFirebaseEnabled } from '../lib/firebase'
import { loadData, saveData } from '../lib/storage'
import { buildWorkspaceInviteUrl, getOrCreateWorkspaceId } from '../lib/workspace'
import type { AppData, Attendance, EventItem, EventResponse, Member, Plan, PlanStatus } from '../types'

interface CreatePlanInput {
  title: string
  templateType: string
  duration: Plan['duration']
  memberSize: Plan['memberSize']
  goal: Plan['goal']
  assets: string[]
  memo?: string
}

interface CreateEventInput {
  title: string
  planId?: string
  datetime: string
  meetingPoint: string
  location: string
  timeline: string[]
  checklist: { label: string; scope: 'all' | 'role' }[]
}

type StorageMode = 'local' | 'firebase'

interface AppContextValue {
  currentUserId: string
  workspaceId: string
  storageMode: StorageMode
  ready: boolean
  data: AppData
  createPlan: (input: CreatePlanInput) => Promise<void>
  updatePlanStatus: (planId: string, status: PlanStatus) => Promise<void>
  createEvent: (input: CreateEventInput) => Promise<void>
  setAttendance: (eventId: string, response: Attendance, comment?: string) => Promise<void>
  toggleChecklist: (eventId: string, itemId: string) => Promise<void>
  updateMyProfile: (displayName: string) => Promise<void>
  toggleMyNotification: () => Promise<void>
  copyWorkspaceLink: () => Promise<void>
}

const AppContext = createContext<AppContextValue | null>(null)

const createId = () => crypto.randomUUID()

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const [data, setData] = useState<AppData>(() => loadData())
  const [workspaceId] = useState(() => getOrCreateWorkspaceId())
  const [currentUserId, setCurrentUserId] = useState('u-me')
  const [storageMode, setStorageMode] = useState<StorageMode>(isFirebaseEnabled ? 'firebase' : 'local')
  const [ready, setReady] = useState(!isFirebaseEnabled)

  useEffect(() => {
    if (!isFirebaseEnabled || !firebaseAuth || !firestoreDb) {
      return
    }

    const auth = firebaseAuth
    const db = firestoreDb

    let unsubscribers: Array<() => void> = []

    const startSync = async () => {
      const authUser = auth.currentUser ?? (await signInAnonymously(auth)).user
      const userId = authUser.uid
      setCurrentUserId(userId)

      const workspaceRef = doc(db, 'workspaces', workspaceId)
      await setDoc(workspaceRef, { updatedAt: serverTimestamp() }, { merge: true })

      const memberRef = doc(workspaceRef, 'members', userId)
      await setDoc(
        memberRef,
        {
          displayName: 'メンバー',
          role: 'メンバー',
          notificationsEnabled: true,
        } satisfies Omit<Member, 'id'>,
        { merge: true },
      )

      unsubscribers = [
        onSnapshot(query(collection(workspaceRef, 'plans'), orderBy('createdAt', 'desc')), (snapshot) => {
          const plans = snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<Plan, 'id'>) }))
          setData((prev) => ({ ...prev, plans }))
          setReady(true)
        }),
        onSnapshot(query(collection(workspaceRef, 'events'), orderBy('createdAt', 'desc')), (snapshot) => {
          const events = snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<EventItem, 'id'>) }))
          setData((prev) => ({ ...prev, events }))
        }),
        onSnapshot(collection(workspaceRef, 'responses'), (snapshot) => {
          const responses = snapshot.docs.map((item) => item.data() as EventResponse)
          setData((prev) => ({ ...prev, responses }))
        }),
        onSnapshot(collection(workspaceRef, 'members'), (snapshot) => {
          const members = snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<Member, 'id'>) }))
          setData((prev) => ({ ...prev, members }))
        }),
      ]
    }

    startSync().catch(() => {
      setStorageMode('local')
      setCurrentUserId('u-me')
      setReady(true)
    })

    return () => {
      unsubscribers.forEach((unsub) => unsub())
    }
  }, [workspaceId])

  useEffect(() => {
    if (storageMode === 'local') {
      saveData(data)
    }
  }, [data, storageMode])

  const value = useMemo<AppContextValue>(
    () => ({
      currentUserId,
      workspaceId,
      storageMode,
      ready,
      data,
      createPlan: async (input) => {
        if (storageMode === 'firebase' && firestoreDb) {
          const db = firestoreDb
          const workspaceRef = doc(db, 'workspaces', workspaceId)
          await addDoc(collection(workspaceRef, 'plans'), {
            ...input,
            createdAt: new Date().toISOString(),
            createdBy: currentUserId,
            status: 'candidate',
          } satisfies Omit<Plan, 'id'>)
          return
        }

        const plan: Plan = {
          id: createId(),
          createdAt: new Date().toISOString(),
          createdBy: currentUserId,
          status: 'candidate',
          ...input,
        }
        setData((prev) => ({ ...prev, plans: [plan, ...prev.plans] }))
      },
      updatePlanStatus: async (planId, status) => {
        if (storageMode === 'firebase' && firestoreDb) {
          const db = firestoreDb
          await updateDoc(doc(db, 'workspaces', workspaceId, 'plans', planId), { status })
          return
        }
        setData((prev) => ({
          ...prev,
          plans: prev.plans.map((plan) => (plan.id === planId ? { ...plan, status } : plan)),
        }))
      },
      createEvent: async (input) => {
        const checklist = input.checklist.map((item) => ({ ...item, id: createId(), doneBy: [] }))

        if (storageMode === 'firebase' && firestoreDb) {
          const db = firestoreDb
          const workspaceRef = doc(db, 'workspaces', workspaceId)
          await addDoc(collection(workspaceRef, 'events'), {
            ...input,
            checklist,
            createdAt: new Date().toISOString(),
          } satisfies Omit<EventItem, 'id'>)
          return
        }

        const event: EventItem = {
          id: createId(),
          createdAt: new Date().toISOString(),
          ...input,
          checklist,
        }
        setData((prev) => ({ ...prev, events: [event, ...prev.events] }))
      },
      setAttendance: async (eventId, response, comment) => {
        const nextItem: EventResponse = { eventId, userId: currentUserId, response, comment }

        if (storageMode === 'firebase' && firestoreDb) {
          const db = firestoreDb
          await setDoc(doc(db, 'workspaces', workspaceId, 'responses', `${eventId}_${currentUserId}`), nextItem)
          return
        }

        setData((prev) => {
          const current = prev.responses.find((item) => item.eventId === eventId && item.userId === currentUserId)
          if (!current) {
            return { ...prev, responses: [...prev.responses, nextItem] }
          }
          return {
            ...prev,
            responses: prev.responses.map((item) =>
              item.eventId === eventId && item.userId === currentUserId ? nextItem : item,
            ),
          }
        })
      },
      toggleChecklist: async (eventId, itemId) => {
        const event = data.events.find((item) => item.id === eventId)
        if (!event) return

        const nextChecklist = event.checklist.map((item) => {
          if (item.id !== itemId) return item
          const hasDone = item.doneBy.includes(currentUserId)
          return {
            ...item,
            doneBy: hasDone ? item.doneBy.filter((id) => id !== currentUserId) : [...item.doneBy, currentUserId],
          }
        })

        if (storageMode === 'firebase' && firestoreDb) {
          const db = firestoreDb
          await updateDoc(doc(db, 'workspaces', workspaceId, 'events', eventId), {
            checklist: nextChecklist,
          })
          return
        }

        setData((prev) => ({
          ...prev,
          events: prev.events.map((item) => (item.id === eventId ? { ...item, checklist: nextChecklist } : item)),
        }))
      },
      updateMyProfile: async (displayName) => {
        const trimmed = displayName.trim()
        if (!trimmed) return

        if (storageMode === 'firebase' && firestoreDb) {
          const db = firestoreDb
          await setDoc(
            doc(db, 'workspaces', workspaceId, 'members', currentUserId),
            { displayName: trimmed },
            { merge: true },
          )
          return
        }

        setData((prev) => ({
          ...prev,
          members: prev.members.map((member) =>
            member.id === currentUserId ? { ...member, displayName: trimmed } : member,
          ),
        }))
      },
      toggleMyNotification: async () => {
        const me = data.members.find((member) => member.id === currentUserId)
        if (!me) return

        if (storageMode === 'firebase' && firestoreDb) {
          const db = firestoreDb
          await setDoc(
            doc(db, 'workspaces', workspaceId, 'members', currentUserId),
            { notificationsEnabled: !me.notificationsEnabled },
            { merge: true },
          )
          return
        }

        setData((prev) => ({
          ...prev,
          members: prev.members.map((member) =>
            member.id === currentUserId
              ? { ...member, notificationsEnabled: !member.notificationsEnabled }
              : member,
          ),
        }))
      },
      copyWorkspaceLink: async () => {
        const inviteUrl = buildWorkspaceInviteUrl(workspaceId)
        await navigator.clipboard.writeText(inviteUrl)
      },
    }),
    [currentUserId, data, ready, storageMode, workspaceId],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export const useApp = () => {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useApp must be used inside AppProvider')
  }
  return context
}
