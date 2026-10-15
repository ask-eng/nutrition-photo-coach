import Dexie, { type Table } from 'dexie';
import { goalsSchema, mealSchema } from '../domain/schemas.ts';
import type { Goals, Meal, Snapshot } from '../domain/types.ts';

export class NutritionDatabase extends Dexie {
  meals!: Table<Meal, string>;
  goals!: Table<Goals, string>;
  constructor(name = 'nutrition-photo-coach-goals-preview-v1') {
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

/** A target-date record changed after the editor took its baseline snapshot. */
export class GoalsWriteConflictError extends Error {
  constructor(public readonly effectiveDate: string, public readonly current: Goals | undefined) {
    super('該生效日期的目標已被其他操作變更。');
    this.name = 'GoalsWriteConflictError';
  }
}
function sameStoredGoal(a: Goals | undefined, b: Goals | undefined): boolean {
  if (!a || !b) return a === b;
  return a.effectiveDate === b.effectiveDate && a.mode === b.mode &&
    a.calories === b.calories && a.protein === b.protein &&
    a.carbs === b.carbs && a.fat === b.fat;
}

/**
 * Protect the EXACT destination effectiveDate, including future dates not selected
 * by goalForDate(today). IndexedDB read/compare/write runs in one rw transaction.
 * This is used by the interactive GoalsForm; legacy saveGoals stays unchanged.
 */
export async function saveGoalsIfUnchanged(
  value: Goals, expectedAtTarget: Goals | undefined, db = database,
): Promise<void> {
  const validated = goalsSchema.parse(value);
  if (expectedAtTarget && expectedAtTarget.effectiveDate !== validated.effectiveDate) {
    throw new Error('目標生效日期與比對基準不一致。');
  }
  await db.transaction('rw', db.goals, async () => {
    const current = await db.goals.get(validated.effectiveDate);
    if (!sameStoredGoal(current, expectedAtTarget)) {
      throw new GoalsWriteConflictError(validated.effectiveDate, current);
    }
    await db.goals.put(validated);
  });
}

export async function loadSnapshot(db = database): Promise<Snapshot> {
  const [meals, goals] = await Promise.all([db.meals.toArray(), db.goals.toArray()]);
  return { meals: meals.map(meal => mealSchema.parse(meal)), goals: goals.map(goal => goalsSchema.parse(goal)) };
}
