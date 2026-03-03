import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { assetChoices, durationPresets, planTemplates, roleDefinitions, roleTemplatePresets } from '../data/templates'
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

const findMemberIdsByNames = (names: string[], members: { id: string; displayName: string }[]) => {
  return names.map((name) => members.find((member) => member.displayName === name)?.id).filter((value): value is string => !!value)
}

export const PlanCreatePage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { createPlan, updatePlan, data } = useApp()
  const editingPlan = id ? data.plans.find((plan) => plan.id === id) : null
  const missingEditTarget = Boolean(id && !editingPlan)

  const [templateType, setTemplateType] = useState(editingPlan?.templateType ?? planTemplates[0])
  const [durationSec, setDurationSec] = useState(editingPlan?.durationSec ?? 480)
  const [participantIds, setParticipantIds] = useState<string[]>(
    editingPlan?.participantIds ?? data.members.map((member) => member.id),
  )
  const [goal, setGoal] = useState<Plan['goal']>(editingPlan?.goal ?? '笑い')
  const [assets, setAssets] = useState<string[]>(editingPlan?.assets ?? ['BGM'])
  const [memo, setMemo] = useState(editingPlan?.memo ?? '')
  const [title, setTitle] = useState(editingPlan?.title ?? '')
  const [roleAssignments, setRoleAssignments] = useState<RoleAssignments>(
    editingPlan?.roleAssignments ?? createEmptyRoleAssignments(),
  )

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
          assets: [],
          roleAssignments: createEmptyRoleAssignments(),
          createdAt: '',
          createdBy: '',
        },
        data.members,
        8,
      ),
    [data.members, durationSec, goal, participantIds, templateType],
  )

  const titleCandidates = useMemo(
    () => [
      `${templateType}で${goal}を狙う${formatDuration(durationSec)}企画`,
      `${selectedMembersLabel}で挑む${templateType}チャレンジ`,
      `${templateType}の結果で${goal}を作る`,
    ],
    [templateType, goal, durationSec, selectedMembersLabel],
  )

  const toggleParticipant = (memberId: string) => {
    setParticipantIds((prev) => {
      const exists = prev.includes(memberId)
      if (exists) {
        const next = prev.filter((id) => id !== memberId)
        return next.length > 0 ? next : prev
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

  const applyPreset = (presetKey: keyof typeof roleTemplatePresets) => {
    const preset = roleTemplatePresets[presetKey]
    const next = createEmptyRoleAssignments()

    Object.entries(preset.membersByRole).forEach(([roleId, names]) => {
      next[roleId] = findMemberIdsByNames([...names], data.members)
    })

    setRoleAssignments(next)
  }

  const copyLatestRoles = () => {
    const latest = data.plans[0]
    if (!latest) return
    setRoleAssignments({ ...createEmptyRoleAssignments(), ...latest.roleAssignments })
  }

  const autoFillRoles = () => {
    if (data.members.length === 0) return

    setRoleAssignments((prev) => {
      let cursor = 0
      const next = { ...prev }

      roleDefinitions.forEach((definition) => {
        const current = next[definition.id] ?? []
        if (current.length > 0) return

        if (definition.selection === 'single') {
          next[definition.id] = [data.members[cursor % data.members.length].id]
          cursor += 1
          return
        }

        next[definition.id] = [data.members[cursor % data.members.length].id]
        cursor += 1
      })

      return next
    })
  }

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (editingPlan) {
      await updatePlan(editingPlan.id, {
        title: title.trim() || editingPlan.title,
        templateType,
        durationSec,
        participantIds,
        goal,
        assets,
        roleAssignments,
        memo,
      })
      navigate(`/plans/${editingPlan.id}`)
      return
    }
    await createPlan({
      title: title.trim() || titleCandidates[0],
      templateType,
      durationSec,
      participantIds,
      goal,
      assets,
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

        <label>テンプレ</label>
        <div className="chip-row">
          {planTemplates.map((item) => (
            <button
              type="button"
              key={item}
              className={`chip ${templateType === item ? 'active' : ''}`}
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
        <div className="chip-row">
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

        <div className="plan-tools-row">
          <button type="button" className="chip" onClick={() => applyPreset('minecraftVerification')}>
            マイクラ検証テンプレ
          </button>
          <button type="button" className="chip" onClick={() => applyPreset('minecraftLargeGroup')}>
            マイクラ多人数テンプレ
          </button>
          <button type="button" className="chip" onClick={() => applyPreset('shortsClip')}>
            Shortsテンプレ
          </button>
          <button type="button" className="chip" onClick={copyLatestRoles}>
            前回コピー
          </button>
          <button type="button" className="chip" onClick={autoFillRoles}>
            自動配置
          </button>
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
          {assetChoices.map((item) => {
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
            <button type="button" className="btn ghost full" key={candidate} onClick={() => setTitle(candidate)}>
              {candidate}
            </button>
          ))}
        </div>
        <label>タイトル（任意で修正）</label>
        <input className="field" value={title} onChange={(event) => setTitle(event.target.value)} />
        <label>ひとことで（任意）</label>
        <textarea className="field" rows={3} value={memo} onChange={(event) => setMemo(event.target.value)} />
      </section>

      <button className="btn full" type="submit">
        {editingPlan ? '企画を更新' : '企画カードを作成'}
      </button>
        </>
      )}
    </form>
  )
}
