import { sumNutrition } from '../domain/nutrition.ts';
import type { Meal } from '../domain/types.ts';
import { usePhotoUrl } from '../photos/usePhotoUrl.ts';
import { mealLabels } from './MealEditor.tsx';
export function MealCard({ meal, onEdit, onDelete }: { meal: Meal; onEdit: () => void; onDelete: () => void }) {
  const total = sumNutrition(meal.items); const photoUrl = usePhotoUrl(meal.photo);
  return <article className="meal-card">
    <div className="flex gap-3">
      {photoUrl ? <img src={photoUrl} alt={`${mealLabels[meal.type]}照片`} className="meal-thumb" /> : <div className="meal-thumb placeholder" aria-hidden="true">♧</div>}
      <div className="min-w-0 grow"><p className="meal-meta">{mealLabels[meal.type]} · {meal.time} <span>{meal.source === 'mock' ? '示範資料' : '手動記錄'}</span></p><h3 className="meal-name">{meal.items.map(item => item.name).join('、')}</h3><p className="muted text-sm">{meal.items.reduce((n, item) => n + item.grams, 0).toLocaleString('zh-TW', { maximumFractionDigits: 1 })} 公克 · {total.calories} kcal</p></div>
    </div>
    <p className="meal-macros">蛋白質 {total.protein}g　碳水 {total.carbs}g　脂肪 {total.fat}g</p>
    <div className="flex justify-end gap-3 border-t border-stone-100 pt-2"><button type="button" className="text-button" aria-label="修改餐點" onClick={onEdit}>修改</button><button type="button" className="text-button danger" aria-label="刪除餐點" onClick={onDelete}>刪除</button></div>
  </article>;
}
