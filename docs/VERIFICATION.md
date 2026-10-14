# Implementation Task #002 驗證結果

> 更新：Task #003 已在 GitHub Actions 成功完成安裝、TypeScript、Vitest 36／36、Production Build 與 PWA 產物檢查。以下是 Task #002 的歷史紀錄，最新結果見 TASK003_BUILD_VERIFICATION.md；Android 實機仍待驗收。

日期：2026-10-13。這是原始碼交付，尚未確認完整 App 可執行或 Android 可安裝。

## 實際已執行
- Node.js `v24.19.0`、npm `11.9.0` 可執行。
- `npm run test:core`：21 個案例通過、0 失敗。測試同一份純 TypeScript 生產模組，涵蓋加總、重量換算、無效數值、日期分組、目標生效日、Mock 多項結果、取消 Mock、照片格式與大小拒絕。
- Node `stripTypeScriptTypes` 加 VM module parser：17 個 `.ts` 檔案可移除型別並解析語法；這不等於 tsc 型別檢查，也不涵蓋 TSX。原先 `node --check` 不支援該用法，改用上述原生工具完成語法檢查。
- PNG 圖示實際尺寸：192×192、512×512、maskable 512×512。
- 確認 README 位元組內容保留；產品原始碼沒有真實 AI 端點或已知 API Key 標記。此為有限範圍檢查，不宣稱完整安全稽核。
- 最初核心 stub 的 16 案例為 12 失敗／4 通過；實作後 16／16 通過。後續擴充為 21 案例。
- `npm ping --fetch-retries=0 --fetch-timeout=8000`：EPERM，連到 `172.31.12.189:8080` 被拒絕。收到「重試」後再次有上限檢查，仍相同。
- `npm install --offline --ignore-scripts`：ENOTCACHED，缺少 @tailwindcss/vite；本機亦未找到 React、Vite、TypeScript、Dexie、Zod、Vitest 的可用預裝套件。
- `npm test`：exit 127，`vitest: not found`。沒有執行 Vitest 案例，不是測試斷言失敗，也不是通過。
- `npm run build`：exit 127，`tsc: not found`。沒有產生 dist 或完成型別檢查。
- GitHub `create_branch`：403 `Resource not accessible by integration`；重試後仍 403。Repository metadata 雖回報 push:true，不能證明 connector 的 GitHub App 具有實際 Contents 寫入權限。
- 補充交付：在使用者回報來源連結無法開啟後，GitHub 分支建立已成功，改透過 GitHub API 提交至 dev/mvp-v0.1-task002。上述 403 為先前執行結果，不再表示目前無法寫入。套件安裝與完整測試限制仍未解除。

## 審查與修正
由獨立 reviewer 進行唯讀靜態審查；未執行 UI／Dexie 測試。
- 修正 PWA React virtual module 的型別宣告：tsconfig 增加 vite-plugin-pwa/react。
- 改為保留換算精度，以免小份量反覆縮放丟失營養值；核心測試包含 100g→1g→100g。
- 對重量精度修正做回歸驗證：暫時恢復舊取整算法，該案例失敗；恢復修正後完整核心 21／21 通過。
- 目標保存成功訊息放到父層，避免表單換 key 後遺失提示。
- Zod 原始錯誤不直接顯示，統一轉為繁體中文欄位訊息。

## 尚未執行
- 完整 Vitest（React／Zod／Dexie 整合）。
- tsc 型別檢查、Vite／Tailwind 建置與 Service Worker 產物驗證。
- 實際照片成功解碼／壓縮、IndexedDB Blob 跨重啟保存。
- Android Chrome 相機、相簿、PWA 安裝、離線與版本更新。
- 完整依賴安全／授權檢查及 package-lock.json 建立。

## 部署判定
目前不建議開始部署測試版。先解除套件安裝與 GitHub 寫入限制，執行 npm test 和 npm run build，再完成 Android 受控測試。任何公開部署仍需另行授權。
