import { useRef, useState, type FormEvent } from 'react';
import { nutrientKeys } from '../domain/nutrition.ts';
import { goalsSchema } from '../domain/schemas.ts';
import type { Goals } from '../domain/types.ts';
import { nutritionLabels } from './FoodEditor.tsx';

type Nutrient = (typeof nutrientKeys)[number];
type Draft = { effectiveDate: string; mode: Goals['mode']; values: Record<Nutrient, string> };
type Pending = { key: string; draft: Draft; echoed: boolean };
type Editor = {
  sourceKey: string;
  baseline: Draft;
  draft: Draft;
  conflict: boolean;
  pending: Pending | null;
  awaitingEcho: string | null;
  message: string;
};
type Props = { goal?: Goals; date: string; onSave: (goal: Goals) => Promise<void> };

// Compare stored fields, not Dexie object identities.
function sourceKey(goal: Goals | undefined, date: string): string {
  return JSON.stringify([date, goal ? [goal.effectiveDate, goal.mode, goal.calories, goal.protein, goal.carbs, goal.fat] : null]);
}
function draftFrom(goal: Goals | undefined, date: string): Draft {
  return {
    // Preserve the original form's convention: a new goal takes effect today.
    effectiveDate: date, mode: goal?.mode ?? 'lose',
    values: {
      calories: String(goal?.calories ?? 2000), protein: String(goal?.protein ?? 120),
      carbs: String(goal?.carbs ?? 250), fat: String(goal?.fat ?? 60),
    },
  };
}
function sameDraft(a: Draft, b: Draft): boolean {
  return a.effectiveDate === b.effectiveDate && a.mode === b.mode &&
    nutrientKeys.every(key => a.values[key] === b.values[key]);
}
function initial(goal: Goals | undefined, date: string): Editor {
  const draft = draftFrom(goal, date);
  return { sourceKey: sourceKey(goal, date), baseline: draft, draft, conflict: false, pending: null, awaitingEcho: null, message: '' };
}
function reconcile(state: Editor, goal: Goals | undefined, date: string): Editor {
  const next = sourceKey(goal, date);
  if (state.sourceKey === next) return state;
  // Echoes must not erase a different conflict already observed during saving.
  const pendingEcho = !state.conflict && state.pending?.key === next;
  const completedEcho = !state.conflict && state.awaitingEcho === next;
  if (pendingEcho || completedEcho) return {
    ...state, sourceKey: next,
    baseline: pendingEcho ? state.pending!.draft : state.baseline,
    pending: pendingEcho && state.pending ? { ...state.pending, echoed: true } : state.pending,
    awaitingEcho: null,
  };
  const latest = draftFrom(goal, date);
  if (!state.conflict && !state.pending && sameDraft(state.draft, latest)) {
    return { ...state, sourceKey: next, baseline: latest, awaitingEcho: null };
  }
  if (!sameDraft(state.draft, state.baseline) || state.conflict || state.pending) {
    return { ...state, sourceKey: next, conflict: true, awaitingEcho: null, message: '' };
  }
  return { ...state, sourceKey: next, baseline: latest, draft: latest, conflict: false, awaitingEcho: null, message: '' };
}

export function GoalsForm({ goal, date, onSave }: Props) {
  const [editor, setEditor] = useState<Editor>(() => initial(goal, date));
  const lock = useRef(false);
  const incoming = sourceKey(goal, date);
  // Guarded render-phase sync prevents committing a stale form with new props.
  if (incoming !== editor.sourceKey) setEditor(current => reconcile(current, goal, date));
  const { effectiveDate, mode, values } = editor.draft;
  const busy = editor.pending !== null;

  function change(update: (draft: Draft) => Draft) {
    if (lock.current) return;
    setEditor(current => ({ ...current, draft: update(current.draft), message: '' }));
  }
  function loadLatest() {
    if (lock.current) return;
    setEditor({ ...initial(goal, date), message: '已載入最新目標，尚未保存的修改已捨棄。' });
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current) return;
    if (editor.conflict) {
      setEditor(current => ({ ...current, message: '請先載入最新資料，再保存目標。' }));
      return;
    }
    const parsed = goalsSchema.safeParse({
      effectiveDate, mode,
      ...Object.fromEntries(nutrientKeys.map(key => [key, values[key].trim() === '' ? NaN : Number(values[key])])),
    });
    if (!parsed.success) {
      setEditor(current => ({ ...current, message: '請填寫有效日期與非負的營養目標，熱量需大於零。' }));
      return;
    }
    lock.current = true;
    const submitted = editor.draft;
    const expectedEcho = sourceKey(parsed.data, date);
    setEditor(current => ({
      ...current, pending: { key: expectedEcho, draft: submitted, echoed: false }, awaitingEcho: null, message: '',
    }));
    try {
      await onSave(parsed.data);
      setEditor(current => {
        if (!current.pending) return current;
        return {
          ...current, baseline: current.pending.draft, pending: null,
          awaitingEcho: current.pending.echoed || current.conflict ? null : current.pending.key,
          message: current.conflict
            ? '保存已完成，但偵測到其他更新；請先載入最新資料。'
            : '目標已保存，將從生效日期開始套用。',
        };
      });
    } catch {
      setEditor(current => ({
        ...current, pending: null, awaitingEcho: null,
        message: '目標保存失敗，請檢查裝置儲存空間後重試。',
      }));
    } finally {
      lock.current = false;
    }
  }
  return <section className="panel">
    <p className="eyebrow">依自己的步調</p><h2>設定每日目標</h2>
    <p className="muted mt-2">手動設定您的攝取目標。畫面中的初始數值僅為範例，未保存前不會套用。</p>
    <form className="mt-5" onSubmit={submit} noValidate><fieldset disabled={busy}>
      <div className="mode-options">
        <button type="button" aria-pressed={mode === 'gain'} className={mode === 'gain' ? 'selected' : ''} onClick={() => change(draft => ({ ...draft, mode: 'gain' }))}>增肌</button>
        <button type="button" aria-pressed={mode === 'lose'} className={mode === 'lose' ? 'selected' : ''} onClick={() => change(draft => ({ ...draft, mode: 'lose' }))}>減脂</button>
      </div>
      <label className="block mt-4">目標生效日期<input type="date" value={effectiveDate} onChange={e => change(draft => ({ ...draft, effectiveDate: e.target.value }))} /></label>
      <div className="grid grid-cols-2 gap-3 mt-4">
        {nutrientKeys.map(key => <label key={key}>每日{nutritionLabels[key]}目標（{key === 'calories' ? 'kcal' : 'g'}）
          <input type="number" inputMode="decimal" min="0" max="100000" step="any" value={values[key]} onChange={e => {
            const value = e.target.value;
            change(draft => ({ ...draft, values: { ...draft.values, [key]: value } }));
          }} />
        </label>)}
      </div>
      {editor.conflict && <div className="notice mt-4">
        <p role="alert">另一分頁或其他操作更新了目標。為保護草稿，請先載入最新資料，再重新編輯。</p>
        <button type="button" className="text-button" onClick={loadLatest}>載入最新資料（捨棄未儲存修改）</button>
      </div>}
      <p className="hint mt-4">保留以前日期的目標；同一生效日重新保存會更新該日設定。此工具提供記錄與比較，不提供個人化營養處方。</p>
      <button className="button primary w-full mt-5" type="submit" disabled={busy || editor.conflict}>{busy ? '正在保存…' : '保存目標'}</button>
    </fieldset></form>
    {editor.message && <p role="status" className="notice mt-4">{editor.message}</p>}
  </section>;
}
