import { nutrientKeys } from '../domain/nutrition.ts';
export interface FoodDraft { id: string; name: string; grams: string; calories: string; protein: string; carbs: string; fat: string; }
export const nutritionLabels = { calories: '熱量', protein: '蛋白質', carbs: '碳水', fat: '脂肪' };
interface Props {
  item: FoodDraft;
  index: number;
  onChange: (field: keyof FoodDraft, value: string) => void;
  onScaleWeight: () => void;
  onRemove: () => void;
  disabled: boolean;
}
export function FoodEditor({ item, index, onChange, onScaleWeight, onRemove, disabled }: Props) {
  const number = index + 1;
  return <fieldset className="food-card" disabled={disabled}>
    <legend>食物 {number}</legend>
    <div className="flex items-end gap-3">
      <label className="grow">食物名稱 {number}<input value={item.name} maxLength={100} onChange={e => onChange('name', e.target.value)} /></label>
      <button type="button" className="text-button danger" onClick={onRemove} aria-label={`移除食物 ${number}`}>移除</button>
    </div>
    <label className="mt-3 block">重量 {number}（公克）
      <input type="number" inputMode="decimal" min="0.01" max="10000" step="any" value={item.grams} onChange={e => onChange('grams', e.target.value)} onBlur={onScaleWeight} />
    </label>
    <p className="hint">改重量會依目前營養值等比例換算；也可直接修改下方數值。</p>
    <div className="grid grid-cols-2 gap-3 mt-3">
      {nutrientKeys.map(key => <label key={key}>{nutritionLabels[key]} {number}（{key === 'calories' ? 'kcal' : 'g'}）
        <input type="number" inputMode="decimal" min="0" max="100000" step="any" value={item[key]} onChange={e => onChange(key, e.target.value)} />
      </label>)}
    </div>
  </fieldset>;
}
