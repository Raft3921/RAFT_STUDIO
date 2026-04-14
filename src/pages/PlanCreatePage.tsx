import { useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { durationPresets, planTemplates, roleDefinitions } from '../data/templates'
import {
  clampDuration,
  createEmptyRoleAssignments,
  dedupeMembersByDisplayName,
  formatDuration,
  participantSummaryText,
  resolveRoleNames,
} from '../lib/plan'
import { getMemberIcon } from '../lib/memberIcon'
import { useApp } from '../store/AppContext'
import type { Plan, RoleAssignments } from '../types'

const goals: Plan['goal'][] = ['笑い', '驚き', '感動', '学び', '上達']
const defaultGame = 'Minecraft'
const subtitleStyles: Plan['subtitleStyle'][] = ['フル字幕', 'ちょっと字幕', '字幕無し']

const roleGroups = [
  { label: '画面に出る役割', ids: ['mc', 'reaction', 'action'] },
  { label: '制作・進行の役割', ids: ['tech', 'progress'] },
]
interface SpeechRecognitionResultLike {
  transcript?: string
  confidence?: number
}
interface SpeechRecognitionAlternativeLike {
  0?: SpeechRecognitionResultLike
  isFinal?: boolean
  length?: number
}
interface SpeechRecognitionEventLike {
  results?: ArrayLike<SpeechRecognitionAlternativeLike>
  resultIndex?: number
}
interface SpeechRecognitionErrorEventLike {
  error?: string
}
interface SpeechRecognitionLike {
  lang: string
  interimResults: boolean
  maxAlternatives: number
  continuous?: boolean
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike
interface SpeechRecognitionWindow extends Window {
  SpeechRecognition?: SpeechRecognitionCtor
  webkitSpeechRecognition?: SpeechRecognitionCtor
}

export const PlanCreatePage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { createPlan, updatePlan, data } = useApp()
  const editingPlan = id ? data.plans.find((plan) => plan.id === id) : null
  const missingEditTarget = Boolean(id && !editingPlan)
  const visibleMembers = useMemo(() => dedupeMembersByDisplayName(data.members), [data.members])

  const [gameTitle, setGameTitle] = useState(editingPlan?.gameTitle ?? defaultGame)
  const [templateType, setTemplateType] = useState(editingPlan?.templateType ?? planTemplates[0])

  const [durationSec, setDurationSec] = useState(editingPlan?.durationSec ?? 480)
  const [participantIds, setParticipantIds] = useState<string[]>(editingPlan?.participantIds ?? [])
  const [goal, setGoal] = useState<Plan['goal']>(editingPlan?.goal ?? '笑い')
  const [subtitleStyle, setSubtitleStyle] = useState<Plan['subtitleStyle']>(editingPlan?.subtitleStyle ?? 'ちょっと字幕')
  const [isListeningOverview, setIsListeningOverview] = useState(false)
  const [title, setTitle] = useState(editingPlan?.title ?? '')
  const [overview, setOverview] = useState(editingPlan?.overview ?? editingPlan?.memo ?? '')
  const [roleAssignments, setRoleAssignments] = useState<RoleAssignments>(
    editingPlan?.roleAssignments ?? createEmptyRoleAssignments(),
  )
  const overviewRecognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const keepListeningRef = useRef(false)
  const lastTranscriptRef = useRef('')

  const selectedMembersLabel = useMemo(
    () =>
      participantSummaryText(
        {
          id: 'tmp',
          title: '',
          templateType,
          status: 'candidate',
          durationSec,
          participantIds,
          goal,
          subtitleStyle,
          roleAssignments: createEmptyRoleAssignments(),
          createdAt: '',
          createdBy: '',
        },
        visibleMembers,
        8,
      ),
    [durationSec, goal, participantIds, subtitleStyle, templateType, visibleMembers],
  )
  const selectedPlanMembers = useMemo(
    () => visibleMembers.filter((member) => participantIds.includes(member.id)),
    [participantIds, visibleMembers],
  )

  const startOverviewVoiceInput = async () => {
    const speechWindow = window as SpeechRecognitionWindow
    const recognitionCtor = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition
    if (!recognitionCtor) {
      const manualInput = window.prompt('このブラウザは音声入力に対応していません。概要を入力してください。')
      if (manualInput?.trim()) {
        setOverview((prev) => (prev.trim().length > 0 ? `${prev.trim()}\n${manualInput.trim()}` : manualInput.trim()))
      }
      return
    }
    if (!window.isSecureContext) {
      window.alert('音声入力はHTTPS環境でのみ利用できます。')
      return
    }
    if (isListeningOverview) {
      keepListeningRef.current = false
      overviewRecognitionRef.current?.stop()
      overviewRecognitionRef.current = null
      setIsListeningOverview(false)
      return
    }
    if (navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        stream.getTracks().forEach((track) => track.stop())
      } catch {
        window.alert('マイク権限が必要です。ブラウザ設定でマイクを許可してください。')
        return
      }
    }

    const startSession = () => {
      const recognition = new recognitionCtor()
      overviewRecognitionRef.current = recognition
      recognition.lang = 'ja-JP'
      recognition.interimResults = false
      recognition.maxAlternatives = 1
      recognition.continuous = true
      setIsListeningOverview(true)

      recognition.onresult = (event: SpeechRecognitionEventLike) => {
        const results = event.results
        if (!results || results.length === 0) return
        const start = Math.max(0, event.resultIndex ?? 0)
        const chunks: string[] = []
        for (let index = start; index < results.length; index += 1) {
          const result = results[index]
          if (!result?.isFinal) continue
          const transcript = result[0]?.transcript?.trim()
          if (!transcript) continue
          if (transcript === lastTranscriptRef.current) continue
          chunks.push(transcript)
          lastTranscriptRef.current = transcript
        }
        if (chunks.length === 0) return
        setOverview((prev) => {
          const base = prev.trim()
          const appended = chunks.join('\n')
          return base.length > 0 ? `${base}\n${appended}` : appended
        })
      }

      recognition.onerror = (event: SpeechRecognitionErrorEventLike) => {
        if (event.error === 'aborted') return
        const messageByError: Record<string, string> = {
          'not-allowed': 'マイク利用が拒否されました。ブラウザ設定でマイクを許可してください。',
          'service-not-allowed': 'このブラウザでは音声認識サービスが許可されていません。',
          'audio-capture': 'マイクが見つかりません。接続または権限を確認してください。',
          network: 'ネットワークエラーで音声認識に失敗しました。通信状況を確認してください。',
        }
        if (event.error === 'no-speech') return
        keepListeningRef.current = false
        setIsListeningOverview(false)
        window.alert(messageByError[event.error ?? ''] ?? '音声入力に失敗しました。もう一度お試しください。')
      }

      recognition.onend = () => {
        overviewRecognitionRef.current = null
        if (!keepListeningRef.current) {
          setIsListeningOverview(false)
          return
        }
        window.setTimeout(() => {
          if (!keepListeningRef.current) return
          startSession()
        }, 120)
      }

      try {
        recognition.start()
      } catch {
        keepListeningRef.current = false
        setIsListeningOverview(false)
        overviewRecognitionRef.current = null
        window.alert('音声入力を開始できませんでした。ページ再読み込み後に再試行してください。')
      }
    }

    keepListeningRef.current = true
    lastTranscriptRef.current = ''
    startSession()
  }

  const toggleParticipant = (memberId: string) => {
    setParticipantIds((prev) => (prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]))
  }

  const toggleRoleMember = (roleId: string, memberId: string, selection: 'single' | 'multi') => {
    setRoleAssignments((prev) => {
      const current = prev[roleId] ?? []
      if (selection === 'single') {
        return { ...prev, [roleId]: current[0] === memberId ? [] : [memberId] }
      }
      return {
        ...prev,
        [roleId]: current.includes(memberId) ? current.filter((id) => id !== memberId) : [...current, memberId],
      }
    })
  }

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const selectedTitle = title.trim() || `${gameTitle || defaultGame} / ${templateType} / ${selectedMembersLabel}`
    const selectedOverview = overview.trim() || `${gameTitle || defaultGame} / ${templateType} / ${selectedMembersLabel}`

    if (editingPlan) {
      await updatePlan(editingPlan.id, {
        title: selectedTitle,
        gameTitle: gameTitle.trim(),
        templateType,
        durationSec,
        participantIds,
        goal,
        subtitleStyle,
        overview: selectedOverview,
        roleAssignments,
        memo: '',
      })
      navigate(`/plans/${editingPlan.id}`)
      return
    }

    await createPlan({
      title: selectedTitle,
      gameTitle: gameTitle.trim(),
      templateType,
      durationSec,
      participantIds,
      goal,
      subtitleStyle,
      overview: selectedOverview,
      roleAssignments,
      memo: '',
    })
    navigate('/plans')
  }

  return (
    <form className="page-stack" onSubmit={onSubmit}>
      {missingEditTarget && <section className="panel">企画が見つかりません。</section>}
      {!missingEditTarget && (
        <>
          <section className="panel">
            <h2>{editingPlan ? '企画カード編集' : '企画カード作成'}</h2>
            <p className="muted">基本情報を入力して企画を作成します。</p>
            <label>ゲーム</label>
            <input
              className="field"
              value={gameTitle}
              onChange={(event) => setGameTitle(event.target.value)}
              placeholder="例: Minecraft / VALORANT / APEX"
            />

            <label>テンプレート</label>
            <div className="chip-row" data-tour="plan-template">
              {planTemplates.map((template) => (
                <button
                  type="button"
                  key={template}
                  className={`chip ${templateType === template ? 'active' : ''}`}
                  onClick={() => setTemplateType(template)}
                >
                  {template}
                </button>
              ))}
            </div>

            <label>タイトル</label>
            <input className="field" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="任意" />

            <label>尺（時間）</label>
            <p className="duration-text">{formatDuration(durationSec)}</p>
            <input
              className="duration-slider"
              type="range"
              min={0}
              max={1800}
              step={10}
              value={durationSec}
              onChange={(event) => setDurationSec(clampDuration(Number(event.target.value)))}
            />
            <div className="inline-row">
              <button type="button" className="chip" onClick={() => setDurationSec((prev) => clampDuration(prev - 10))}>
                -10秒
              </button>
              <button type="button" className="chip" onClick={() => setDurationSec((prev) => clampDuration(prev + 10))}>
                +10秒
              </button>
            </div>
            <div className="chip-row">
              {durationPresets.map((seconds) => (
                <button
                  key={seconds}
                  type="button"
                  className={`chip ${durationSec === seconds ? 'active' : ''}`}
                  onClick={() => setDurationSec(seconds)}
                >
                  {formatDuration(seconds)}
                </button>
              ))}
            </div>

            <label>企画メンバー</label>
            <p className="muted">最低1人は選択してください</p>
            <div className="chip-row" data-tour="plan-members">
              {visibleMembers.map((member) => (
                <button
                  type="button"
                  key={member.id}
                  className={`chip ${participantIds.includes(member.id) ? 'active' : ''}`}
                  onClick={() => toggleParticipant(member.id)}
                >
                  <span className="member-chip-label">
                    <img src={getMemberIcon(member.displayName)} alt="" className="member-chip-icon" />
                    <span>{member.displayName}</span>
                  </span>
                </button>
              ))}
            </div>

            <label>目的</label>
            <div className="chip-row">
              {goals.map((item) => (
                <button
                  type="button"
                  key={item}
                  className={`chip ${goal === item ? 'active' : ''}`}
                  onClick={() => setGoal(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </section>

          <section className="panel">
            <div className="section-head">
              <h3>3. 役割割り当て</h3>
              <span className="muted">兼務OK</span>
            </div>
            {roleGroups.map((group) => (
              <div key={group.label} className="role-group">
                <p className="role-group-title">{group.label}</p>
                {group.ids.map((roleId) => {
                  const role = roleDefinitions.find((item) => item.id === roleId)
                  if (!role) return null
                  return (
                    <div key={role.id} className="role-row">
                      <div className="section-head">
                        <strong>
                          {role.label} {role.required ? '（必須）' : ''}
                        </strong>
                        <span className="muted">{role.selection === 'single' ? '1人' : '複数'}</span>
                      </div>
                      <div className="chip-row">
                        {selectedPlanMembers.map((member) => (
                          <button
                            type="button"
                            key={`${role.id}-${member.id}`}
                            className={`chip ${roleAssignments[role.id]?.includes(member.id) ? 'active' : ''}`}
                            onClick={() => toggleRoleMember(role.id, member.id, role.selection)}
                          >
                            <span className="member-chip-label">
                              <img src={getMemberIcon(member.displayName)} alt="" className="member-chip-icon" />
                              <span>{member.displayName}</span>
                            </span>
                          </button>
                        ))}
                      </div>
                      {selectedPlanMembers.length === 0 && (
                        <p className="muted">先に企画メンバーを選ぶと、ここにその人だけ表示されます。</p>
                      )}
                      <p className="muted">現在: {resolveRoleNames(roleAssignments[role.id] ?? [], visibleMembers)}</p>
                    </div>
                  )
                })}
              </div>
            ))}
          </section>

          <section className="panel">
            <h3>4. 補足</h3>
            <div className="chip-row">
              {subtitleStyles.map((item) => (
                <button
                  type="button"
                  key={item}
                  className={`chip ${subtitleStyle === item ? 'active' : ''}`}
                  onClick={() => setSubtitleStyle(item)}
                >
                  {item}
                </button>
              ))}
            </div>
            <label>カード概要（一覧に表示）</label>
            <div className="overview-input-head">
              <span className="muted">本格的な概要を書けます。音声入力も可能。</span>
              <button
                type="button"
                className={`chip voice-input-chip ${isListeningOverview ? 'active' : ''}`}
                onClick={startOverviewVoiceInput}
                aria-label="概要を音声入力"
                title="概要を音声入力"
              >
                🎤
              </button>
            </div>
            <textarea
              className="field"
              rows={6}
              value={overview}
              onChange={(event) => setOverview(event.target.value)}
              placeholder="企画の狙い、流れ、注意点、勝敗条件などを詳しく記入"
            />
          </section>

          <button data-tour="plan-submit" className="btn full" type="submit">
            {editingPlan ? '企画を更新' : '企画カードを作成'}
          </button>
        </>
      )}
    </form>
  )
}
