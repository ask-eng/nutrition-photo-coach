import { expect, test } from 'vitest';
import { foodSchema, goalsSchema, mealSchema } from '../src/domain/schemas.ts';
import { food, meal } from './core.cases.ts';
test('空名稱、無效重量及營養值不能保存', () => {
  for (const patch of [{ name: ' ' }, { grams: 0 }, { calories: NaN }, { fat: -1 }, { protein: Infinity }]) {
    expect(foodSchema.safeParse({ ...food, ...patch }).success).toBe(false);
  }
});
test('餐點至少一項、時間日期合法、食材 ID 不重複', () => {
  for (const patch of [{ items: [] }, { date: '2026-02-29' }, { time: '25:00' }, { items: [food, food] }]) {
    expect(mealSchema.safeParse({ ...meal, ...patch }).success).toBe(false);
  }
});
test('名稱去除空白但保留繁中', () => expect(foodSchema.parse({ ...food, name: ' 白飯 ' }).name).toBe('白飯'));
test('目標允许零碳水但不接受零熱量', () => {
  const goal = { effectiveDate: meal.date, mode: 'lose', calories: 1800, protein: 100, carbs: 0, fat: 60 };
  expect(goalsSchema.safeParse(goal).success).toBe(true);
  expect(goalsSchema.safeParse({ ...goal, calories: 0 }).success).toBe(false);
});
