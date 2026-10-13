import { useEffect, useRef } from 'react';
export function DeleteDialog({ busy, onCancel, onConfirm }: { busy: boolean; onCancel: () => void; onConfirm: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLButtonElement>('button')?.focus();
    return () => { previous?.focus(); };
  }, []);
  return <div className="dialog-backdrop"><div ref={ref} role="alertdialog" aria-modal="true" aria-labelledby="delete-title" aria-describedby="delete-description" className="dialog" onKeyDown={event => {
    if (event.key === 'Escape' && !busy) onCancel();
    if (event.key === 'Tab') {
      const buttons = ref.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'); if (!buttons?.length) return;
      if (event.shiftKey && document.activeElement === buttons[0]) { event.preventDefault(); buttons[buttons.length - 1].focus(); }
      if (!event.shiftKey && document.activeElement === buttons[buttons.length - 1]) { event.preventDefault(); buttons[0].focus(); }
    }
  }}><h2 id="delete-title">刪除這一餐？</h2><p id="delete-description" className="muted mt-3">刪除後無法復原。其他餐點與目標不受影響。</p><div className="grid grid-cols-2 gap-3 mt-5"><button className="button secondary" disabled={busy} onClick={onCancel}>保留餐點</button><button className="button destructive" disabled={busy} onClick={onConfirm}>{busy ? '正在刪除…' : '確認刪除'}</button></div></div></div>;
}
