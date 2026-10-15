import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, test, vi } from 'vitest';
import { GoalsForm } from '../src/components/GoalsForm.tsx';
import { nutritionLabels } from '../src/components/FoodEditor.tsx';
import type { Goals } from '../src/domain/types.ts';

type Nutrient = 'calories' | 'protein' | 'carbs' | 'fat';
const date = '2026-10-15';
function makeGoal(overrides: Partial<Goals> = {}): Goals {
  return { effectiveDate: date, mode: 'lose', calories: 1800, protein: 100, carbs: 200, fat: 60, ...overrides };
}
function valueInput(key: Nutrient): HTMLInputElement {
  return screen.getByLabelText('每日' + nutritionLabels[key] + '目標（' + (key === 'calories' ? 'kcal' : 'g') + '）') as HTMLInputElement;
}
const saveButton = () => screen.getByRole('button', { name: '保存目標' }) as HTMLButtonElement;
const dateInput = () => screen.getByLabelText('目標生效日期') as HTMLInputElement;
function makeSave() { return vi.fn(async (_value: Goals): Promise<void> => {}); }
async function edit(user: ReturnType<typeof userEvent.setup>, val: string) {
  await user.clear(valueInput('calories'));
  await user.type(valueInput('calories'), val);
}
function deferred() {
  let resolve!: () => void; let reject!: (reason?: unknown) => void;
  const promise = new Promise<void>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}
afterEach(cleanup);

test('乾淨表單自動同步模式與四種營養數值', () => {
  const save = makeSave();
  const { rerender } = render(<GoalsForm goal={makeGoal()} date={date} onSave={save} />);
  const newest = makeGoal({ mode: 'gain', calories: 2350.5, protein: 145.25, carbs: 280.75, fat: 70.2 });
  rerender(<GoalsForm goal={newest} date={date} onSave={save} />);
  for (const key of ['calories', 'protein', 'carbs', 'fat'] as const) expect(valueInput(key).value).toBe(String(newest[key]));
  expect(screen.getByRole('button', { name: '增肌' }).getAttribute('aria-pressed')).toBe('true');
  expect(screen.queryByRole('alert')).toBeNull();
});

test('修改中的營養、模式及日期保留；衝突時直接 submit 也不能保存', async () => {
  const user = userEvent.setup(); const save = makeSave();
  const { rerender } = render(<GoalsForm goal={makeGoal()} date={date} onSave={save} />);
  await edit(user, '2150.5');
  await user.click(screen.getByRole('button', { name: '增肌' }));
  fireEvent.change(dateInput(), { target: { value: '2026-10-16' } });
  rerender(<GoalsForm goal={makeGoal({ calories: 2400 })} date={date} onSave={save} />);
  expect(valueInput('calories').value).toBe('2150.5');
  expect(dateInput().value).toBe('2026-10-16');
  expect(screen.getByRole('button', { name: '增肌' }).getAttribute('aria-pressed')).toBe('true');
  expect(saveButton().disabled).toBe(true);
  expect(screen.getByRole('alert').textContent).toContain('更新了目標');
  fireEvent.submit(saveButton().closest('form')!);
  expect(save).not.toHaveBeenCalled();
  expect(screen.getByRole('status').textContent).toContain('請先載入最新資料');
});

test('只修改生效日期也保護草稿，不混入外部數值', () => {
  const save = makeSave();
  const { rerender } = render(<GoalsForm goal={makeGoal()} date={date} onSave={save} />);
  fireEvent.change(dateInput(), { target: { value: '2026-10-18' } });
  rerender(<GoalsForm goal={makeGoal({ calories: 2550 })} date={date} onSave={save} />);
  expect(dateInput().value).toBe('2026-10-18');
  expect(valueInput('calories').value).toBe('1800');
  expect(saveButton().disabled).toBe(true);
});

test('衝突反覆更新後只載入最新版本，恢復保存', async () => {
  const user = userEvent.setup(); const save = makeSave();
  const { rerender } = render(<GoalsForm goal={makeGoal()} date={date} onSave={save} />);
  await edit(user, '2150');
  rerender(<GoalsForm goal={makeGoal({ calories: 2200 })} date={date} onSave={save} />);
  rerender(<GoalsForm goal={makeGoal({ calories: 2450, mode: 'gain' })} date={date} onSave={save} />);
  await user.click(screen.getByRole('button', { name: '載入最新資料（捨棄未儲存修改）' }));
  expect(valueInput('calories').value).toBe('2450');
  expect(screen.queryByRole('alert')).toBeNull();
  await user.click(saveButton());
  await waitFor(() => expect(save.mock.calls[0]?.[0]).toMatchObject({ calories: 2450, mode: 'gain' }));
});

test('僅來源物件參照變更保留草稿不衝突', async () => {
  const user = userEvent.setup(); const save = makeSave(); const initial = makeGoal();
  const { rerender } = render(<GoalsForm goal={initial} date={date} onSave={save} />);
  await edit(user, '1950');
  rerender(<GoalsForm goal={{ ...initial }} date={date} onSave={save} />);
  expect(valueInput('calories').value).toBe('1950');
  expect(screen.queryByRole('alert')).toBeNull();
});

test('外部內容恰好等於草稿時不誤報衝突', async () => {
  const user = userEvent.setup(); const save = makeSave();
  const { rerender } = render(<GoalsForm goal={makeGoal()} date={date} onSave={save} />);
  await edit(user, '2400');
  rerender(<GoalsForm goal={makeGoal({ calories: 2400 })} date={date} onSave={save} />);
  expect(screen.queryByRole('alert')).toBeNull();
  expect(saveButton().disabled).toBe(false);
});

test('保存中自己的資料先回流不產生衝突、防止重複提交', async () => {
  const user = userEvent.setup(); const pending = deferred();
  const save = vi.fn((_goal: Goals) => pending.promise);
  const { rerender } = render(<GoalsForm goal={makeGoal()} date={date} onSave={save} />);
  await edit(user, '2200');
  const form = saveButton().closest('form')!;
  fireEvent.submit(form); fireEvent.submit(form);
  expect(save).toHaveBeenCalledTimes(1);
  rerender(<GoalsForm goal={makeGoal({ calories: 2200 })} date={date} onSave={save} />);
  expect(screen.queryByRole('alert')).toBeNull();
  await act(async () => { pending.resolve(); await pending.promise; });
  expect(saveButton().disabled).toBe(false);
  rerender(<GoalsForm goal={makeGoal({ calories: 2500 })} date={date} onSave={save} />);
  expect(valueInput('calories').value).toBe('2500');
});

test('保存完成後回流不覆蓋下一份草稿，後續外部更新正常提醒', async () => {
  const user = userEvent.setup(); const save = makeSave();
  const { rerender } = render(<GoalsForm goal={makeGoal()} date={date} onSave={save} />);
  await edit(user, '2200'); await user.click(saveButton());
  await screen.findByText('目標已保存，將從生效日期開始套用。');
  await edit(user, '2300');
  rerender(<GoalsForm goal={makeGoal({ calories: 2200 })} date={date} onSave={save} />);
  expect(valueInput('calories').value).toBe('2300');
  expect(screen.queryByRole('alert')).toBeNull();
  rerender(<GoalsForm goal={makeGoal({ calories: 2400 })} date={date} onSave={save} />);
  expect(saveButton().disabled).toBe(true);
});

test('保存中不同外部更新即使再收到自己回流也不會清掉衝突', async () => {
  const user = userEvent.setup(); const pending = deferred();
  const save = vi.fn((_goal: Goals) => pending.promise);
  const { rerender } = render(<GoalsForm goal={makeGoal()} date={date} onSave={save} />);
  await edit(user, '2200'); await user.click(saveButton());
  rerender(<GoalsForm goal={makeGoal({ calories: 2500 })} date={date} onSave={save} />);
  rerender(<GoalsForm goal={makeGoal({ calories: 2200 })} date={date} onSave={save} />);
  await act(async () => { pending.resolve(); await pending.promise; });
  expect(saveButton().disabled).toBe(true);
  expect(screen.getByRole('alert').textContent).toContain('更新了目標');
});

test('空白和零熱量不會被儲存', async () => {
  const user = userEvent.setup(); const save = makeSave();
  render(<GoalsForm goal={makeGoal()} date={date} onSave={save} />);
  await user.clear(valueInput('calories')); await user.click(saveButton());
  expect(save).not.toHaveBeenCalled();
  await user.type(valueInput('calories'), '0'); await user.click(saveButton());
  expect(save).not.toHaveBeenCalled();
});

test('保存失敗保留草稿並可重試', async () => {
  const user = userEvent.setup(); const pending = deferred();
  const save = vi.fn((_goal: Goals) => pending.promise);
  render(<GoalsForm goal={makeGoal()} date={date} onSave={save} />);
  await edit(user, '2200'); await user.click(saveButton());
  await act(async () => { pending.reject(new Error('儲存失敗')); await pending.promise.catch(() => {}); });
  expect(valueInput('calories').value).toBe('2200');
  expect(saveButton().disabled).toBe(false);
  expect(screen.getByRole('status').textContent).toContain('目標保存失敗');
  save.mockImplementation(async (_goal: Goals) => {});
  await user.click(saveButton());
  await screen.findByText('目標已保存，將從生效日期開始套用。');
  expect(save).toHaveBeenCalledTimes(2);
});
