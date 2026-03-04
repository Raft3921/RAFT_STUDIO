import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { durationPresets, roleDefinitions } from '../data/templates'
import {
  clampDuration,
  createEmptyRoleAssignments,
  formatDuration,
  participantSummaryText,
  resolveRoleNames,
} from '../lib/plan'
import { getMemberIcon } from '../lib/memberIcon'
import { useApp } from '../store/AppContext'
import type { Plan, RoleAssignments } from '../types'

const goals: Plan['goal'][] = ['笑い', '驚き', '感動', '学び', '上達']
const defaultGame = 'Minecraft'
const genericTemplates = ['検証', '攻略', '建築', '対戦', '協力', '雑談', 'Shorts切り抜き']
const genericAssets = ['BGM', 'SE', 'サムネ素材', '立ち絵', '特殊効果']
const gameTemplates: Record<string, string[]> = {
  minecraft: ['世界探索', '農業', '建築', '検証', 'PvP', 'マルチ企画', 'Shorts切り抜き'],
  mc: ['世界探索', '農業', '建築', '検証', 'PvP', 'マルチ企画', 'Shorts切り抜き'],
}
const gameAssets: Record<string, string[]> = {
  minecraft: ['BGM', 'SE', 'サムネ素材', '立ち絵', '字幕', '建築素材メモ'],
  mc: ['BGM', 'SE', 'サムネ素材', '立ち絵', '字幕', '建築素材メモ'],
}

const roleGroups = [
  {
    label: '画面に出る役割',
    ids: ['mc', 'reaction', 'action'],
  },
  {
    label: '制作・進行の役割',
    ids: ['tech', 'progress', 'recording', 'edit', 'thumbnail'],
  },
]

export const PlanCreatePage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { createPlan, updatePlan, data } = useApp()
  const editingPlan = id ? data.plans.find((plan) => plan.id === id) : null
  const missingEditTarget = Boolean(id && !editingPlan)

  const [gameTitle, setGameTitle] = useState(editingPlan?.gameTitle ?? defaultGame)
  const normalizedGame = gameTitle.trim().toLowerCase()
  const templateOptions = gameTemplates[normalizedGame] ?? genericTemplates
  const assetOptions = gameAssets[normalizedGame] ?? genericAssets
  const [templateType, setTemplateType] = useState(editingPlan?.templateType ?? templateOptions[0])
  const selectedTemplateType = templateOptions.includes(templateType) ? templateType : templateOptions[0]
  const [durationSec, setDurationSec] = useState(editingPlan?.durationSec ?? 480)
  const [participantIds, setParticipantIds] = useState<string[]>(
    editingPlan?.participantIds ?? [],
  )
  const [goal, setGoal] = useState<Plan['goal']>(editingPlan?.goal ?? '笑い')
  const [assets, setAssets] = useState<string[]>(editingPlan?.assets ?? ['BGM'])
  const [memo, setMemo] = useState(editingPlan?.memo ?? '')
  const [title, setTitle] = useState(editingPlan?.title ?? '')
  const [overview, setOverview] = useState(editingPlan?.overview ?? '')
  const [roleAssignments, setRoleAssignments] = useState<RoleAssignments>(
    editingPlan?.roleAssignments ?? createEmptyRoleAssignments(),
  )

  const selectedMembersLabel = useMemo(
    () =>
      participantSummaryText(
        {
          id: 'tmp',
          title: '',
          templateType: selectedTemplateType,
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
    [data.members, durationSec, goal, participantIds, selectedTemplateType],
  )

  const titleCandidates = useMemo(
    () => [
      `${gameTitle} / ${selectedTemplateType}で${goal}を狙う${formatDuration(durationSec)}企画`,
      `${gameTitle}で${selectedMembersLabel}が挑む${selectedTemplateType}`,
      `${gameTitle}の${selectedTemplateType}で${goal}を作る`,
    ],
    [gameTitle, selectedTemplateType, goal, durationSec, selectedMembersLabel],
  )

  const toggleParticipant = (memberId: string) => {
    setParticipantIds((prev) => {
      const exists = prev.includes(memberId)
      if (exists) {
        return prev.filter((id) => id !== memberId)
      }
      return [...prev, memberId]
    })
  }

  const toggleRoleMember = (roleId: string, memberId: string, selection: 'single' | 'multi') => {
    setRoleAssignments((prev) => {
      const current = prev[roleId] ?? []
      if (selection === 'single') {
        return { ...prev, [roleId]: current[0] === memberId ? [] : [memberId] }
      }

      return {
        ...prev,
        [roleId]: current.includes(memberId)
          ? current.filter((id) => id !== memberId)
          : [...current, memberId],
      }
    })
  }

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (editingPlan) {
      await updatePlan(editingPlan.id, {
        title: title.trim() || editingPlan.title,
        gameTitle: gameTitle.trim(),
        templateType: selectedTemplateType,
        durationSec,
        participantIds,
        goal,
        assets,
        overview: overview.trim(),
        roleAssignments,
        memo,
      })
      navigate(`/plans/${editingPlan.id}`)
      return
    }
    await createPlan({
      title: title.trim() || titleCandidates[0],
      gameTitle: gameTitle.trim(),
      templateType: selectedTemplateType,
      durationSec,
      participantIds,
      goal,
      assets,
      overview: overview.trim() || titleCandidates[0],
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
        <p className="muted">1. 基本設定 2. 役割決め 3. タイトル確認 の順で作ると迷いません。</p>
      </section>

      <section className="panel">
        <h3>1. 基本設定</h3>
        <label>ゲーム</label>
        <input
          className="field"
          value={gameTitle}
          onChange={(event) => setGameTitle(event.target.value)}
          placeholder="例: Minecraft / VALORANT / APEX"
        />

        <label>テンプレ</label>
        <div className="chip-row" data-tour="plan-template">
          {templateOptions.map((item) => (
            <button
              type="button"
              key={item}
              className={`chip ${selectedTemplateType === item ? 'active' : ''}`}
              onClick={() => setTemplateType(item)}
            >
              {item}
            </button>
          ))}
        </div>

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
        <div className="plan-tools-row">
          <button type="button" className="chip" onClick={() => setParticipantIds(data.members.map((member) => member.id))}>
            全員選択
          </button>
          <button type="button" className="chip" onClick={() => setParticipantIds(['m-raft'])}>
            ラフトのみ
          </button>
        </div>
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
          <h3>2. 役割割り当て</h3>
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
        <h3>3. 仕上げ</h3>

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
                  setAssets((prev) =>
                    prev.includes(item) ? prev.filter((asset) => asset !== item) : [...prev, item],
                  )
                }
              >
                {item}
              </button>
            )
          })}
        </div>

        <label>タイトル候補</label>
        <div className="stack-gap">
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
        <label>カード概要（タイトル候補）</label>
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
