import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { durationPresets, roleDefinitions } from '../data/templates'
import { buildGenreTitleCandidates, getGenrePromptFlow, getGenreTrees } from '../lib/titleGenerator'
import { clampDuration, createEmptyRoleAssignments, formatDuration, participantSummaryText, resolveRoleNames } from '../lib/plan'
import { getMemberIcon } from '../lib/memberIcon'
import { useApp } from '../store/AppContext'
import type { Plan, RoleAssignments } from '../types'

const goals: Plan['goal'][] = ['笑い', '驚き', '感動', '学び', '上達']
const defaultGame = 'Minecraft'
const genericAssets = ['BGM', 'SE', 'サムネ素材', '立ち絵', '特殊効果']
const gameAssets: Record<string, string[]> = {
  minecraft: ['BGM', 'SE', 'サムネ素材', '立ち絵', '字幕', '建築素材メモ'],
  mc: ['BGM', 'SE', 'サムネ素材', '立ち絵', '字幕', '建築素材メモ'],
}

const roleGroups = [
  { label: '画面に出る役割', ids: ['mc', 'reaction', 'action'] },
  { label: '制作・進行の役割', ids: ['tech', 'progress', 'recording', 'edit', 'thumbnail'] },
]

const genres = getGenreTrees()
const findGenreKeyByLabel = (label?: string) => genres.find((genre) => genre.label === label)?.key ?? ''

export const PlanCreatePage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { createPlan, updatePlan, data } = useApp()
  const editingPlan = id ? data.plans.find((plan) => plan.id === id) : null
  const missingEditTarget = Boolean(id && !editingPlan)

  const [gameTitle, setGameTitle] = useState(editingPlan?.gameTitle ?? defaultGame)
  const [genreKey, setGenreKey] = useState(() => findGenreKeyByLabel(editingPlan?.templateType))
  const [questionIndex, setQuestionIndex] = useState(0)
  const [questionAnswers, setQuestionAnswers] = useState<Record<string, string>>({})
  const [draftAnswer, setDraftAnswer] = useState('')
  const [titleCandidates, setTitleCandidates] = useState<string[]>([])
  const [keywordPreview, setKeywordPreview] = useState<string[]>([])

  const normalizedGame = gameTitle.trim().toLowerCase()
  const assetOptions = gameAssets[normalizedGame] ?? genericAssets
  const [durationSec, setDurationSec] = useState(editingPlan?.durationSec ?? 480)
  const [participantIds, setParticipantIds] = useState<string[]>(editingPlan?.participantIds ?? [])
  const [goal, setGoal] = useState<Plan['goal']>(editingPlan?.goal ?? '笑い')
  const [assets, setAssets] = useState<string[]>(editingPlan?.assets ?? ['BGM'])
  const [memo, setMemo] = useState(editingPlan?.memo ?? '')
  const [title, setTitle] = useState(editingPlan?.title ?? '')
  const [overview, setOverview] = useState(editingPlan?.overview ?? '')
  const [roleAssignments, setRoleAssignments] = useState<RoleAssignments>(
    editingPlan?.roleAssignments ?? createEmptyRoleAssignments(),
  )

  const activeGenre = useMemo(() => getGenrePromptFlow(genreKey), [genreKey])
  const questionCount = activeGenre?.questions.length ?? 0
  const questionComplete = Boolean(activeGenre) && questionIndex >= questionCount
  const currentQuestion = questionComplete ? null : activeGenre?.questions[questionIndex] ?? null

  const selectedMembersLabel = useMemo(
    () =>
      participantSummaryText(
        {
          id: 'tmp',
          title: '',
          templateType: activeGenre?.label ?? '未選択',
          status: 'candidate',
          durationSec,
          participantIds,
          goal,
          assets: [],
          roleAssignments: createEmptyRoleAssignments(),
          createdAt: '',
          createdBy: '',
        },
        data.members,
        8,
      ),
    [activeGenre?.label, data.members, durationSec, goal, participantIds],
  )

  const resetGenreFlow = (nextGenreKey: string) => {
    setGenreKey(nextGenreKey)
    setQuestionIndex(0)
    setQuestionAnswers({})
    setDraftAnswer('')
    setTitleCandidates([])
    setKeywordPreview([])
    setTitle('')
    setOverview('')
  }

  const onNextQuestion = () => {
    if (!currentQuestion) return
    const nextAnswer = draftAnswer.trim()
    if (!nextAnswer) {
      window.alert('回答を入力してください。')
      return
    }
    const mergedAnswers = { ...questionAnswers, [currentQuestion.id]: nextAnswer }
    setQuestionAnswers(mergedAnswers)
    const nextIndex = questionIndex + 1
    if (!activeGenre) return
    if (nextIndex >= activeGenre.questions.length) {
      setQuestionIndex(activeGenre.questions.length)
      setDraftAnswer('')
      return
    }
    const nextQuestion = activeGenre.questions[nextIndex]
    setQuestionIndex(nextIndex)
    setDraftAnswer(mergedAnswers[nextQuestion.id] ?? '')
  }

  const onBackQuestion = () => {
    if (!activeGenre) return
    if (questionIndex === 0) return
    const prevIndex = Math.max(0, questionIndex - 1)
    const prevQuestion = activeGenre.questions[prevIndex]
    setQuestionIndex(prevIndex)
    setDraftAnswer(questionAnswers[prevQuestion.id] ?? '')
  }

  const runTitleCandidates = () => {
    if (!activeGenre) {
      window.alert('最初にジャンルを選択してください。')
      setKeywordPreview([])
      return
    }
    const mergedAnswers = { ...questionAnswers }
    if (currentQuestion && draftAnswer.trim()) {
      mergedAnswers[currentQuestion.id] = draftAnswer.trim()
    }
    const hasAnyAnswer = Object.values(mergedAnswers).some((value) => value.trim().length > 0)
    if (!questionComplete) {
      window.alert('質問に最後まで回答してから実行してください。')
      setTitleCandidates([])
      setKeywordPreview([])
      return
    }
    if (!hasAnyAnswer) {
      setTitleCandidates([activeGenre.fallbackTitle])
      setKeywordPreview([])
      return
    }
    const result = buildGenreTitleCandidates(activeGenre.key, mergedAnswers, gameTitle.trim() || defaultGame)
    setTitleCandidates(result.titles)
    setKeywordPreview(result.keywords)
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
    if (!activeGenre) {
      window.alert('最初にジャンルを選択してください。')
      return
    }
    if (!questionComplete) {
      window.alert('質問に最後まで回答してください。')
      return
    }

    const selectedTitle = title.trim() || titleCandidates[0] || activeGenre.fallbackTitle
    const selectedOverview =
      overview.trim() || titleCandidates[0] || `${gameTitle || defaultGame} / ${activeGenre.label} / ${selectedMembersLabel}`

    if (editingPlan) {
      await updatePlan(editingPlan.id, {
        title: selectedTitle,
        gameTitle: gameTitle.trim(),
        templateType: activeGenre.label,
        durationSec,
        participantIds,
        goal,
        assets,
        overview: selectedOverview,
        roleAssignments,
        memo,
      })
      navigate(`/plans/${editingPlan.id}`)
      return
    }

    await createPlan({
      title: selectedTitle,
      gameTitle: gameTitle.trim(),
      templateType: activeGenre.label,
      durationSec,
      participantIds,
      goal,
      assets,
      overview: selectedOverview,
      roleAssignments,
      memo,
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
            <p className="muted">ジャンル選択→自由入力質問→タイトル候補の順で作成します。</p>
          </section>

          <section className="panel">
            <h3>1. ジャンル選択（必須）</h3>
            <div className="chip-row" data-tour="plan-template">
              {genres.map((genre) => (
                <button
                  type="button"
                  key={genre.key}
                  className={`chip ${genreKey === genre.key ? 'active' : ''}`}
                  onClick={() => resetGenreFlow(genre.key)}
                >
                  {genre.label}
                </button>
              ))}
            </div>

            {activeGenre && (
              <div className="card">
                <p className="muted">ジャンル: {activeGenre.label}</p>
                <p className="muted">Q {Math.min(questionIndex + 1, questionCount)} / {questionCount}</p>
                {currentQuestion && (
                  <div className="stack-gap">
                    <label>{currentQuestion.text}</label>
                    <p className="muted">{currentQuestion.hint}</p>
                    <textarea
                      className="field"
                      rows={3}
                      value={draftAnswer}
                      onChange={(event) => setDraftAnswer(event.target.value)}
                      placeholder={currentQuestion.placeholder}
                    />
                    <div className="inline-row">
                      <button type="button" className="chip" onClick={onBackQuestion} disabled={questionIndex === 0}>
                        戻る
                      </button>
                      <button type="button" className="chip active" onClick={onNextQuestion}>
                        次へ
                      </button>
                    </div>
                  </div>
                )}
                {questionComplete && (
                  <div className="stack-gap">
                    <p className="muted">質問完了。タイトル候補を行うボタンで3案を生成します。</p>
                    <div className="inline-row">
                      <button type="button" className="chip" onClick={onBackQuestion}>
                        戻る
                      </button>
                      <button type="button" className="chip active" onClick={runTitleCandidates}>
                        タイトル候補を行う
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          <section className="panel">
            <h3>2. 基本設定</h3>
            <label>ゲーム</label>
            <input
              className="field"
              value={gameTitle}
              onChange={(event) => setGameTitle(event.target.value)}
              placeholder="例: Minecraft / VALORANT / APEX"
            />

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
              {data.members.map((member) => (
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
                        {data.members.map((member) => (
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
                      <p className="muted">現在: {resolveRoleNames(roleAssignments[role.id] ?? [], data.members)}</p>
                    </div>
                  )
                })}
              </div>
            ))}
          </section>

          <section className="panel">
            <h3>4. タイトル候補</h3>

            <label>必要素材</label>
            <div className="chip-row">
              {assetOptions.map((item) => {
                const selected = assets.includes(item)
                return (
                  <button
                    type="button"
                    key={item}
                    className={`chip ${selected ? 'active' : ''}`}
                    onClick={() =>
                      setAssets((prev) => (prev.includes(item) ? prev.filter((asset) => asset !== item) : [...prev, item]))
                    }
                  >
                    {item}
                  </button>
                )
              })}
            </div>

            <label>タイトル候補（3案）</label>
            <div className="inline-row">
              <button type="button" className="chip" onClick={runTitleCandidates}>
                タイトル候補を行う
              </button>
            </div>
            <div className="stack-gap">
              {titleCandidates.length === 0 && <p className="muted">質問に回答してからボタンで候補を生成してください。</p>}
              {titleCandidates.map((candidate) => (
                <div key={candidate} className="card">
                  <p>{candidate}</p>
                  <div className="inline-row">
                    <button
                      type="button"
                      className="chip"
                      onClick={() => {
                        setTitle(candidate)
                        setOverview(candidate)
                      }}
                    >
                      この案を使う
                    </button>
                    <button
                      type="button"
                      className="chip"
                      onClick={async () => {
                        await navigator.clipboard.writeText(candidate)
                      }}
                    >
                      コピー
                    </button>
                  </div>
                </div>
              ))}
              {keywordPreview.length > 0 && <p className="muted">抽出キーワード: {keywordPreview.join(' / ')}</p>}
            </div>

            <label>カード概要（一覧に表示）</label>
            <input className="field" value={overview} onChange={(event) => setOverview(event.target.value)} />
            <label>タイトル（任意で修正）</label>
            <input className="field" value={title} onChange={(event) => setTitle(event.target.value)} />
            <label>ひとことで（任意）</label>
            <textarea className="field" rows={3} value={memo} onChange={(event) => setMemo(event.target.value)} />
          </section>

          <button data-tour="plan-submit" className="btn full" type="submit">
            {editingPlan ? '企画を更新' : '企画カードを作成'}
          </button>
        </>
      )}
    </form>
  )
}
