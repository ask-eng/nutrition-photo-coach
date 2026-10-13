import { expect, test } from 'vitest';
import { mockProvider } from '../src/analysis/mock.ts';
test('Mock 回傳多項且不需要網路', async () => {
  const result = await mockProvider.analyze(new Blob(['photo']));
  expect(result.items.length).toBeGreaterThan(1); expect(result.source).toBe('mock');
  expect(result.items.map(i => i.name)).toContain('白飯');
});
test('取消的分析不產生結果', async () => {
  const controller = new AbortController(); const pending = mockProvider.analyze(new Blob(), controller.signal); controller.abort();
  await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
});
