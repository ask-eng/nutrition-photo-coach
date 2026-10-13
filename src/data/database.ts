import Dexie, { type Table } from 'dexie';
import { goalsSchema, mealSchema } from '../domain/schemas.ts';
import type { Goals, Meal, Snapshot } from '../domain/types.ts';

export class NutritionDatabase extends Dexie {
  meals!: Table<Meal, string>;
  goals!: Table<Goals, string>;
  constructor(name = 'nutrition-photo-coach-v1') {
    super(name);
    // Additive schema only. No destructive upgrade or automatic seed records.
    this.version(1).stores({ meals: 'id, date, updatedAt', goals: 'effectiveDate' });
  }
}
export const database = new NutritionDatabase();
export async function saveMeal(meal: Meal, db = database): Promise<void> {
  const validated = mealSchema.parse(meal);
  await db.meals.put(validated);
}
export async function deleteMeal(id: string, db = database): Promise<void> {
  await db.meals.delete(id);
}
export async function saveGoals(goals: Goals, db = database): Promise<void> {
  await db.goals.put(goalsSchema.parse(goals));
}
export async function loadSnapshot(db = database): Promise<Snapshot> {
  const [meals, goals] = await Promise.all([db.meals.toArray(), db.goals.toArray()]);
  return { meals: meals.map(meal => mealSchema.parse(meal)), goals: goals.map(goal => goalsSchema.parse(goal)) };
}
