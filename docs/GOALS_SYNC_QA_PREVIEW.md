# Goals Sync QA Preview｜隔離待部署說明

**僅供 QA 使用；禁止合併至正式開發分支或 main。** 此分支從 `feature/goals-sync-guard-20261015` @ `b7ad4f61f04e070827046d4408852d57b60dcf35` 建立。

## 已實施的隔離措施
- 專用 IndexedDB 名稱 `nutrition-photo-coach-goals-preview-v1`，非正式資料庫 `nutrition-photo-coach-v1`。
- UI 顯示「隔離測試版」，警告只能使用虛構資料，請勿上傳真實個資或照片。
- `src/main.tsx` 在任何 `*.github.io` hostname 上**拒絕掛載 App**，避免與 `ask-eng.github.io/nutrition-photo-coach/` 同源，以及根路徑 PWA Service Worker 的作用域衝突。
- 專用 GitHub Action 僅構建與驗證，將 `dist/` 作為 GitHub Actions Artifact，上述 workflow **沒有任何 deploy job**。
- PWA Base = `/`；只允許在**不同 origin 的獨立 HTTPS 預覽域名**下發布和實機測試。
- Preview branch 特有改動不能 cherry-pick 或 merge 回正式 feature/dev，正式開發採 `feature/goals-sync-guard-20261015` 而非本分支。

## 下一個 Gate（未執行）
取得使用者對指定獨立 hostname 的確認、可用且費用受控的託管服務連接後，部署**本 SHA 驗證的靜態 Artifact**到全新 preview hostname。需再次檢查 PWA SW scope、IndexedDB 與正式站不同源，然後才能 Android 實測。不得把 GitHub Pages 同帳號下的另一個路徑當作獨立來源。

注意：GitHub Actions Build 成功不代表外部網站已上線；請勿聲稱已獲得可用的 HTTPS 預覽網址。
