/** Adapted from MealIngredient.scaled/totals (fud-ai) and Meal/DiaryDay totals.
 * Copyright (c) 2026 Apoorv Darshan; Copyright (c) 2026 Priyanshu Saurabh.
 * MIT: full notices in licenses/ and THIRD_PARTY_NOTICES.md.
 */
import type { FoodItem, Goals, Meal, Nutrition } from './types.ts';

export const nutrientKeys = ['calories', 'protein', 'carbs', 'fat'] as const;
const round = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
function validNutrition(item: Nutrition): void {
  for (const key of nutrientKeys) {
    if (!Number.isFinite(item[key]) || item[key] < 0) throw new Error('營養值必須是有限的非負數。');
  }
}
export function sumNutrition(items: readonly Nutrition[]): Nutrition {
  const result: Nutrition = { calories: 0, protein: 0, carbs: 0, fat: 0 };
  for (const item of items) {
    validNutrition(item);
    for (const key of nutrientKeys) result[key] += item[key];
  }
  for (const key of nutrientKeys) {
    if (!Number.isFinite(result[key])) throw new Error('營養總量超出範圍。');
    result[key] = round(result[key]);
  }
  return result;
}
export function scaleItem(item: FoodItem, grams: number): FoodItem {
  if (![grams, item.grams].every(n => Number.isFinite(n) && n > 0)) throw new Error('重量必須大於零。');
  validNutrition(item);
  const factor = grams / item.grams;
  const scaled = { ...item, grams };
  // Retain precision internally; only round totals/display. Tiny portions must
  // not erase micron-sized macro amounts when the user restores the weight.
  for (const key of nutrientKeys) scaled[key] = item[key] * factor;
  validNutrition(scaled);
  return scaled;
}
export function dailyTotals(meals: readonly Meal[], date: string): Nutrition {
  return sumNutrition(meals.filter(meal => meal.date === date).flatMap(meal => meal.items));
}
export function goalForDate(goals: readonly Goals[], date: string): Goals | undefined {
  return goals.reduce<Goals | undefined>((latest, goal) =>
    goal.effectiveDate <= date && (!latest || goal.effectiveDate > latest.effectiveDate) ? goal : latest, undefined);
}
