import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { useRegisterSW } from 'virtual:pwa-register/react';
import App from './App.tsx';
import './styles.css';

function Root() {
  const [swError, setSwError] = useState(false);
  const { needRefresh: [needRefresh, setNeedRefresh], updateServiceWorker } = useRegisterSW({
    onRegisterError: () => setSwError(true),
  });
  return <><App />{needRefresh && <aside className="update-banner" role="status"><p>新版本可用。請先保存餐點，再重新載入。</p><div className="flex gap-3"><button className="button secondary" onClick={() => setNeedRefresh(false)}>稍後</button><button className="button primary" onClick={() => { if (window.confirm('已保存目前的餐點草稿嗎？重新載入會捨棄未保存的輸入。')) void updateServiceWorker(true); }}>更新版本</button></div></aside>}{swError && <aside className="update-banner" role="status">離線快取啟用失敗，請在連線時重新開啟。<button className="text-button" onClick={() => setSwError(false)}>關閉</button></aside>}</>;
}
const mount = document.getElementById('root')!;
if (window.location.hostname === 'ask-eng.github.io' || window.location.hostname.endsWith('.github.io')) {
  // Never mount App or register a root-scoped Service Worker on the production origin.
  mount.textContent = '此隔離測試版禁止在 GitHub Pages 共用網域啟動；請使用獨立來源的 HTTPS 預覽網址。';
} else {
  createRoot(mount).render(<StrictMode><Root /></StrictMode>);
}
