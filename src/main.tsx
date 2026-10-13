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
createRoot(document.getElementById('root')!).render(<StrictMode><Root /></StrictMode>);
