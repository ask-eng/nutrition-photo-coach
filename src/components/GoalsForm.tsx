import { useRef, useState, type FormEvent } from 'react';
import { nutrientKeys } from '../domain/nutrition.ts';
import { goalsSchema } from '../domain/schemas.ts';
import type { Goals } from '../domain/types.ts';
import { nutritionLabels } from './FoodEditor.tsx';
export function GoalsForm({ goal, date, onSave }: { goal?: Goals; date: string; onSave: (goal: Goals) => Promise<void> }) {
  const [mode, setMode] = useState<Goals['mode']>(goal?.mode ?? 'lose');
  const [effectiveDate, setEffectiveDate] = useState(date);
  const [values, setValues] = useState({ calories: String(goal?.calories ?? 2000), protein: String(goal?.protein ?? 120), carbs: String(goal?.carbs ?? 250), fat: String(goal?.fat ?? 60) });
  const [busy, setBusy] = useState(false); const lock = useRef(false); const [message, setMessage] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault(); if (lock.current) return; setMessage('');
    const parsed = goalsSchema.safeParse({ effectiveDate, mode, ...Object.fromEntries(nutrientKeys.map(key => [key, values[key].trim() === '' ? NaN : Number(values[key])])) });
    if (!parsed.success) { setMessage('請填寫有效日期與非負的營養目標，熱量需大於零。'); return; }
    lock.current = true; setBusy(true);
    try { await onSave(parsed.data); setMessage('目標已保存，將從生效日期開始套用。'); }
    catch { setMessage('目標保存失敗，請檢查裝置儲存空間後重試。'); }
    finally { lock.current = false; setBusy(false); }
  }
  return <section className="panel"><p className="eyebrow">依自己的步調</p><h2>設定每日目標</h2><p className="muted mt-2">手動設定您的攝取目標。畫面中的初始數值僅為範例，未保存前不會套用。</p>
    <form className="mt-5" onSubmit={submit} noValidate><fieldset disabled={busy}>
      <div className="mode-options"><button type="button" aria-pressed={mode === 'gain'} className={mode === 'gain' ? 'selected' : ''} onClick={() => setMode('gain')}>增肌</button><button type="button" aria-pressed={mode === 'lose'} className={mode === 'lose' ? 'selected' : ''} onClick={() => setMode('lose')}>減脂</button></div>
      <label className="block mt-4">目標生效日期<input type="date" value={effectiveDate} onChange={e => setEffectiveDate(e.target.value)} /></label>
      <div className="grid grid-cols-2 gap-3 mt-4">{nutrientKeys.map(key => <label key={key}>每日{nutritionLabels[key]}目標（{key === 'calories' ? 'kcal' : 'g'}）<input type="number" inputMode="decimal" min="0" max="100000" step="any" value={values[key]} onChange={e => setValues(current => ({ ...current, [key]: e.target.value }))} /></label>)}</div>
      <p className="hint mt-4">保留以前日期的目標；同一生效日重新保存會更新該日設定。此工具提供記錄與比較，不提供個人化營養處方。</p>
      <button className="button primary w-full mt-5" type="submit">{busy ? '正在保存…' : '保存目標'}</button>
    </fieldset></form>{message && <p role="status" className="notice mt-4">{message}</p>}
  </section>;
}
