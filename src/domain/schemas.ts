import { z } from 'zod';
import { isValidDate } from './dates.ts';

const amount = z.number().min(0, '不可小於零').max(100000, '數值超出範圍');
const date = z.string().refine(isValidDate, '請填寫有效日期');
export const foodSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1, '請填寫食物名稱').max(100, '名稱過長'),
  grams: z.number().positive('重量必須大於零').max(10000, '重量不可超過 10,000 公克'),
  calories: amount, protein: amount, carbs: amount, fat: amount,
});
export const mealSchema = z.object({
  id: z.string().min(1),
  date,
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, '請填寫有效時間'),
  timezone: z.string().min(1),
  type: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
  items: z.array(foodSchema).min(1, '請至少保留一項食物').max(30, '單餐最多 30 項食物')
    .refine(items => new Set(items.map(i => i.id)).size === items.length, '食材識別碼不可重複'),
  source: z.enum(['mock', 'manual']),
  photo: z.instanceof(Blob).optional(),
  createdAt: z.string().datetime(), updatedAt: z.string().datetime(),
});
export const goalsSchema = z.object({
  effectiveDate: date,
  mode: z.enum(['gain', 'lose']),
  calories: amount.refine(n => n > 0, '目標熱量必須大於零'),
  protein: amount, carbs: amount, fat: amount,
});
export function validationMessage(error: z.ZodError): string {
  // Never surface untranslated library error text to the user.
  const fields: Record<string, string> = { name: '食物名稱', grams: '重量', calories: '熱量', protein: '蛋白質', carbs: '碳水', fat: '脂肪', date: '餐點日期', time: '餐點時間', items: '食物清單', type: '餐別', photo: '照片' };
  return [...new Set(error.issues.map(issue => `${fields[String(issue.path.at(-1))] ?? '餐點資料'}格式不正確，請檢查數值與內容`))].join('；');
}
