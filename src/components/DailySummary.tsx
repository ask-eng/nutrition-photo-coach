import { nutrientKeys } from '../domain/nutrition.ts';
import type { Goals, Nutrition } from '../domain/types.ts';
import { nutritionLabels } from './FoodEditor.tsx';
export function DailySummary({ totals, goal }: { totals: Nutrition; goal?: Goals }) {
  return <section aria-label="每日營養統計" className="summary">
    <div className="flex justify-between items-start"><div><p className="eyebrow">每天一點，更了解自己</p><h2>今日攝取</h2></div><span className="tag">{goal ? goal.mode === 'gain' ? '增肌目標' : '減脂目標' : '尚未設定目標'}</span></div>
    <div className="calorie-number">{Math.round(totals.calories).toLocaleString('zh-TW')}<span>kcal</span></div>
    {goal ? <p className="summary-caption">目標 {goal.calories.toLocaleString('zh-TW')} kcal · {totals.calories > goal.calories ? `超出 ${Math.round(totals.calories - goal.calories)}` : `剩餘 ${Math.round(goal.calories - totals.calories)}`} kcal</p> : <p className="summary-caption">尚未設定每日目標</p>}
    {goal && <progress className="calorie-progress" aria-label="熱量目標進度" max={goal.calories} value={Math.min(totals.calories, goal.calories)} />}
    <div className="macro-grid">
      {nutrientKeys.filter(key => key !== 'calories').map(key => <div className={`macro ${key}`} key={key}>
        <p>{nutritionLabels[key]}</p><strong>{totals[key].toLocaleString('zh-TW', { maximumFractionDigits: 1 })}<small>g</small></strong>
        {goal && <small>目標 {goal[key]}g · {totals[key] > goal[key] ? `超出 ${(totals[key] - goal[key]).toFixed(1)}` : `剩餘 ${(goal[key] - totals[key]).toFixed(1)}`}g</small>}
      </div>)}
    </div>
  </section>;
}
