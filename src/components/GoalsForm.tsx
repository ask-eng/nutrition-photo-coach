import { useEffect, useRef, useState, type FormEvent } from 'react';
import { GoalsWriteConflictError } from '../data/database.ts';
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
  targetExpected: Goals | undefined;
  targetConfirmationRequired: boolean;
  overwriteConfirmed: boolean;
  targetConflict: { date: string; current: Goals | undefined } | null;
};
type Props = {
  goal?: Goals;
  goals?: readonly Goals[];
  date: string;
  onSave: (goal: Goals, expectedAtTarget?: Goals) => Promise<void>;
  loadTargetGoal?: (date: string) => Promise<Goals | undefined>;
  onDirtyChange?: (dirty: boolean) => void;
  onBusyChange?: (busy: boolean) => void;
};
function targetFor(goals: readonly Goals[] | undefined, selected: Goals | undefined, target: string): Goals | undefined {
  return goals?.find(g => g.effectiveDate === target) ??
    (!goals && selected?.effectiveDate === target ? selected : undefined);
}

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
function initial(goal: Goals | undefined, date: string, goals?: readonly Goals[]): Editor {
  const draft = draftFrom(goal, date);
  return {
    sourceKey: sourceKey(goal, date), baseline: draft, draft,
    conflict: false, pending: null, awaitingEcho: null, message: '',
    targetExpected: targetFor(goals, goal, date),
    targetConfirmationRequired: false, overwriteConfirmed: false, targetConflict: null,
  };
}
function reconcile(state: Editor, goal: Goals | undefined, date: string, goals?: readonly Goals[]): Editor {
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
    return {
      ...state, sourceKey: next, baseline: latest, awaitingEcho: null,
      targetExpected: state.draft.effectiveDate === date
        ? targetFor(goals, goal, date) : state.targetExpected,
    };
  }
  if (!sameDraft(state.draft, state.baseline) || state.conflict || state.pending) {
    return { ...state, sourceKey: next, conflict: true, awaitingEcho: null, message: '' };
  }
  return {
    ...state, sourceKey: next, baseline: latest, draft: latest,
    conflict: false, awaitingEcho: null, message: '',
    targetExpected: targetFor(goals, goal, latest.effectiveDate),
    targetConfirmationRequired: false, overwriteConfirmed: false, targetConflict: null,
  };
}

export function GoalsForm({ goal, goals, date, onSave, loadTargetGoal, onDirtyChange, onBusyChange }: Props) {
  const [editor, setEditor] = useState<Editor>(() => initial(goal, date, goals));
  const lock = useRef(false);
  const [refreshing, setRefreshing] = useState(false);
  const incoming = sourceKey(goal, date);
  // Guarded render-phase sync prevents committing a stale form with new props.
  if (incoming !== editor.sourceKey) setEditor(current => reconcile(current, goal, date, goals));
  const { effectiveDate, mode, values } = editor.draft;
  const busy = editor.pending !== null;
  const dirty = !sameDraft(editor.draft, editor.baseline) || editor.conflict;
  useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);
  useEffect(() => { onBusyChange?.(busy || refreshing); }, [busy, refreshing, onBusyChange]);

  function change(update: (draft: Draft) => Draft) {
    if (lock.current) return;
    setEditor(current => ({ ...current, draft: update(current.draft), message: '' }));
  }
  function changeTargetDate(targetDate: string) {
    if (lock.current) return;
    const existing = targetFor(goals, goal, targetDate);
    setEditor(current => ({
      ...current,
      draft: { ...current.draft, effectiveDate: targetDate },
      targetExpected: existing,
      targetConfirmationRequired: targetDate !== date && Boolean(existing),
      overwriteConfirmed: false,
      message: '',
    }));
  }
  async function loadLatest() {
    if (lock.current) return;
    if (editor.targetConflict) {
      if (!loadTargetGoal) {
        setEditor(state => ({ ...state, message: '無法讀取此日期的最新目標，請稍後重試。' }));
        return;
      }
      const targetDate = editor.targetConflict.date;
      lock.current = true;
      setRefreshing(true);
      try {
        // Reload at click time; later writes remain protected by the transaction.
        const current = await loadTargetGoal(targetDate);
        const latest = draftFrom(current, targetDate);
        setEditor(state => ({
          ...state, sourceKey: incoming, baseline: latest, draft: latest,
          targetExpected: current,
          targetConfirmationRequired: targetDate !== date && Boolean(current),
          overwriteConfirmed: false,
          conflict: false, targetConflict: null, pending: null, awaitingEcho: null,
          message: '已重新讀取此日期的最新目標，尚未保存的修改已捨棄。',
        }));
      } catch {
        setEditor(state => ({
          ...state, message: '讀取最新目標失敗，草稿已保留，請稍後重試。',
        }));
      } finally {
        setRefreshing(false);
        lock.current = false;
      }
      return;
    }
    setEditor({ ...initial(goal, date, goals), message: '已載入最新目標，尚未保存的修改已捨棄。' });
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current) return;
    if (editor.conflict) {
      setEditor(current => ({ ...current, message: '請先載入最新資料，再保存目標。' }));
      return;
    }
    if (editor.targetConfirmationRequired && !editor.overwriteConfirmed) {
      setEditor(current => ({
        ...current, message: '該生效日期已有目標，請先明確確認覆蓋。',
      }));
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
      await onSave(parsed.data, editor.targetExpected);
      setEditor(current => {
        if (!current.pending) return current;
        return {
          ...current, baseline: current.pending.draft, pending: null,
          targetExpected: parsed.data,
          targetConfirmationRequired: false,
          overwriteConfirmed: false,
          awaitingEcho: current.pending.echoed || current.conflict ? null : current.pending.key,
          message: current.conflict
            ? '保存已完成，但偵測到其他更新；請先載入最新資料。'
            : '目標已保存，將從生效日期開始套用。',
        };
      });
    } catch (error) {
      setEditor(current => ({
        ...current, pending: null, awaitingEcho: null,
        conflict: error instanceof GoalsWriteConflictError ? true : current.conflict,
        targetConflict: error instanceof GoalsWriteConflictError
          ? { date: error.effectiveDate, current: error.current } : current.targetConflict,
        message: error instanceof GoalsWriteConflictError
          ? '此日期的目標已被其他操作變更，本次未保存，請載入最新資料。'
          : '目標保存失敗，請檢查裝置儲存空間後重試。',
      }));
    } finally {
      lock.current = false;
    }
  }
  return <section className="panel">
    <p className="eyebrow">依自己的步調</p><h2>設定每日目標</h2>
    <p className="muted mt-2">手動設定您的攝取目標。畫面中的初始數值僅為範例，未保存前不會套用。</p>
    <form className="mt-5" onSubmit={submit} noValidate><fieldset disabled={busy || refreshing}>
      <div className="mode-options">
        <button type="button" aria-pressed={mode === 'gain'} className={mode === 'gain' ? 'selected' : ''} onClick={() => change(draft => ({ ...draft, mode: 'gain' }))}>增肌</button>
        <button type="button" aria-pressed={mode === 'lose'} className={mode === 'lose' ? 'selected' : ''} onClick={() => change(draft => ({ ...draft, mode: 'lose' }))}>減脂</button>
      </div>
      <label className="block mt-4">目標生效日期<input type="date" value={effectiveDate} onChange={e => changeTargetDate(e.target.value)} /></label>
      <div className="grid grid-cols-2 gap-3 mt-4">
        {nutrientKeys.map(key => <label key={key}>每日{nutritionLabels[key]}目標（{key === 'calories' ? 'kcal' : 'g'}）
          <input type="number" inputMode="decimal" min="0" max="100000" step="any" value={values[key]} onChange={e => {
            const value = e.target.value;
            change(draft => ({ ...draft, values: { ...draft.values, [key]: value } }));
          }} />
        </label>)}
      </div>
      {editor.targetConfirmationRequired && !editor.conflict && <div className="notice mt-4">
        <p>該生效日期已有目標。若保存，會取代該日期的既有數值；請明確確認。</p>
        <button type="button" className="text-button" aria-pressed={editor.overwriteConfirmed}
          onClick={() => setEditor(state => ({ ...state, overwriteConfirmed: true, message: '' }))}>
          {editor.overwriteConfirmed ? '已確認覆蓋此日期目標' : '確認覆蓋此日期目標'}
        </button>
      </div>}
      {editor.conflict && <div className="notice mt-4">
        <p role="alert">{editor.targetConflict
          ? '此日期的目標已更新，原草稿未被寫入。請載入該日期最新資料後再編輯。'
          : '另一分頁或其他操作更新了目標。為保護草稿，請先載入最新資料，再重新編輯。'}</p>
        <button type="button" className="text-button" onClick={loadLatest}>載入最新資料（捨棄未儲存修改）</button>
      </div>}
      <p className="hint mt-4">保留以前日期的目標；同一生效日重新保存會更新該日設定。此工具提供記錄與比較，不提供個人化營養處方。</p>
      <button className="button primary w-full mt-5" type="submit" disabled={busy || refreshing || editor.conflict || (editor.targetConfirmationRequired && !editor.overwriteConfirmed)}>{busy ? '正在保存…' : '保存目標'}</button>
    </fieldset></form>
    {editor.message && <p role="status" className="notice mt-4">{editor.message}</p>}
  </section>;
}
