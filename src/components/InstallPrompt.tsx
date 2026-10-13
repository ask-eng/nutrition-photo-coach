import { useEffect, useState } from 'react';
interface InstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
export function InstallPrompt() {
  const [prompt, setPrompt] = useState<InstallEvent>();
  const [installed, setInstalled] = useState(() => window.matchMedia?.('(display-mode: standalone)').matches ?? false);
  useEffect(() => {
    const beforeInstall = (event: Event) => { event.preventDefault(); setPrompt(event as InstallEvent); };
    const onInstalled = () => { setInstalled(true); setPrompt(undefined); };
    window.addEventListener('beforeinstallprompt', beforeInstall); window.addEventListener('appinstalled', onInstalled);
    return () => { window.removeEventListener('beforeinstallprompt', beforeInstall); window.removeEventListener('appinstalled', onInstalled); };
  }, []);
  if (installed) return null;
  return <aside className="install-note"><div><strong>放到手機主畫面</strong><p>Android Chrome 選單 →「安裝應用程式」或「新增至主畫面」。需在 HTTPS 或 localhost 開啟。</p></div>
    {prompt && <button type="button" className="button secondary" onClick={async () => { try { await prompt.prompt(); await prompt.userChoice; } finally { setPrompt(undefined); } }}>安裝</button>}
  </aside>;
}
