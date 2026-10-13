import type { AnalysisProvider } from './provider.ts';
import type { FoodItem } from '../domain/types.ts';

export function mockItems(): FoodItem[] {
  return [
    { id: crypto.randomUUID(), name: '白飯', grams: 150, calories: 195, protein: 3.6, carbs: 42.3, fat: 0.5 },
    { id: crypto.randomUUID(), name: '雞胸肉', grams: 120, calories: 198, protein: 37.2, carbs: 0, fat: 4.3 },
    { id: crypto.randomUUID(), name: '青花菜', grams: 100, calories: 35, protein: 2.4, carbs: 7.2, fat: 0.4 },
  ];
}
export const mockProvider: AnalysisProvider = {
  name: '示範辨識',
  async analyze(_photo, signal) {
    await new Promise<void>((resolve, reject) => {
      if (signal?.aborted) { reject(new DOMException('已取消辨識', 'AbortError')); return; }
      const abort = () => { clearTimeout(timer); signal?.removeEventListener('abort', abort); reject(new DOMException('已取消辨識', 'AbortError')); };
      const timer = setTimeout(() => { signal?.removeEventListener('abort', abort); resolve(); }, 400);
      signal?.addEventListener('abort', abort, { once: true });
    });
    return { items: mockItems(), source: 'mock' };
  },
};
