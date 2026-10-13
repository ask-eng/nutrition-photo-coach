import 'fake-indexeddb/auto';
import { afterEach, expect, test } from 'vitest';
import { NutritionDatabase, deleteMeal, loadSnapshot, saveGoals, saveMeal } from '../src/data/database.ts';
import { meal } from './core.cases.ts';
const databases: NutritionDatabase[] = [];
const makeDb = () => { const db = new NutritionDatabase(`test-${crypto.randomUUID()}`); databases.push(db); return db; };
afterEach(async () => { for (const db of databases.splice(0)) await db.delete(); });
test('保存並重新開啟後資料仍存在', async () => {
  const db = makeDb(); await saveMeal(meal, db); db.close(); await db.open();
  expect((await loadSnapshot(db)).meals).toEqual([meal]);
});
test('修改同 ID 不新增，換日期後資料正確', async () => {
  const db = makeDb(); await saveMeal(meal, db); await saveMeal({ ...meal, date: '2026-10-12' }, db);
  const snapshot = await loadSnapshot(db); expect(snapshot.meals).toHaveLength(1); expect(snapshot.meals[0].date).toBe('2026-10-12');
});
test('只刪除指定餐點', async () => {
  const db = makeDb(); await saveMeal(meal, db); await saveMeal({ ...meal, id: 'other' }, db);
  await deleteMeal(meal.id, db); expect((await loadSnapshot(db)).meals.map(m => m.id)).toEqual(['other']);
});
test('無效餐點不寫入', async () => {
  const db = makeDb(); await expect(saveMeal({ ...meal, items: [] }, db)).rejects.toThrow(); expect(await db.meals.count()).toBe(0);
});
test('目標保存各生效日，同日修正不重複', async () => {
  const db = makeDb(); const goal = { effectiveDate: meal.date, mode: 'lose' as const, calories: 1800, protein: 100, carbs: 200, fat: 60 };
  await saveGoals(goal, db); await saveGoals({ ...goal, calories: 1900 }, db); await saveGoals({ ...goal, effectiveDate: '2026-10-15' }, db);
  expect(await db.goals.count()).toBe(2); expect((await db.goals.get(meal.date))?.calories).toBe(1900);
});
