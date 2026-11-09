import { percent } from './reportFormat'
import type { EmotionGroupCount } from './reportsApi'

// Six separate hues with no good-or-bad ordering. Keys match the groups the report API sends.
const GROUP_COLORS: Record<string, string> = {
  achievement: '#e7ad46', flutter: '#f08fb1', low_energy: '#7fbfa2', loss: '#6f95d6', anger: '#e8705f', tension: '#9f83d6',
}

/** A stacked bar plus a list: the numbers live in the list, so nothing can overlap on a phone. */
export function GroupDistribution({ groups, diaryCount }: { groups: EmotionGroupCount[]; diaryCount: number }) {
  const present = groups.filter((item) => item.count > 0)
  const summary = present.map((item) => `${item.label} ${percent(item.count, diaryCount)}%`).join(', ')

  return (
    <>
      <div aria-label={`감정 그룹 분포: ${summary}`} className="group-bar" role="img">
        {present.map((item) => <i key={item.group} style={{ background: GROUP_COLORS[item.group], flexGrow: item.count }} />)}
      </div>
      <ul className="group-list">
        {groups.map((item) => (
          <li className={item.count === 0 ? 'is-empty' : ''} key={item.group}>
            <i aria-hidden="true" style={{ background: GROUP_COLORS[item.group] }} />
            <span>{item.label}</span>
            <b>{item.count}편</b>
            <small>{percent(item.count, diaryCount)}%</small>
          </li>
        ))}
      </ul>
      <p className="chart-note">일기마다 대표 감정 하나를 그룹으로 묶어 세요. 합계는 일기 수와 같아요.</p>
    </>
  )
}
