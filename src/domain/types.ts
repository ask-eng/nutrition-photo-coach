/** TypeScript adaptation of MIT upstream meal models; see THIRD_PARTY_NOTICES.md. */
export interface Nutrition {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}
export interface FoodItem extends Nutrition {
  id: string;
  name: string;
  grams: number;
}
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export interface Meal {
  id: string;
  date: string;
  time: string;
  timezone: string;
  type: MealType;
  items: FoodItem[];
  source: 'mock' | 'manual';
  photo?: Blob;
  createdAt: string;
  updatedAt: string;
}
export interface Goals extends Nutrition {
  effectiveDate: string;
  mode: 'gain' | 'lose';
}
export interface Snapshot {
  meals: Meal[];
  goals: Goals[];
}
