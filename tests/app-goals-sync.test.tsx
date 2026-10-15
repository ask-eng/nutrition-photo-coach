import 'fake-indexeddb/auto';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, test, vi } from 'vitest';
import App from '../src/App.tsx';
import { NutritionDatabase, saveGoals } from '../src/data/database.ts';
import { localDate } from '../src/domain/dates.ts';
import type { Goals } from '../src/domain/types.ts';

const dbs: NutritionDatabase[] = [];
function makeDb() {
  const db = new NutritionDatabase('test-goals-sync-' + crypto.randomUUID());
  dbs.push(db);
  return db;
}
afterEach(async () => {
  cleanup();
  for (const db of dbs.splice(0)) await db.delete();
});
function earlier(): Goals {
  return { effectiveDate: '2020-01-01', mode: 'lose', calories: 1800, protein: 100, carbs: 200, fat: 60 };
}

test('App 整合：新的生效日期不重新掛載而丟失未存草稿', async () => {
  const db = makeDb();
  await saveGoals(earlier(), db);
  const user = userEvent.setup();
  render(<App db={db} />);
  await user.click(screen.getByRole('button', { name: '目標' }));
  const calories = () => screen.getByLabelText('每日熱量目標（kcal）') as HTMLInputElement;
  await waitFor(() => expect(calories().value).toBe('1800'));
  await user.clear(calories()); await user.type(calories(), '1905');
  fireEvent.change(screen.getByLabelText('目標生效日期'), { target: { value: '2026-12-31' } });
  await saveGoals({ ...earlier(), effectiveDate: localDate(), calories: 2300 }, db);
  await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('更新了目標'));
  expect(calories().value).toBe('1905');
  expect((screen.getByLabelText('目標生效日期') as HTMLInputElement).value).toBe('2026-12-31');
  expect((screen.getByRole('button', { name: '保存目標' }) as HTMLButtonElement).disabled).toBe(true);
  expect((await db.goals.get(localDate()))?.calories).toBe(2300);
});

test('App 整合：乾淨表單在新生效日期儲存後跟隨最新值', async () => {
  const db = makeDb();
  await saveGoals(earlier(), db);
  render(<App db={db} />);
  await userEvent.setup().click(screen.getByRole('button', { name: '目標' }));
  const calories = () => screen.getByLabelText('每日熱量目標（kcal）') as HTMLInputElement;
  await waitFor(() => expect(calories().value).toBe('1800'));
  await saveGoals({ ...earlier(), effectiveDate: localDate(), mode: 'gain', calories: 2550 }, db);
  await waitFor(() => expect(calories().value).toBe('2550'));
  expect(screen.getByRole('button', { name: '增肌' }).getAttribute('aria-pressed')).toBe('true');
  expect(screen.queryByRole('alert')).toBeNull();
});

test('App 導覽：有草稿時取消離開，草稿與目標分頁保持不變', async () => {
  const user = userEvent.setup();
  const db = makeDb();
  await saveGoals(earlier(), db);
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
  render(<App db={db} />);
  await user.click(screen.getByRole('button', { name: '目標' }));
  const calories = () => screen.getByLabelText('每日熱量目標（kcal）') as HTMLInputElement;
  await waitFor(() => expect(calories().value).toBe('1800'));
  await user.clear(calories());
  await user.type(calories(), '1933');
  await user.click(screen.getByRole('button', { name: '今日' }));
  expect(confirm).toHaveBeenCalledTimes(1);
  expect(calories().value).toBe('1933');
  expect(screen.getByRole('button', { name: '目標' }).getAttribute('aria-current')).toBe('page');
  confirm.mockRestore();
});

test('App 導覽：明確確認捨棄後離開，回來從已保存資料初始化', async () => {
  const user = userEvent.setup();
  const db = makeDb();
  await saveGoals(earlier(), db);
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
  render(<App db={db} />);
  await user.click(screen.getByRole('button', { name: '目標' }));
  const calories = () => screen.getByLabelText('每日熱量目標（kcal）') as HTMLInputElement;
  await waitFor(() => expect(calories().value).toBe('1800'));
  await user.clear(calories());
  await user.type(calories(), '1933');
  await user.click(screen.getByRole('button', { name: '今日' }));
  expect(confirm).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('button', { name: '今日' }).getAttribute('aria-current')).toBe('page');
  await user.click(screen.getByRole('button', { name: '目標' }));
  await waitFor(() => expect(calories().value).toBe('1800'));
  confirm.mockRestore();
});

test('App 導覽：乾淨表單可直接離開不要求確認', async () => {
  const user = userEvent.setup();
  const db = makeDb();
  await saveGoals(earlier(), db);
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
  render(<App db={db} />);
  await user.click(screen.getByRole('button', { name: '目標' }));
  await waitFor(() => expect((screen.getByLabelText('每日熱量目標（kcal）') as HTMLInputElement).value).toBe('1800'));
  await user.click(screen.getByRole('button', { name: '今日' }));
  expect(confirm).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: '今日' }).getAttribute('aria-current')).toBe('page');
  confirm.mockRestore();
});
