import assert from 'node:assert/strict';
import { dailyTotals, goalForDate, scaleItem, sumNutrition } from '../src/domain/nutrition.ts';
import { isValidDate, localDate } from '../src/domain/dates.ts';
import type { FoodItem, Goals, Meal } from '../src/domain/types.ts';
import { mockProvider } from '../src/analysis/mock.ts';
import { preparePhoto } from '../src/photos/process.ts';

export const food: FoodItem = { id: 'food-1', name: '雞肉餐', grams: 100, calories: 500, protein: 30, carbs: 50, fat: 20 };
export const meal: Meal = { id: 'meal-1', date: '2026-10-13', time: '12:00', timezone: 'Asia/Taipei', type: 'lunch', items: [food], source: 'manual', createdAt: '2026-10-13T04:00:00Z', updatedAt: '2026-10-13T04:00:00Z' };
const goal: Goals = { effectiveDate: '2026-10-13', mode: 'gain', calories: 2200, protein: 140, carbs: 260, fat: 70 };

// Shared real assertions: Vitest and dependency-free Node run the SAME core cases.
export const coreCases: Array<[string, () => void | Promise<void>]> = [
  ['兩餐加總四項營養', () => assert.deepEqual(sumNutrition([food, food]), { calories: 1000, protein: 60, carbs: 100, fat: 40 })],
  ['空日回傳零', () => assert.deepEqual(sumNutrition([]), { calories: 0, protein: 0, carbs: 0, fat: 0 })],
  ['重量 100→150 等比例換算', () => assert.deepEqual(scaleItem(food, 150), { ...food, grams: 150, calories: 750, protein: 45, carbs: 75, fat: 30 })],
  ['改重不變更原始食材', () => { scaleItem(food, 150); assert.equal(food.grams, 100); assert.equal(food.calories, 500); }],
  ['手動營養修正成為下一次重量換算基準', () => assert.equal(scaleItem({ ...food, calories: 600 }, 200).calories, 1200)],
  ['小份量再恢復重量不丟失營養精度', () => assert.equal(scaleItem(scaleItem({ ...food, fat: 0.4 }, 1), 100).fat, 0.4)],
  ['拒絕零、負數、NaN、無限新重量', () => { for (const n of [0, -1, NaN, Infinity]) assert.throws(() => scaleItem(food, n)); }],
  ['拒絕無效原始重量', () => assert.throws(() => scaleItem({ ...food, grams: 0 }, 100))],
  ['拒絕非有限或負數營養', () => { for (const n of [NaN, Infinity, -1]) assert.throws(() => sumNutrition([{ ...food, fat: n }])); }],
  ['每日只計入指定日期', () => assert.equal(dailyTotals([meal, { ...meal, id: '2', date: '2026-10-12' }], '2026-10-13').calories, 500)],
  ['修改日期後移出原日期', () => assert.equal(dailyTotals([{ ...meal, date: '2026-10-12' }], '2026-10-13').calories, 0)],
  ['刪除一餐不影響另一餐總量', () => { const meals = [meal, { ...meal, id: '2' }]; assert.equal(dailyTotals(meals.filter(m => m.id !== 'meal-1'), meal.date).calories, 500); }],
  ['沒有生效目標回傳 undefined', () => assert.equal(goalForDate([goal], '2026-10-12'), undefined)],
  ['選最近已生效目標且不排序變更原陣列', () => { const goals = [{ ...goal, effectiveDate: '2026-10-15' }, { ...goal, effectiveDate: '2026-10-01', calories: 1800 }, goal]; assert.equal(goalForDate(goals, '2026-10-14')?.calories, 2200); assert.equal(goals[0].effectiveDate, '2026-10-15'); }],
  ['目標當日立即生效', () => assert.equal(goalForDate([goal], goal.effectiveDate)?.mode, 'gain')],
  ['本機日期使用年月日，非 UTC 截字', () => assert.equal(localDate(new Date(2026, 9, 13, 0, 5)), '2026-10-13')],
  ['驗證閏日與不存在的日期', () => { assert.equal(isValidDate('2024-02-29'), true); for (const d of ['2026-02-29', '2026-13-01', '2026-04-31', '2026-1-1', '2026-00-01']) assert.equal(isValidDate(d), false); }],
  ['Mock 多項示範食物與固定來源', async () => { const result = await mockProvider.analyze(new Blob()); assert.equal(result.source, 'mock'); assert.equal(result.items.length, 3); assert.equal(result.items[0].name, '白飯'); assert.equal(new Set(result.items.map(i => i.id)).size, 3); }],
  ['取消執行中的 Mock 不回傳過期結果', async () => { const controller = new AbortController(); const pending = mockProvider.analyze(new Blob(), controller.signal); controller.abort(); await assert.rejects(pending, { name: 'AbortError' }); }],
  ['已取消的 Mock 不啟動', async () => { const controller = new AbortController(); controller.abort(); await assert.rejects(mockProvider.analyze(new Blob(), controller.signal), { name: 'AbortError' }); }],
  ['空照片、過大照片及 HEIC 在解碼前拒絕', async () => {
    await assert.rejects(preparePhoto(new File([], 'empty.jpg', { type: 'image/jpeg' })));
    await assert.rejects(preparePhoto(new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'large.png', { type: 'image/png' })));
    await assert.rejects(preparePhoto(new File(['x'], 'photo.heic', { type: 'image/heic' })));
  }],
];
