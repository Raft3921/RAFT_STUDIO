/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { signInAnonymously } from 'firebase/auth'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import { firestoreDb, firebaseAuth, isFirebaseEnabled } from '../lib/firebase'
import { normalizePlan } from '../lib/plan'
import { defaultMembers, loadData, saveData } from '../lib/storage'
import { buildWorkspaceInviteUrl, getOrCreateWorkspaceId } from '../lib/workspace'
import type { AppData, Attendance, EventItem, EventResponse, Member, Plan, PlanStatus } from '../types'

interface CreatePlanInput {
  title: string
  templateType: string
  durationSec: number
  participantIds: Plan['participantIds']
  goal: Plan['goal']
  assets: string[]
  roleAssignments: Plan['roleAssignments']
  memo?: string
}

interface CreateEventInput {
  title: string
  planId?: string
  datetime: string
  meetingPoint: string
  location: string
  timeline: string[]
  checklist: { label: string; scope: 'all' | 'role' | 'member'; assigneeIds?: string[] }[]
}

type StorageMode = 'local' | 'firebase'
const STORAGE_MODE_KEY = 'youtube-planner-storage-mode'
const DISPLAY_NAME_KEY = 'youtube-planner-display-name'

interface AppContextValue {
  currentUserId: string
  workspaceId: string
  storageMode: StorageMode
  firebaseAvailable: boolean
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
  switchStorageMode: (mode: StorageMode) => void
}

const AppContext = createContext<AppContextValue | null>(null)

const createId = () => crypto.randomUUID()
const normalizeDisplayName = (name: string) => name.trim().replace(/\s+/g, ' ')
const isLegacyMemberName = (name: string) =>
  ['自分', 'メンバー', 'メンバーA', 'メンバーB', 'unknown', '名無し'].includes(normalizeDisplayName(name))
const fallbackDisplayName = 'ラフト'
const memberIdFromName = (displayName: string) =>
  `name-${encodeURIComponent(normalizeDisplayName(displayName).toLowerCase())}`
const dedupeMembersByName = (members: Member[]) => {
  const seen = new Set<string>()
  return members.filter((member) => {
    const key = normalizeDisplayName(member.displayName).toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const [data, setData] = useState<AppData>(() => loadData())
  const [workspaceId] = useState(() => getOrCreateWorkspaceId())
  const [preferredDisplayName, setPreferredDisplayName] = useState(() => {
    return normalizeDisplayName(localStorage.getItem(DISPLAY_NAME_KEY) ?? fallbackDisplayName)
  })
  const [currentUserId, setCurrentUserId] = useState(() => {
    const initialData = loadData()
    const byName = initialData.members.find(
      (member) => normalizeDisplayName(member.displayName) === normalizeDisplayName(localStorage.getItem(DISPLAY_NAME_KEY) ?? fallbackDisplayName),
    )
    return byName?.id ?? memberIdFromName(localStorage.getItem(DISPLAY_NAME_KEY) ?? fallbackDisplayName)
  })
  const [storageMode, setStorageMode] = useState<StorageMode>(() => {
    if (!isFirebaseEnabled) return 'local'
    const saved = localStorage.getItem(STORAGE_MODE_KEY)
    return saved === 'local' ? 'local' : 'firebase'
  })
  const [ready, setReady] = useState(!isFirebaseEnabled || storageMode === 'local')

  useEffect(() => {
    localStorage.setItem(STORAGE_MODE_KEY, storageMode)
  }, [storageMode])

  useEffect(() => {
    localStorage.setItem(DISPLAY_NAME_KEY, preferredDisplayName)
  }, [preferredDisplayName])

  useEffect(() => {
    if (storageMode !== 'firebase' || !isFirebaseEnabled || !firebaseAuth || !firestoreDb) {
      return
    }

    const auth = firebaseAuth
    const db = firestoreDb

    let unsubscribers: Array<() => void> = []

    const startSync = async () => {
      if (!auth.currentUser) {
        await signInAnonymously(auth)
      }

      const workspaceRef = doc(db, 'workspaces', workspaceId)
      await setDoc(workspaceRef, { updatedAt: serverTimestamp() }, { merge: true })

      const membersSnapshot = await getDocs(collection(workspaceRef, 'members'))
      const legacyMemberDocs = membersSnapshot.docs.filter((item) =>
        isLegacyMemberName(String(item.data().displayName ?? '')),
      )
      await Promise.all(legacyMemberDocs.map((item) => deleteDoc(doc(workspaceRef, 'members', item.id))))
      const existingNames = new Set(
        membersSnapshot.docs
          .map((item) => normalizeDisplayName(String(item.data().displayName ?? '')).toLowerCase())
          .filter((name) => !!name && !isLegacyMemberName(name)),
      )
      await Promise.all(
        defaultMembers
          .filter((member) => !existingNames.has(normalizeDisplayName(member.displayName).toLowerCase()))
          .map((member) =>
            setDoc(doc(workspaceRef, 'members', member.id), member, { merge: true }),
          ),
      )

      const existingByName = membersSnapshot.docs.find(
        (item) =>
          !isLegacyMemberName(String(item.data().displayName ?? '')) &&
          normalizeDisplayName(String(item.data().displayName ?? '')) ===
          normalizeDisplayName(preferredDisplayName),
      )
      const userId = existingByName?.id ?? memberIdFromName(preferredDisplayName)
      setCurrentUserId(userId)

      const memberRef = doc(workspaceRef, 'members', userId)
      await setDoc(
        memberRef,
        {
          displayName: preferredDisplayName,
          role: 'メンバー',
          notificationsEnabled: true,
        } satisfies Omit<Member, 'id'>,
        { merge: true },
      )

      unsubscribers = [
        onSnapshot(query(collection(workspaceRef, 'plans'), orderBy('createdAt', 'desc')), (snapshot) => {
          const plans = snapshot.docs.map((item) =>
            normalizePlan({ id: item.id, ...(item.data() as Omit<Plan, 'id'>) }),
          )
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
          const members = snapshot.docs
            .map((item) => ({ id: item.id, ...(item.data() as Omit<Member, 'id'>) }))
            .filter((member) => !isLegacyMemberName(member.displayName))
          const merged = dedupeMembersByName([...members, ...defaultMembers])
          setData((prev) => ({ ...prev, members: merged }))
        }),
      ]
    }

    startSync().catch(() => {
      setStorageMode('local')
      setCurrentUserId(memberIdFromName(preferredDisplayName))
      setReady(true)
    })

    return () => {
      unsubscribers.forEach((unsub) => unsub())
    }
  }, [preferredDisplayName, storageMode, workspaceId])

  useEffect(() => {
    if (storageMode === 'local') {
      saveData(data)
    }
  }, [data, storageMode])

  const migrateLocalDataToFirebase = useCallback(async () => {
    if (!isFirebaseEnabled || !firebaseAuth || !firestoreDb) return false

    if (!firebaseAuth.currentUser) {
      await signInAnonymously(firebaseAuth)
    }
    const userId = memberIdFromName(preferredDisplayName)
    const localData = loadData()
    const workspaceRef = doc(firestoreDb, 'workspaces', workspaceId)

    await setDoc(workspaceRef, { updatedAt: serverTimestamp() }, { merge: true })

    await Promise.all(
      localData.members.map((member) =>
        setDoc(doc(workspaceRef, 'members', member.id), member, { merge: true }),
      ),
    )

    await Promise.all(
      localData.plans.map((plan) => setDoc(doc(workspaceRef, 'plans', plan.id), plan, { merge: true })),
    )

    await Promise.all(
      localData.events.map((event) => setDoc(doc(workspaceRef, 'events', event.id), event, { merge: true })),
    )

    await Promise.all(
      localData.responses.map((response) =>
        setDoc(doc(workspaceRef, 'responses', `${response.eventId}_${response.userId}`), response, { merge: true }),
      ),
    )

    await setDoc(
      doc(workspaceRef, 'members', userId),
      {
        displayName: preferredDisplayName,
        role: 'メンバー',
        notificationsEnabled: true,
      } satisfies Omit<Member, 'id'>,
      { merge: true },
    )

    setCurrentUserId(userId)
    setStorageMode('firebase')
    setReady(false)
    return true
  }, [preferredDisplayName, workspaceId])

  const value = useMemo<AppContextValue>(
    () => ({
      currentUserId,
      workspaceId,
      storageMode,
      firebaseAvailable: isFirebaseEnabled,
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
        const checklist = input.checklist.map((item) => ({
          ...item,
          assigneeIds: item.scope === 'member' ? item.assigneeIds ?? [] : [],
          id: createId(),
          doneBy: [],
        }))

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
        const trimmed = normalizeDisplayName(displayName)
        if (!trimmed) return
        setPreferredDisplayName(trimmed)

        const existingSameName = data.members.find(
          (member) =>
            normalizeDisplayName(member.displayName) === trimmed && member.id !== currentUserId,
        )
        const nextUserId = existingSameName?.id ?? memberIdFromName(trimmed)

        if (storageMode === 'firebase' && firestoreDb) {
          const db = firestoreDb
          if (nextUserId !== currentUserId) {
            const myResponses = data.responses.filter((item) => item.userId === currentUserId)
            await Promise.all(
              myResponses.map(async (response) => {
                const migrated = { ...response, userId: nextUserId }
                await setDoc(
                  doc(db, 'workspaces', workspaceId, 'responses', `${response.eventId}_${nextUserId}`),
                  migrated,
                  { merge: true },
                )
                await deleteDoc(
                  doc(db, 'workspaces', workspaceId, 'responses', `${response.eventId}_${response.userId}`),
                )
              }),
            )

            await Promise.all(
              data.events.map(async (event) => {
                const changed = event.checklist.some((item) => item.doneBy.includes(currentUserId))
                if (!changed) return
                const checklist = event.checklist.map((item) => ({
                  ...item,
                  doneBy: item.doneBy.map((id) => (id === currentUserId ? nextUserId : id)),
                }))
                await updateDoc(doc(db, 'workspaces', workspaceId, 'events', event.id), { checklist })
              }),
            )
          }

          await setDoc(
            doc(db, 'workspaces', workspaceId, 'members', nextUserId),
            { displayName: trimmed },
            { merge: true },
          )
          if (nextUserId !== currentUserId) {
            setCurrentUserId(nextUserId)
          }
          return
        }

        setData((prev) => ({
          ...prev,
          members: (() => {
            const withoutCurrent = prev.members.filter((member) => member.id !== currentUserId)
            if (existingSameName) {
              return withoutCurrent
            }
            const sameId = withoutCurrent.find((member) => member.id === nextUserId)
            if (sameId) {
              return withoutCurrent.map((member) =>
                member.id === nextUserId ? { ...member, displayName: trimmed } : member,
              )
            }
            return [
              ...withoutCurrent,
              {
                id: nextUserId,
                displayName: trimmed,
                role: 'メンバー',
                notificationsEnabled: true,
              },
            ]
          })(),
          responses: prev.responses.map((item) =>
            item.userId === currentUserId ? { ...item, userId: nextUserId } : item,
          ),
          events: prev.events.map((event) => ({
            ...event,
            checklist: event.checklist.map((item) => ({
              ...item,
              doneBy: item.doneBy.map((id) => (id === currentUserId ? nextUserId : id)),
            })),
          })),
        }))
        setCurrentUserId(nextUserId)
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
        if (storageMode === 'local') {
          await migrateLocalDataToFirebase()
        }
        const inviteUrl = buildWorkspaceInviteUrl(workspaceId)
        await navigator.clipboard.writeText(inviteUrl)
      },
      switchStorageMode: (mode) => {
        if (mode === 'firebase' && !isFirebaseEnabled) {
          return
        }
        if (mode === storageMode) {
          return
        }
        setStorageMode(mode)
        if (mode === 'local') {
          const localData = loadData()
          setData(localData)
          const sameNameMember = localData.members.find(
            (member) => normalizeDisplayName(member.displayName) === normalizeDisplayName(preferredDisplayName),
          )
          setCurrentUserId(sameNameMember?.id ?? memberIdFromName(preferredDisplayName))
          setReady(true)
        } else {
          setReady(false)
        }
      },
    }),
    [currentUserId, data, migrateLocalDataToFirebase, preferredDisplayName, ready, storageMode, workspaceId],
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
