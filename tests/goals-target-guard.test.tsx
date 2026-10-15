import 'fake-indexeddb/auto';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, test } from 'vitest';
import App from '../src/App.tsx';
import {
  GoalsWriteConflictError, NutritionDatabase, saveGoals, saveGoalsIfUnchanged,
} from '../src/data/database.ts';
import { localDate } from '../src/domain/dates.ts';
import type { Goals } from '../src/domain/types.ts';

const dbs: NutritionDatabase[] = [];
function makeDb(): NutritionDatabase {
  const db = new NutritionDatabase('guard-' + crypto.randomUUID());
  dbs.push(db);
  return db;
}
afterEach(async () => {
  cleanup();
  for (const db of dbs.splice(0)) await db.delete();
});
function goal(date: string, calories: number): Goals {
  return { effectiveDate: date, mode: 'lose', calories, protein: 100, carbs: 200, fat: 60 };
}
const futureDate = '2026-12-01';

test('交易比較：已存在的未來目標被更新時拒絕過期寫入', async () => {
  const db = makeDb();
  const original = goal(futureDate, 2100);
  await saveGoals(original, db);
  await saveGoals(goal(futureDate, 2500), db);
  await expect(saveGoalsIfUnchanged(goal(futureDate, 2200), original, db))
    .rejects.toBeInstanceOf(GoalsWriteConflictError);
  expect((await db.goals.get(futureDate))?.calories).toBe(2500);
  expect(db.verno).toBe(1);
});

test('交易比較：原本不存在的日期被其他操作建立，不得覆蓋', async () => {
  const db = makeDb();
  await saveGoals(goal(futureDate, 2300), db);
  await expect(saveGoalsIfUnchanged(goal(futureDate, 2200), undefined, db))
    .rejects.toBeInstanceOf(GoalsWriteConflictError);
  expect((await db.goals.get(futureDate))?.calories).toBe(2300);
});

test('交易比較：基準未改時正常保存且不影響其他日期', async () => {
  const db = makeDb();
  const original = goal(futureDate, 2100);
  const other = goal('2026-11-30', 1700);
  await saveGoals(original, db);
  await saveGoals(other, db);
  await saveGoalsIfUnchanged(goal(futureDate, 2200), original, db);
  expect((await db.goals.get(futureDate))?.calories).toBe(2200);
  expect(await db.goals.get(other.effectiveDate)).toEqual(other);
});

test('同一 IndexedDB 目標日期同時送入兩個競爭交易，僅第一筆寫入成功', async () => {
  const db = makeDb();
  const outcomes = await Promise.allSettled([
    saveGoalsIfUnchanged(goal(futureDate, 2222), undefined, db),
    saveGoalsIfUnchanged(goal(futureDate, 2333), undefined, db),
  ]);
  expect(outcomes.filter(x => x.status === 'fulfilled')).toHaveLength(1);
  expect(outcomes.filter(x => x.status === 'rejected')).toHaveLength(1);
  expect((await db.goals.toArray()).filter(g => g.effectiveDate === futureDate)).toHaveLength(1);
  expect([2222, 2333]).toContain((await db.goals.get(futureDate))?.calories);
});

test('App：未來日期原有目標需確認覆蓋，外部更新後交易拒絕並保留草稿', async () => {
  const db = makeDb();
  await saveGoals(goal('2020-01-01', 1800), db);
  await saveGoals(goal(futureDate, 2100), db);
  const user = userEvent.setup();
  render(<App db={db} />);
  await user.click(screen.getByRole('button', { name: '目標' }));
  const calories = () => screen.getByLabelText('每日熱量目標（kcal）') as HTMLInputElement;
  await waitFor(() => expect(calories().value).toBe('1800'));
  fireEvent.change(screen.getByLabelText('目標生效日期'), { target: { value: futureDate } });
  await user.clear(calories()); await user.type(calories(), '2200');
  const save = screen.getByRole('button', { name: '保存目標' }) as HTMLButtonElement;
  expect(save.disabled).toBe(true);
  await user.click(screen.getByRole('button', { name: '確認覆蓋此日期目標' }));
  expect(save.disabled).toBe(false);

  // An independent writer changes the FUTURE row, not the goal selected for today.
  await saveGoals(goal(futureDate, 2500), db);
  await user.click(save);
  await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('原草稿未被寫入'));
  expect(calories().value).toBe('2200');
  expect((await db.goals.get(futureDate))?.calories).toBe(2500);
  expect(save.disabled).toBe(true);
  await user.click(screen.getByRole('button', { name: '載入最新資料（捨棄未儲存修改）' }));
  expect(calories().value).toBe('2500');
  expect((screen.getByLabelText('目標生效日期') as HTMLInputElement).value).toBe(futureDate);
  expect(save.disabled).toBe(true);
  await user.click(screen.getByRole('button', { name: '確認覆蓋此日期目標' }));
  await user.click(save);
  await waitFor(async () => expect((await db.goals.get(futureDate))?.calories).toBe(2500));
});

test('App：若編輯期間有人新增原先不存在的未來目標，保存拒絕覆蓋', async () => {
  const db = makeDb();
  await saveGoals(goal('2020-01-01', 1800), db);
  const user = userEvent.setup();
  render(<App db={db} />);
  await user.click(screen.getByRole('button', { name: '目標' }));
  const calories = () => screen.getByLabelText('每日熱量目標（kcal）') as HTMLInputElement;
  await waitFor(() => expect(calories().value).toBe('1800'));
  fireEvent.change(screen.getByLabelText('目標生效日期'), { target: { value: futureDate } });
  await user.clear(calories()); await user.type(calories(), '2200');
  await saveGoals(goal(futureDate, 2400), db);
  await user.click(screen.getByRole('button', { name: '保存目標' }));
  await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('原草稿未被寫入'));
  expect((await db.goals.get(futureDate))?.calories).toBe(2400);
});

test('衝突後按載入最新會重新讀取該日期再次變動的內容', async () => {
  const db = makeDb();
  await saveGoals(goal('2020-01-01', 1800), db);
  await saveGoals(goal(futureDate, 2100), db);
  const user = userEvent.setup();
  render(<App db={db} />);
  await user.click(screen.getByRole('button', { name: '目標' }));
  const calories = () => screen.getByLabelText('每日熱量目標（kcal）') as HTMLInputElement;
  await waitFor(() => expect(calories().value).toBe('1800'));
  fireEvent.change(screen.getByLabelText('目標生效日期'), { target: { value: futureDate } });
  await user.clear(calories());
  await user.type(calories(), '2200');
  await user.click(screen.getByRole('button', { name: '確認覆蓋此日期目標' }));
  await saveGoals(goal(futureDate, 2500), db);
  await user.click(screen.getByRole('button', { name: '保存目標' }));
  await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('原草稿未被寫入'));
  // Error captured 2500; a second writer advances the target to 2700.
  await saveGoals(goal(futureDate, 2700), db);
  await user.click(screen.getByRole('button', { name: '載入最新資料（捨棄未儲存修改）' }));
  await waitFor(() => expect(calories().value).toBe('2700'));
  expect(screen.queryByRole('alert')).toBeNull();
  expect((await db.goals.get(futureDate))?.calories).toBe(2700);
  expect((screen.getByRole('button', { name: '保存目標' }) as HTMLButtonElement).disabled).toBe(true);
});
