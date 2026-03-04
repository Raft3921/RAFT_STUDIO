import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { durationPresets, roleDefinitions } from '../data/templates'
import { buildTitleCandidates, getGenreTree, getGenreTrees, getNextQuestionId } from '../lib/titleGenerator'
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
  const activeGenre = getGenreTree(genreKey)
  const [currentQuestionId, setCurrentQuestionId] = useState(activeGenre?.questions[0]?.id ?? '')
  const [questionHistory, setQuestionHistory] = useState<string[]>([])
  const [questionAnswers, setQuestionAnswers] = useState<Record<string, string>>({})
  const [questionAnswerKeys, setQuestionAnswerKeys] = useState<Record<string, string>>({})
  const [freeTopic, setFreeTopic] = useState('')
  const [titleGenVersion, setTitleGenVersion] = useState(0)

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

  const currentQuestion = useMemo(
    () => activeGenre?.questions.find((question) => question.id === currentQuestionId) ?? null,
    [activeGenre, currentQuestionId],
  )
  const questionComplete = Boolean(activeGenre) && !currentQuestion
  const titleCandidates = useMemo(() => {
    void titleGenVersion
    if (!activeGenre || !questionComplete) return []
    return buildTitleCandidates(activeGenre.label, gameTitle.trim() || defaultGame, {
      ...questionAnswers,
      topicCustom: freeTopic.trim(),
    })
  }, [activeGenre, freeTopic, gameTitle, questionAnswers, questionComplete, titleGenVersion])

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
    const tree = getGenreTree(nextGenreKey)
    setGenreKey(nextGenreKey)
    setQuestionAnswers({})
    setQuestionAnswerKeys({})
    setQuestionHistory([])
    setFreeTopic('')
    setCurrentQuestionId(tree?.questions[0]?.id ?? '')
    setTitle('')
    setOverview('')
  }

  const onSelectAnswer = (optionKey: string, optionLabel: string) => {
    if (!activeGenre || !currentQuestion) return
    setQuestionAnswers((prev) => ({ ...prev, [currentQuestion.id]: optionLabel }))
    setQuestionAnswerKeys((prev) => ({ ...prev, [currentQuestion.id]: optionKey }))
    if (currentQuestion.id === 'topic' && optionKey !== 'free') {
      setFreeTopic('')
    }
    setQuestionHistory((prev) => [...prev, currentQuestion.id])
    const mappedNext = getNextQuestionId(currentQuestion, optionKey)
    const currentIndex = activeGenre.questions.findIndex((item) => item.id === currentQuestion.id)
    const nextByOrder = currentIndex >= 0 ? activeGenre.questions[currentIndex + 1]?.id ?? '' : ''
    const hasMappedNext = mappedNext !== 'end' && activeGenre.questions.some((item) => item.id === mappedNext)
    const resolvedNext = hasMappedNext ? mappedNext : nextByOrder
    setCurrentQuestionId(resolvedNext)
  }

  const onBackQuestion = () => {
    if (!activeGenre || questionHistory.length === 0) return
    const prevQuestionId = questionHistory[questionHistory.length - 1]
    if (prevQuestionId === 'topic') {
      setFreeTopic('')
    }
    setQuestionHistory((prev) => prev.slice(0, -1))
    setCurrentQuestionId(prevQuestionId)
    setQuestionAnswers((prev) => {
      const next = { ...prev }
      delete next[prevQuestionId]
      return next
    })
    setQuestionAnswerKeys((prev) => {
      const next = { ...prev }
      delete next[prevQuestionId]
      return next
    })
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
      window.alert('タイトル質問に最後まで回答してください。')
      return
    }
    if (questionAnswerKeys.topic === 'free' && freeTopic.trim().length === 0) {
      window.alert('自由テーマの内容を入力してください。')
      return
    }

    const selectedTitle = title.trim() || titleCandidates[0] || `${activeGenre.label}企画`
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
            <p className="muted">ジャンル選択→質問回答→タイトル候補の順で作成します。</p>
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
                {currentQuestion && (
                  <>
                    <label>{currentQuestion.text}</label>
                    <div className="chip-row">
                      {currentQuestion.options.map((option) => (
                        <button
                          type="button"
                          key={`${currentQuestion.id}-${option.key}`}
                          className="chip"
                          onClick={() => onSelectAnswer(option.key, option.label)}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
                {!currentQuestion && (
                  <div className="stack-gap">
                    <p className="muted">質問完了。タイトル候補を生成しました。</p>
                    <div className="inline-row">
                      <button type="button" className="chip" onClick={onBackQuestion}>
                        1問戻る
                      </button>
                      <button type="button" className="chip" onClick={() => setTitleGenVersion((prev) => prev + 1)}>
                        候補を再生成
                      </button>
                    </div>
                  </div>
                )}
                {currentQuestion && questionHistory.length > 0 && (
                  <button type="button" className="chip" onClick={onBackQuestion}>
                    1問戻る
                  </button>
                )}
                {questionAnswerKeys.topic === 'free' && (
                  <div className="stack-gap">
                    <label>自由テーマの内容</label>
                    <input
                      className="field"
                      value={freeTopic}
                      onChange={(event) => setFreeTopic(event.target.value)}
                      placeholder="例: 最強防具だけでボス討伐 / 深夜の廃村探索"
                    />
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

            <label>タイトル候補（質問完了後に10件）</label>
            <div className="stack-gap">
              {titleCandidates.length === 0 && <p className="muted">ジャンル質問に回答すると候補が表示されます。</p>}
              {titleCandidates.map((candidate) => (
                <button
                  type="button"
                  className="btn ghost full"
                  key={candidate}
                  onClick={() => {
                    setTitle(candidate)
                    setOverview(candidate)
                  }}
                >
                  {candidate}
                </button>
              ))}
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
