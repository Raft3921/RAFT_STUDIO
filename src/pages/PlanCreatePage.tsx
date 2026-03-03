import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ALL_MEMBERS_TOKEN,
  assetChoices,
  durationPresets,
  planTemplates,
  roleDefinitions,
  roleTemplatePresets,
} from '../data/templates'
import { clampDuration, createEmptyRoleAssignments, formatDuration, resolveRoleNames } from '../lib/plan'
import { useApp } from '../store/AppContext'
import type { Plan, RoleAssignments } from '../types'

const memberSizes: Plan['memberSize'][] = ['ソロ', '2人', '3〜5人', '多人数']
const goals: Plan['goal'][] = ['笑い', '驚き', '感動', '学び', '上達']

const findMemberIdsByNames = (names: string[], members: { id: string; displayName: string }[]) => {
  return names
    .map((name) => {
      if (name === ALL_MEMBERS_TOKEN) return ALL_MEMBERS_TOKEN
      return members.find((member) => member.displayName === name)?.id
    })
    .filter((value): value is string => !!value)
}

export const PlanCreatePage = () => {
  const navigate = useNavigate()
  const { createPlan, data } = useApp()

  const [templateType, setTemplateType] = useState(planTemplates[0])
  const [durationSec, setDurationSec] = useState(480)
  const [memberSize, setMemberSize] = useState<Plan['memberSize']>('2人')
  const [goal, setGoal] = useState<Plan['goal']>('笑い')
  const [assets, setAssets] = useState<string[]>(['BGM'])
  const [memo, setMemo] = useState('')
  const [title, setTitle] = useState('')
  const [roleAssignments, setRoleAssignments] = useState<RoleAssignments>(createEmptyRoleAssignments())

  const titleCandidates = useMemo(
    () => [
      `${templateType}で${goal}を狙う${formatDuration(durationSec)}企画`,
      `${memberSize}で挑む${templateType}チャレンジ`,
      `${templateType}の結果で${goal}を作る`,
    ],
    [templateType, goal, durationSec, memberSize],
  )

  const toggleRoleMember = (roleId: string, memberId: string, selection: 'single' | 'multi') => {
    setRoleAssignments((prev) => {
      const current = prev[roleId] ?? []

      if (selection === 'single') {
        return { ...prev, [roleId]: current[0] === memberId ? [] : [memberId] }
      }

      if (memberId === ALL_MEMBERS_TOKEN) {
        return { ...prev, [roleId]: current.includes(ALL_MEMBERS_TOKEN) ? [] : [ALL_MEMBERS_TOKEN] }
      }

      const withoutAll = current.filter((id) => id !== ALL_MEMBERS_TOKEN)
      return {
        ...prev,
        [roleId]: withoutAll.includes(memberId)
          ? withoutAll.filter((id) => id !== memberId)
          : [...withoutAll, memberId],
      }
    })
  }

  const applyPreset = (presetKey: keyof typeof roleTemplatePresets) => {
    const preset = roleTemplatePresets[presetKey]
    const next = createEmptyRoleAssignments()

    Object.entries(preset.membersByRole).forEach(([roleId, names]) => {
      const matched = findMemberIdsByNames([...names], data.members)
      next[roleId] = matched
    })

    roleDefinitions.forEach((definition) => {
      if (definition.selection === 'single' && next[definition.id].length === 0 && data.members[0]) {
        next[definition.id] = [data.members[0].id]
      }
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

        if (definition.allowAllToken && definition.selection === 'multi') {
          next[definition.id] = [ALL_MEMBERS_TOKEN]
          return
        }

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
    await createPlan({
      title: title.trim() || titleCandidates[0],
      templateType,
      durationSec,
      memberSize,
      goal,
      assets,
      roleAssignments,
      memo,
    })
    navigate('/plans')
  }

  return (
    <form className="page-stack" onSubmit={onSubmit}>
      <section className="panel">
        <h2>企画カード作成</h2>
        <p className="muted">テンプレ選択中心で作成できます。</p>
      </section>

      <section className="panel">
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

        <label>人数</label>
        <div className="chip-row">
          {memberSizes.map((item) => (
            <button
              type="button"
              key={item}
              className={`chip ${memberSize === item ? 'active' : ''}`}
              onClick={() => setMemberSize(item)}
            >
              {item}
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
          <label>役割割り当て</label>
          <span className="muted">兼務OK</span>
        </div>

        <div className="chip-row">
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
            前回をコピー
          </button>
          <button type="button" className="chip" onClick={autoFillRoles}>
            おすすめ自動配置
          </button>
        </div>

        {roleDefinitions.map((role) => (
          <div key={role.id} className="role-row">
            <div className="section-head">
              <strong>
                {role.label} {role.required ? '（必須）' : ''}
              </strong>
              <span className="muted">{role.selection === 'single' ? '1人選択' : '複数選択'}</span>
            </div>
            <div className="chip-row">
              {role.allowAllToken && role.selection === 'multi' && (
                <button
                  type="button"
                  className={`chip ${roleAssignments[role.id]?.includes(ALL_MEMBERS_TOKEN) ? 'active' : ''}`}
                  onClick={() => toggleRoleMember(role.id, ALL_MEMBERS_TOKEN, 'multi')}
                >
                  各自
                </button>
              )}
              {data.members.map((member) => (
                <button
                  type="button"
                  key={`${role.id}-${member.id}`}
                  className={`chip ${roleAssignments[role.id]?.includes(member.id) ? 'active' : ''}`}
                  onClick={() => toggleRoleMember(role.id, member.id, role.selection)}
                >
                  {member.displayName}
                </button>
              ))}
            </div>
            <p className="muted">現在: {resolveRoleNames(roleAssignments[role.id] ?? [], data.members)}</p>
          </div>
        ))}
      </section>

      <section className="panel">
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
      </section>

      <section className="panel">
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
        企画カードを作成
      </button>
    </form>
  )
}
