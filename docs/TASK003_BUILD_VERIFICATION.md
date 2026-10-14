# Task #003：建置恢復與驗證

日期：2026-10-14。目標分支：dev/mvp-v0.1-task002。

## 原始碼完整性
起始遠端 Commit：88e5fd978227a5eac98b0c3f54cc02364b88d44c。
47 個檔案與本機逐一以 Git blob SHA 比對，無不一致。未重新開發 MVP、未修改 main。

## 執行環境
Codex 工作區 npm ping 仍收到 EPERM（連接代理 172.31.11.205:8080 被拒絕）；離線安裝收到 ENOTCACHED。沒有取消代理或 TLS 驗證，也沒有持續重試。

採用 GitHub Actions 公開 Repository 的標準 Ubuntu runner，不部署、不呼叫 AI、不使用付費服務。驗證流程只有 Contents read 權限。

## 實際成功紀錄
- 第一輪：https://github.com/ask-eng/nutrition-photo-coach/actions/runs/38543084146
- 鎖檔取得輪：https://github.com/ask-eng/nutrition-photo-coach/actions/runs/38543371355
- Runner：Node.js 24.21.0、npm 11.19.0。
- npm install：成功，第一輪安裝 453 個套件。
- 原生核心：21／21 通過。
- TypeScript：npx --no-install tsc --noEmit 通過，無型別錯誤。
- Vitest：5 個測試檔、36／36 通過、0 失敗；包含 React、Zod、Dexie、Mock 及共用核心案例。
- Production Build：npm run build 通過，產生 dist。
- PWA：manifest.webmanifest、zh-Hant、standalone、192／512 圖示、maskable、sw.js 與 app shell 預快取檢查通過；Workbox 預快取 16 項。

## 鎖檔
package-lock.json 由第二輪實際安裝產生，並從 runner 紀錄無損取回；不是手寫依賴解算。lockfileVersion 3，525 個 package entries（包含平台選用套件）；SHA256：b9d031c6a223a0b35a3ccaedaa9646947370407cd2a0bfd896721cb9a96badc3。
後續 CI 改為 npm ci，驗證精確鎖定版本；請查看本分支最新 Build verification 結果。

## 警告與限制
安裝有間接依賴 glob 的棄用警告、esbuild install-scripts 提示；建置有 Zod 註解 PURE annotation 警告，Rollup 已移除相關註解。均未造成驗證失敗；本次不等於完整依賴安全稽核。

已具備部署到受控 HTTPS 測試環境的建置產物條件，但本次沒有部署，也不代表 Android 實機驗收完成。仍需測試 Android 安裝、相機、離線重開、照片解碼與 IndexedDB Blob 保存及 Service Worker 更新生命週期。
