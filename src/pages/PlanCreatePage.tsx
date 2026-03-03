import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { assetChoices, planTemplates } from '../data/templates'
import { useApp } from '../store/AppContext'
import type { Plan } from '../types'

const durations: Plan['duration'][] = ['Short', '8分', '15分']
const memberSizes: Plan['memberSize'][] = ['ソロ', '2人', '3〜5人', '多人数']
const goals: Plan['goal'][] = ['笑い', '驚き', '感動', '学び', '上達']

export const PlanCreatePage = () => {
  const navigate = useNavigate()
  const { createPlan } = useApp()

  const [templateType, setTemplateType] = useState(planTemplates[0])
  const [duration, setDuration] = useState<Plan['duration']>('8分')
  const [memberSize, setMemberSize] = useState<Plan['memberSize']>('2人')
  const [goal, setGoal] = useState<Plan['goal']>('笑い')
  const [assets, setAssets] = useState<string[]>(['BGM'])
  const [memo, setMemo] = useState('')
  const [title, setTitle] = useState('')

  const titleCandidates = useMemo(
    () => [
      `${templateType}で${goal}を狙う${duration}企画`,
      `${memberSize}で挑む${templateType}チャレンジ`,
      `${templateType}の結果で${goal}を作る`,
    ],
    [templateType, goal, duration, memberSize],
  )

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    createPlan({
      title: title.trim() || titleCandidates[0],
      templateType,
      duration,
      memberSize,
      goal,
      assets,
      memo,
    })
    navigate('/plans')
  }

  return (
    <form className="page-stack" onSubmit={onSubmit}>
      <section className="panel">
        <h2>企画カード作成</h2>
        <p className="muted">ボタン選択中心で作れます。文字入力は最後だけ任意です。</p>
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

        <label>尺</label>
        <div className="chip-row">
          {durations.map((item) => (
            <button
              type="button"
              key={item}
              className={`chip ${duration === item ? 'active' : ''}`}
              onClick={() => setDuration(item)}
            >
              {item}
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
