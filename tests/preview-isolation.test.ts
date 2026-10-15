import { expect, test } from 'vitest';
import { database, NutritionDatabase } from '../src/data/database.ts';

test('隔離預覽版的預設 IndexedDB 名稱與原產品不同', () => {
  expect(database.name).toBe('nutrition-photo-coach-goals-preview-v1');
  expect(database.name).not.toBe('nutrition-photo-coach-v1');
  expect(new NutritionDatabase().name).toBe(database.name);
});
