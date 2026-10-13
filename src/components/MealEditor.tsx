import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { z } from 'zod';
import { mockProvider } from '../analysis/mock.ts';
import type { AnalysisProvider } from '../analysis/provider.ts';
import { localTime } from '../domain/dates.ts';
import { nutrientKeys, scaleItem, sumNutrition } from '../domain/nutrition.ts';
import { mealSchema, validationMessage } from '../domain/schemas.ts';
import type { FoodItem, Meal, MealType } from '../domain/types.ts';
import { preparePhoto } from '../photos/process.ts';
import { usePhotoUrl } from '../photos/usePhotoUrl.ts';
import { FoodEditor, type FoodDraft } from './FoodEditor.tsx';

export const mealLabels: Record<MealType, string> = { breakfast: '早餐', lunch: '午餐', dinner: '晚餐', snack: '點心' };
const draftOf = (item: FoodItem): FoodDraft => ({ id: item.id, name: item.name, grams: String(item.grams), calories: String(item.calories), protein: String(item.protein), carbs: String(item.carbs), fat: String(item.fat) });
const newFood = (): FoodDraft => draftOf({ id: crypto.randomUUID(), name: '食物', grams: 100, calories: 0, protein: 0, carbs: 0, fat: 0 });
const numeric = (value: string): number => value.trim() === '' ? NaN : Number(value);
const itemOf = (draft: FoodDraft): FoodItem => ({ id: draft.id, name: draft.name, grams: numeric(draft.grams), calories: numeric(draft.calories), protein: numeric(draft.protein), carbs: numeric(draft.carbs), fat: numeric(draft.fat) });

interface Props { initial?: Meal; date: string; onSave: (meal: Meal) => Promise<void>; onClose: () => void; provider?: AnalysisProvider; }
export function MealEditor({ initial, date: selectedDate, onSave, onClose, provider = mockProvider }: Props) {
  const [id] = useState(() => initial?.id ?? crypto.randomUUID());
  const [date, setDate] = useState(initial?.date ?? selectedDate);
  const [time, setTime] = useState(initial?.time ?? localTime());
  const [type, setType] = useState<MealType>(initial?.type ?? 'lunch');
  const [items, setItems] = useState<FoodDraft[]>(() => initial?.items.map(draftOf) ?? [newFood()]);
  const weightBases = useRef(new Map(items.map(item => [item.id, numeric(item.grams)])));
  const [source, setSource] = useState<Meal['source']>(initial?.source ?? 'manual');
  const [photo, setPhoto] = useState<Blob | undefined>(initial?.photo);
  const photoUrl = usePhotoUrl(photo);
  const [busy, setBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);
  const controller = useRef<AbortController | null>(null);
  const photoVersion = useRef(0);
  useEffect(() => () => { controller.current?.abort(); photoVersion.current++; }, []);

  function cancelAnalysis() { controller.current?.abort(); controller.current = null; setAnalyzing(false); }
  async function selectPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = ''; if (!file) return;
    cancelAnalysis(); const version = ++photoVersion.current; setPhotoBusy(true); setError('');
    try { const processed = await preparePhoto(file); if (version === photoVersion.current) setPhoto(processed); }
    catch (e) { if (version === photoVersion.current) setError(e instanceof Error ? e.message : '照片處理失敗。'); }
    finally { if (version === photoVersion.current) setPhotoBusy(false); }
  }
  async function analyze() {
    if (!photo || analyzing || photoBusy || lock.current) return;
    const request = new AbortController(); controller.current = request; setAnalyzing(true); setError('');
    try {
      const result = await provider.analyze(photo, request.signal);
      if (request.signal.aborted || controller.current !== request) return;
      // Validate at the boundary even for Mock; future providers use the same editor.
      const checked = mealSchema.parse({ id, date, time, type, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC', items: result.items, source: result.source, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
      weightBases.current = new Map(checked.items.map(item => [item.id, item.grams]));
      setItems(checked.items.map(draftOf)); setSource(checked.source);
    } catch (e) {
      if (!request.signal.aborted) setError(e instanceof z.ZodError ? validationMessage(e) : '示範辨識失敗，可改用手動輸入。');
    } finally { if (controller.current === request) { controller.current = null; setAnalyzing(false); } }
  }
  function commitWeight(itemId: string) {
    const item = items.find(item => item.id === itemId); if (!item) return;
    const nextWeight = numeric(item.grams); const base = weightBases.current.get(itemId) ?? 100;
    if (nextWeight === base) return;
    try {
      const scaled = scaleItem({ ...itemOf(item), grams: base }, nextWeight);
      weightBases.current.set(itemId, nextWeight);
      setItems(items.map(current => current.id === itemId ? draftOf(scaled) : current));
      setError('');
    } catch { setError('請填寫大於零的有效重量，營養值不可留白或小於零。'); }
  }
  async function submit(event: FormEvent) {
    event.preventDefault(); if (lock.current || analyzing || photoBusy) return;
    setError('');
    try {
      const normalized = items.map(draft => {
        const item = itemOf(draft); const base = weightBases.current.get(item.id) ?? item.grams;
        return item.grams === base ? item : scaleItem({ ...item, grams: base }, item.grams);
      });
      const now = new Date().toISOString();
      const meal = mealSchema.parse({ id, date, time, type, items: normalized, source, photo, timezone: initial?.timezone ?? (Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'), createdAt: initial?.createdAt ?? now, updatedAt: now });
      lock.current = true; setBusy(true); await onSave(meal);
    } catch (e) {
      setError(e instanceof z.ZodError ? `請檢查餐點欄位：${validationMessage(e)}` : '無法保存餐點。請檢查輸入與裝置儲存空間，草稿仍保留。');
    } finally { lock.current = false; setBusy(false); }
  }
  let totalText = '請填寫有效的營養值';
  try { const total = sumNutrition(items.map(itemOf)); totalText = `${total.calories} kcal · 蛋白質 ${total.protein}g · 碳水 ${total.carbs}g · 脂肪 ${total.fat}g`; } catch { /* validation below */ }

  return <section className="editor" aria-label={initial ? '修改餐點表單' : '新增餐點表單'}>
    <div className="flex items-start justify-between gap-3 mb-5">
      <div><p className="eyebrow">先確認，再記錄</p><h2>{initial ? '修改這一餐' : '記錄這一餐'}</h2></div>
      <button type="button" className="text-button" disabled={busy || photoBusy} onClick={onClose}>取消</button>
    </div>
    <form onSubmit={submit} noValidate>
      <fieldset disabled={busy}>
        <div className="grid grid-cols-2 gap-3">
          <label>餐點日期<input type="date" value={date} onChange={e => setDate(e.target.value)} /></label>
          <label>餐點時間<input type="time" value={time} onChange={e => setTime(e.target.value)} /></label>
        </div>
        <label className="block mt-3">餐別<select value={type} onChange={e => setType(e.target.value as MealType)}>{Object.entries(mealLabels).map(([key, value]) => <option key={key} value={key}>{value}</option>)}</select></label>
        <div className="photo-panel mt-5">
          {photoUrl ? <img src={photoUrl} alt="餐點照片預覽" className="photo-preview" /> : <div className="photo-placeholder"><span aria-hidden="true">◎</span><p>拍下今天的一餐</p><small>照片只保存在這台裝置</small></div>}
          <div className="grid grid-cols-2 gap-3 mt-3">
            <label className="button secondary text-center">拍照<input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={selectPhoto} disabled={photoBusy} /></label>
            <label className="button secondary text-center">{photo ? '重新選取照片' : '上傳照片'}<input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={selectPhoto} disabled={photoBusy} /></label>
          </div>
          {photoBusy && <p role="status" className="hint">正在處理照片…</p>}
          <button type="button" className="button primary w-full mt-3" onClick={analyze} disabled={!photo || photoBusy || analyzing}>{analyzing ? '正在產生示範結果…' : '執行示範辨識'}</button>
          {analyzing && <button type="button" className="text-button w-full" onClick={cancelAnalysis}>取消辨識</button>}
          <p className="mock-note">示範模式：每張照片都回傳相同的範例食物，未分析真實照片，也不會上傳至 AI。再次辨識會取代目前食物清單。</p>
        </div>
      </fieldset>
      <div className="flex justify-between items-center mt-6 mb-3"><h3>確認食物與份量</h3><span className="tag">{source === 'mock' ? '示範估算' : '手動記錄'}</span></div>
      <div className="space-y-3">
        {items.map((item, index) => <FoodEditor key={item.id} item={item} index={index} disabled={busy || analyzing}
          onChange={(field, value) => setItems(current => current.map(food => food.id === item.id ? { ...food, [field]: value } : food))}
          onScaleWeight={() => commitWeight(item.id)} onRemove={() => { weightBases.current.delete(item.id); setItems(current => current.filter(food => food.id !== item.id)); }} />)}
      </div>
      <button type="button" className="button secondary w-full mt-3" disabled={busy || analyzing || items.length >= 30} onClick={() => { const item = newFood(); weightBases.current.set(item.id, 100); setItems(current => [...current, item]); }}>＋ 新增食物</button>
      <div className="draft-total"><strong>這一餐的合計</strong><p>{totalText}</p><small>確認保存後才計入每日統計。</small></div>
      {error && <p role="alert" className="error-box">{error}</p>}
      <button type="submit" className="button primary w-full" disabled={busy || analyzing || photoBusy}>{busy ? '正在保存…' : '確認並保存餐點'}</button>
    </form>
  </section>;
}
