import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { CSSProperties } from 'react'
import panelBl from '../../assets/panel_bl.png'
import panelBottom from '../../assets/panel_bottom.png'
import panelBr from '../../assets/panel_br.png'
import panelCenter from '../../assets/panel_center.png'
import panelLeft from '../../assets/panel_left.png'
import panelRight from '../../assets/panel_right.png'
import panelTl from '../../assets/panel_tl.png'
import panelTop from '../../assets/panel_top.png'
import panelTr from '../../assets/panel_tr.png'
import { firebaseAuth, firebaseProjectId } from '../lib/firebase'
import { getMemberIcon } from '../lib/memberIcon'
import { dailyQuestProgress, dailyQuestTemplates, dailyQuestText, isDailyQuestDone } from '../lib/dailyQuest'
import { formatDuration, participantSummaryText, roleSummaryText } from '../lib/plan'
import { useApp } from '../store/AppContext'
import { formatDateTime, nextEvent, responseCount, statusLabel } from '../lib/utils'
import type { DailyQuestTemplate } from '../types'

export const HomePage = () => {
  const { data, currentUserId, workspaceId, storageMode, createDailyQuests, deleteDailyQuest } = useApp()
  const [nowMs, setNowMs] = useState(() => Date.now())
  const [questTemplate, setQuestTemplate] = useState<DailyQuestTemplate>('plan_create')
  const [questAmount, setQuestAmount] = useState(1)
  const [questCustomText, setQuestCustomText] = useState('')
  const [questAssigneeIds, setQuestAssigneeIds] = useState<string[]>([])
  const panelImages = [
    `url('${panelCenter}')`,
    `url('${panelTop}')`,
    `url('${panelBottom}')`,
    `url('${panelLeft}')`,
    `url('${panelRight}')`,
    `url('${panelTl}')`,
    `url('${panelTr}')`,
    `url('${panelBl}')`,
    `url('${panelBr}')`,
  ].join(',')
  const heroPanelStyle = {
    backgroundImage: panelImages,
    '--quest-panel-center': `url('${panelCenter}')`,
    '--quest-panel-top': `url('${panelTop}')`,
    '--quest-panel-bottom': `url('${panelBottom}')`,
    '--quest-panel-left': `url('${panelLeft}')`,
    '--quest-panel-right': `url('${panelRight}')`,
    '--quest-panel-tl': `url('${panelTl}')`,
    '--quest-panel-tr': `url('${panelTr}')`,
    '--quest-panel-bl': `url('${panelBl}')`,
    '--quest-panel-br': `url('${panelBr}')`,
  } as CSSProperties
  const upcoming = nextEvent(data.events)
  const inProgressPlans = data.plans.filter((plan) => ['confirmed', 'shot'].includes(plan.status)).slice(0, 4)
  const me = data.members.find((member) => member.id === currentUserId)
  const isQuestEditor = currentUserId === 'm-raft' || (me?.displayName.trim() ?? '') === 'ラフト'
  const todayKey = useMemo(() => {
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    const d = String(now.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }, [])
  const todayQuests = useMemo(
    () =>
      data.dailyQuests
        .filter((quest) => quest.questDate === todayKey)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [data.dailyQuests, todayKey],
  )
  const myQuests = todayQuests.filter((quest) => quest.assigneeId === currentUserId)
  const myQuestStates = myQuests.map((quest) => ({
    quest,
    progress: dailyQuestProgress(quest, data),
    done: isDailyQuestDone(quest, data),
  }))
  const onlineMembers = data.members.filter((member) => {
    if (storageMode === 'local') return member.id === currentUserId
    if (!member.lastActiveAt) return false
    const activeDiff = nowMs - new Date(member.lastActiveAt).getTime()
    return activeDiff <= 120000
  })
  const uniqueOnlineMembers = onlineMembers.reduce<typeof onlineMembers>((acc, member) => {
    const nameKey = member.displayName.trim().toLowerCase()
    const existingIndex = acc.findIndex((item) => item.displayName.trim().toLowerCase() === nameKey)
    if (existingIndex === -1) {
      acc.push(member)
      return acc
    }

    const existing = acc[existingIndex]
    if (member.id === currentUserId) {
      acc[existingIndex] = member
      return acc
    }
    if (existing.id === currentUserId) {
      return acc
    }

    const existingAt = existing.lastActiveAt ? new Date(existing.lastActiveAt).getTime() : 0
    const nextAt = member.lastActiveAt ? new Date(member.lastActiveAt).getTime() : 0
    if (nextAt > existingAt) {
      acc[existingIndex] = member
    }
    return acc
  }, [])

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 30000)
    return () => window.clearInterval(timer)
  }, [])

  const completionPoints =
    myQuests.length > 0
      ? Math.round((myQuestStates.filter((item) => item.done).length / myQuests.length) * 100)
      : (data.plans.length > 0 ? 35 : 0) +
        (data.events.length > 0 ? 35 : 0) +
        (upcoming ? 30 : 10)

  const nextStep = (() => {
    const nextQuest = myQuestStates.find((item) => !item.done)?.quest
    if (nextQuest) return dailyQuestText(nextQuest)
    if (data.plans.length === 0) return 'まず企画1枚。話はそれから。'
    if (data.events.length === 0) return '撮影日を1つ作る。逃げない。'
    if (upcoming) return '次の撮影準備を進める。持ち物と段取りを確認。'
    return '次の公開へ。決定ステータスまで進める。'
  })()

  const toggleQuestAssignee = (memberId: string) => {
    setQuestAssigneeIds((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId],
    )
  }

  const onCreateQuest = async () => {
    if (!isQuestEditor) return
    if (questAssigneeIds.length === 0) {
      window.alert('対象メンバーを1人以上選択してください。')
      return
    }
    if (questTemplate === 'bring_item' && questCustomText.trim().length === 0) {
      window.alert('持ってくる物を入力してください。')
      return
    }
    try {
      await createDailyQuests({
        questDate: todayKey,
        assigneeIds: questAssigneeIds,
        template: questTemplate,
        amount: questAmount,
        customText: questCustomText,
      })
      setQuestAssigneeIds([])
      setQuestAmount(1)
      setQuestCustomText('')
      window.alert('本日のクエストを追加しました。')
    } catch (error) {
      const message = error instanceof Error ? error.message : ''
      if (message.includes('auth/admin-restricted-operation')) {
        window.alert('匿名ログインが無効です。Firebase Console の Authentication > Sign-in method で匿名認証を有効にしてください。')
        return
      }
      if (message.includes('permission-denied')) {
        window.alert('Firestore権限エラーです。ルールとログイン状態を確認してください。')
        return
      }
      window.alert('クエスト追加に失敗しました。Firebase権限または通信状態を確認してください。')
    }
  }

  return (
    <div className="page-stack">
      <section className="panel hero-panel" style={heroPanelStyle}>
        <div className="quest-panel-skin" aria-hidden>
          <span className="quest-panel-part quest-panel-tl" />
          <span className="quest-panel-part quest-panel-top" />
          <span className="quest-panel-part quest-panel-tr" />
          <span className="quest-panel-part quest-panel-left" />
          <span className="quest-panel-part quest-panel-center" />
          <span className="quest-panel-part quest-panel-right" />
          <span className="quest-panel-part quest-panel-bl" />
          <span className="quest-panel-part quest-panel-bottom" />
          <span className="quest-panel-part quest-panel-br" />
        </div>
        <div className="hero-panel-content">
          <p className="hero-kicker">QUEST</p>
          <h2>本日のクエスト</h2>
          <p>{nextStep}</p>
          <div className="progress-wrap" aria-label="進行度">
            <div className="progress-fill" style={{ width: `${Math.min(100, completionPoints)}%` }} />
          </div>
          <p className="muted">進行度 {Math.min(100, completionPoints)}%</p>
          <div className="stack-gap">
            {myQuests.length === 0 && <p className="muted">自分に割り当てられた本日のクエストはありません。</p>}
            {myQuestStates.map(({ quest, progress, done }) => (
              <div className="check-row" key={quest.id}>
                <span>{done ? '✅' : '⏳'}</span>
                <span>
                  {dailyQuestText(quest)} ({Math.min(Math.max(1, quest.amount || 1), progress)}/
                  {Math.max(1, quest.amount || 1)})
                </span>
              </div>
            ))}
          </div>
          <div className="inline-row">
            <Link className="btn btn-primary" to="/plans/new">
              企画を作る
            </Link>
            <Link className="btn btn-secondary" to="/events/new">
              撮影日を作る
            </Link>
          </div>
        </div>
      </section>

      {isQuestEditor && (
        <section className="panel">
          <h2>本日のクエスト設定（ラフト専用）</h2>
          {storageMode === 'firebase' && (
            <div className="stack-gap">
              <p className="muted">接続先 Firebase: {firebaseProjectId || '未設定'}</p>
              <p className="muted">Workspace: {workspaceId}</p>
              <p className="muted">認証: {firebaseAuth?.currentUser ? 'ログイン済み' : '未ログイン'}</p>
            </div>
          )}
          <label>テンプレート</label>
          <select className="field" value={questTemplate} onChange={(event) => setQuestTemplate(event.target.value as DailyQuestTemplate)}>
            {dailyQuestTemplates.map((template) => (
              <option key={template.value} value={template.value}>
                {template.label}
              </option>
            ))}
          </select>
          {questTemplate !== 'bring_item' && (
            <>
              <label>件数</label>
              <input
                className="field"
                type="number"
                min={1}
                max={20}
                value={questAmount}
                onChange={(event) => setQuestAmount(Math.max(1, Number(event.target.value) || 1))}
              />
            </>
          )}
          {questTemplate === 'bring_item' && (
            <>
              <label>持ってくる物</label>
              <input
                className="field"
                value={questCustomText}
                onChange={(event) => setQuestCustomText(event.target.value)}
                placeholder="例: キャプチャーボード"
              />
            </>
          )}
          <label>対象メンバー（複数可）</label>
          <div className="chip-row">
            {data.members.map((member) => (
              <button
                type="button"
                key={member.id}
                className={`chip ${questAssigneeIds.includes(member.id) ? 'active' : ''}`}
                onClick={() => toggleQuestAssignee(member.id)}
              >
                {member.displayName}
              </button>
            ))}
          </div>
          <button className="btn" type="button" onClick={() => void onCreateQuest()}>
            本日のクエストを追加
          </button>

          <div className="stack-gap">
            {todayQuests.map((quest) => {
              const assignee = data.members.find((member) => member.id === quest.assigneeId)
              const done = isDailyQuestDone(quest, data)
              const progress = dailyQuestProgress(quest, data)
              return (
                <div key={quest.id} className="card">
                  <p>
                    {assignee?.displayName ?? 'メンバー'}: {dailyQuestText(quest)}
                  </p>
                  <div className="inline-row">
                    <span className="muted">
                      {done ? '達成' : `進捗 ${Math.min(Math.max(1, quest.amount || 1), progress)}/${Math.max(1, quest.amount || 1)}`}
                    </span>
                    <button className="btn warn" type="button" onClick={() => void deleteDailyQuest(quest.id)}>
                      削除
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      <section className="panel">
        <div className="section-head">
          <h2>現在オンライン</h2>
          <span className="muted">{uniqueOnlineMembers.length}人</span>
        </div>
        <div className="chip-row">
          {uniqueOnlineMembers.map((member) => (
            member.id === currentUserId ? (
              <span className="chip active" key={member.id}>
                <span className="member-chip-label">
                  <img src={getMemberIcon(member.displayName)} alt="" className="member-chip-icon" />
                  <span>{member.displayName}</span>
                </span>
              </span>
            ) : (
              <Link className="chip" to={`/rafine?dm=${member.id}`} key={member.id}>
                <span className="member-chip-label">
                  <img src={getMemberIcon(member.displayName)} alt="" className="member-chip-icon" />
                  <span>{member.displayName}にDM</span>
                </span>
              </Link>
            )
          ))}
        </div>
      </section>

      <section className="panel">
        <h2>次の撮影</h2>
        {!upcoming && <p className="muted">まだ撮影日がありません。</p>}
        {upcoming && (
          <div className="card">
            <strong>{upcoming.title}</strong>
            <p>{formatDateTime(upcoming.datetime)}</p>
            <p>集合: {upcoming.meetingPoint}</p>
            <p>場所: {upcoming.location}</p>
            <div className="inline-row">
              {(() => {
                const counts = responseCount(upcoming.id, data.responses)
                return (
                  <span className="muted">
                    出欠: ◯{counts.yes} / △{counts.no} / ?{counts.maybe}
                  </span>
                )
              })()}
            </div>
            <div className="inline-row">
              <Link className="btn" to={`/events/${upcoming.id}`}>
                出欠する
              </Link>
              <Link className="btn ghost" to={`/events/${upcoming.id}`}>
                持ち物を見る
              </Link>
            </div>
          </div>
        )}
      </section>

      <section className="panel">
        <div className="section-head">
          <h2>進行中の企画</h2>
          <Link to="/plans" className="mini-link">
            一覧へ
          </Link>
        </div>
        {inProgressPlans.length === 0 && <p className="muted">進行中の企画はありません。</p>}
        {inProgressPlans.map((plan) => (
          <Link className="card link-card" key={plan.id} to={`/plans/${plan.id}`}>
            <strong>{plan.title}</strong>
            <p>
              {statusLabel[plan.status]} / {formatDuration(plan.durationSec)} / {participantSummaryText(plan, data.members)}
            </p>
            <p className="muted">{roleSummaryText(plan, data.members, 3)}</p>
          </Link>
        ))}
      </section>
    </div>
  )
}
