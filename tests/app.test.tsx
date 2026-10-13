import 'fake-indexeddb/auto';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, test } from 'vitest';
import App from '../src/App.tsx';
import { NutritionDatabase, saveMeal } from '../src/data/database.ts';
import { meal } from './core.cases.ts';
const databases: NutritionDatabase[] = [];
const makeDb = () => { const db = new NutritionDatabase(`ui-${crypto.randomUUID()}`); databases.push(db); return db; };
afterEach(async () => { cleanup(); for (const db of databases.splice(0)) await db.delete(); });

test('空日與未設定目標可正常顯示', async () => {
  render(<App db={makeDb()} />);
  expect(await screen.findByText('這一天還沒有餐點')).toBeTruthy();
  expect(screen.getByText('尚未設定每日目標')).toBeTruthy();
});
test('手動草稿不計入；修正確認後只保存一餐', async () => {
  const db = makeDb(); const user = userEvent.setup(); render(<App db={db} />);
  await screen.findByText('這一天還沒有餐點');
  await user.click(screen.getByRole('button', { name: '記錄餐點' }));
  await user.clear(screen.getByLabelText('食物名稱 1')); await user.type(screen.getByLabelText('食物名稱 1'), '早餐吐司');
  await user.clear(screen.getByLabelText('熱量 1（kcal）')); await user.type(screen.getByLabelText('熱量 1（kcal）'), '200');
  expect(await db.meals.count()).toBe(0);
  await user.click(screen.getByRole('button', { name: '確認並保存餐點' }));
  await screen.findByText('餐點已保存在此裝置。');
  expect(await db.meals.count()).toBe(1); expect((await db.meals.toArray())[0].items[0].calories).toBe(200);
});
test('歷史餐點可修改及確認刪除', async () => {
  const db = makeDb(); await saveMeal(meal, db); const user = userEvent.setup(); render(<App db={db} />);
  await user.click(screen.getByRole('button', { name: '歷史' }));
  await user.clear(screen.getByLabelText('查詢日期')); await user.type(screen.getByLabelText('查詢日期'), meal.date);
  await user.click(await screen.findByRole('button', { name: '修改餐點' }));
  await user.clear(screen.getByLabelText('食物名稱 1')); await user.type(screen.getByLabelText('食物名稱 1'), '修正雞肉餐');
  await user.click(screen.getByRole('button', { name: '確認並保存餐點' }));
  await waitFor(async () => expect((await db.meals.get(meal.id))?.items[0].name).toBe('修正雞肉餐'));
  await user.click(screen.getByRole('button', { name: '刪除餐點' }));
  expect(await db.meals.count()).toBe(1);
  await user.click(screen.getByRole('button', { name: '確認刪除' }));
  await waitFor(async () => expect(await db.meals.count()).toBe(0));
});
test('無效草稿留下表單，不保存', async () => {
  const db = makeDb(); const user = userEvent.setup(); render(<App db={db} />);
  await screen.findByText('這一天還沒有餐點'); await user.click(screen.getByRole('button', { name: '記錄餐點' }));
  await user.clear(screen.getByLabelText('食物名稱 1'));
  await user.click(screen.getByRole('button', { name: '確認並保存餐點' }));
  expect(await db.meals.count()).toBe(0); expect(screen.getByLabelText('食物名稱 1')).toBeTruthy();
});
