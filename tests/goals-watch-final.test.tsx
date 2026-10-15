import 'fake-indexeddb/auto';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, test, vi } from 'vitest';
import App from '../src/App.tsx';
import { GoalsForm } from '../src/components/GoalsForm.tsx';
import { NutritionDatabase, saveGoals, saveGoalsIfUnchanged } from '../src/data/database.ts';
import { localDate } from '../src/domain/dates.ts';
import type { Goals } from '../src/domain/types.ts';

// Only delay entry to the real transactional writer; never replace its checks.
const gate = vi.hoisted(() => ({ beforeSave: null as Promise<void> | null }));
vi.mock('../src/data/database.ts', async importOriginal => {
  const actual = await importOriginal<typeof import('../src/data/database.ts')>();
  return {
    ...actual,
    saveGoalsIfUnchanged: async (...args: Parameters<typeof actual.saveGoalsIfUnchanged>) => {
      if (gate.beforeSave) await gate.beforeSave;
      return actual.saveGoalsIfUnchanged(...args);
    },
  };
});

const dbs: NutritionDatabase[] = [];
function makeDb() {
  const db = new NutritionDatabase('watch-final-' + crypto.randomUUID());
  dbs.push(db);
  return db;
}
function goal(date: string, calories: number): Goals {
  return { effectiveDate: date, mode: 'lose', calories, protein: 100, carbs: 200, fat: 60 };
}
function deferred() {
  let resolve!: () => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<void>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const calories = () => screen.getByLabelText('每日熱量目標（kcal）') as HTMLInputElement;
const save = () => screen.getByRole('button', { name: '保存目標' }) as HTMLButtonElement;
const reload = () => screen.getByRole('button', { name: '載入最新資料（捨棄未儲存修改）' });
async function edit(user: ReturnType<typeof userEvent.setup>, value: string) {
  await user.clear(calories());
  await user.type(calories(), value);
}
afterEach(async () => {
  cleanup();
  gate.beforeSave = null;
  vi.restoreAllMocks();
  for (const db of dbs.splice(0)) await db.delete();
});

test('Watch A：保存 Promise 未完成時阻擋今日與歷史，完成後恢復導覽且只寫入一次', async () => {
  const db = makeDb();
  const today = localDate();
  await saveGoals(goal(today, 1800), db);
  const pending = deferred();
  gate.beforeSave = pending.promise;
  const puts = vi.spyOn(db.goals, 'put');
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
  const user = userEvent.setup();
  render(<App db={db} />);
  await user.click(screen.getByRole('button', { name: '目標' }));
  await waitFor(() => expect(calories().value).toBe('1800'));
  await edit(user, '1933');
  const form = save().closest('form')!;
  await user.click(save());
  fireEvent.submit(form);
  for (const name of ['今日', '歷史']) {
    const tab = screen.getByRole('button', { name }) as HTMLButtonElement;
    expect(tab.disabled).toBe(true);
    await user.click(tab);
    expect(screen.getByRole('button', { name: '目標' }).getAttribute('aria-current')).toBe('page');
    expect(calories().value).toBe('1933');
  }
  expect(confirm).not.toHaveBeenCalled();
  expect(puts).not.toHaveBeenCalled();
  expect((await db.goals.get(today))?.calories).toBe(1800);
  await act(async () => { pending.resolve(); await pending.promise; });
  await waitFor(() => expect((screen.getByRole('button', { name: '今日' }) as HTMLButtonElement).disabled).toBe(false));
  expect((await db.goals.get(today))?.calories).toBe(1933);
  expect(puts).toHaveBeenCalledTimes(1);
  await user.click(screen.getByRole('button', { name: '歷史' }));
  expect(screen.getByRole('button', { name: '歷史' }).getAttribute('aria-current')).toBe('page');
  await user.click(screen.getByRole('button', { name: '今日' }));
  expect(screen.getByRole('button', { name: '今日' }).getAttribute('aria-current')).toBe('page');
  await user.click(screen.getByRole('button', { name: '目標' }));
  await waitFor(() => expect(calories().value).toBe('1933'));
  expect(confirm).not.toHaveBeenCalled();
  expect(puts).toHaveBeenCalledTimes(1);
});

test('Watch B：衝突後重新讀取 Promise 拒絕，草稿、衝突與資料庫內容不變', async () => {
  const db = makeDb();
  const date = '2026-12-01';
  const original = goal(date, 2100);
  await saveGoals(original, db);
  const pending = deferred();
  const load = vi.fn(async (target: string) => {
    await pending.promise;
    return db.goals.get(target);
  });
  const user = userEvent.setup();
  render(<GoalsForm goal={original} goals={[original]} date={date}
    loadTargetGoal={load} onSave={(value, expected) => saveGoalsIfUnchanged(value, expected, db)} />);
  await edit(user, '2200');
  await saveGoals(goal(date, 2500), db);
  await user.click(save());
  await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('原草稿未被寫入'));
  const stored = await db.goals.toArray();
  const draft = Array.from(document.querySelectorAll('form input')).map(input => (input as HTMLInputElement).value);
  const mode = screen.getByRole('button', { name: '減脂' }).getAttribute('aria-pressed');
  await user.click(reload());
  expect(load).toHaveBeenCalledWith(date);
  await act(async () => {
    pending.reject(new Error('test-only read failure'));
    await pending.promise.catch(() => {});
  });
  await screen.findByText('讀取最新目標失敗，草稿已保留，請稍後重試。');
  expect(Array.from(document.querySelectorAll('form input')).map(input => (input as HTMLInputElement).value)).toEqual(draft);
  expect(screen.getByRole('button', { name: '減脂' }).getAttribute('aria-pressed')).toBe(mode);
  expect(screen.getByRole('alert').textContent).toContain('原草稿未被寫入');
  expect(save().disabled).toBe(true);
  expect((reload() as HTMLButtonElement).disabled).toBe(false);
  expect(await db.goals.toArray()).toEqual(stored);
});

test('Watch B：重新讀取成功後再次外部更新，舊基準保存被拒絕且保留資料庫新值', async () => {
  const db = makeDb();
  const date = '2026-12-01';
  const original = goal(date, 2100);
  await saveGoals(original, db);
  const user = userEvent.setup();
  render(<GoalsForm goal={original} goals={[original]} date={date}
    loadTargetGoal={target => db.goals.get(target)}
    onSave={(value, expected) => saveGoalsIfUnchanged(value, expected, db)} />);
  await edit(user, '2200');
  await saveGoals(goal(date, 2500), db);
  await user.click(save());
  await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('原草稿未被寫入'));
  await saveGoals(goal(date, 2700), db);
  await user.click(reload());
  await waitFor(() => expect(calories().value).toBe('2700'));
  expect(screen.queryByRole('alert')).toBeNull();
  await edit(user, '2800');
  const newest = goal(date, 2900);
  await saveGoals(newest, db);
  await user.click(save());
  await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('原草稿未被寫入'));
  expect(calories().value).toBe('2800');
  expect(save().disabled).toBe(true);
  expect(await db.goals.get(date)).toEqual(newest);
  expect(await db.goals.count()).toBe(1);
  expect(db.verno).toBe(1);
});
