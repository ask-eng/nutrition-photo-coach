# Task #004 受控 Preview：部署前驗證完成，Pages 設定受阻

日期：2026-10-14。部署來源只使用 dev/mvp-v0.1-task002，未合併或修改 main。

## 實際結果
- 起始 CI：38543653083，成功，Commit 9eefc751ae00ddb958f0cff4490905db83e58d2e。
- Preview 候選 Commit：05a884293762be64609d0ec971ebc0f5aed97ec2。
- 一般 CI：https://github.com/ask-eng/nutrition-photo-coach/actions/runs/38561584084 （成功）。
- Preview Workflow：https://github.com/ask-eng/nutrition-photo-coach/actions/runs/38561584214 （build 成功，deploy 失敗）。
- npm ci、TypeScript、Vitest 39／39、核心 24／24、Production Build、16 項 SW precache 均成功。
- 8 個建置文字資產的有限憑證／真實 AI 端點掃描成功，靜態產物不包含使用者 IndexedDB 紀錄或照片。

## 路徑驗證
PWA_BASE_PATH=/nutrition-photo-coach/。
Vite base、manifest id／start_url／scope、圖示路徑、SW 註冊與 scope、navigateFallback 都限定此子目錄。預設本機根目錄建置仍能成功。
GitHub Pages 支援純靜態 Vite PWA，但不能提供服務端 AI API，也不提供此公開 Repository 的密碼保護。此測試版仍只有明確標示的 Mock。

## 阻礙與設定
configure-pages 回傳：Get Pages site failed；HttpError: Not Found。
Repository 回報 has_pages=false。現有 GitHub 連接工具不支援修改 Pages 管理端點；GITHUB_TOKEN 亦不能自動啟用 Pages，因此沒有略過權限或添加憑證。

請在 https://github.com/ask-eng/nutrition-photo-coach/settings/pages 將 Source 設為 GitHub Actions。若 github-pages 環境有部署分支限制，僅允許 dev/mvp-v0.1-task002。不要為此改 main。
設定完成後在上述 Preview run 重跑失敗 jobs 或通知 Codex 重跑；成功的 build artifact 可供同次 run 使用。

## URL 與驗收
實際可用 Preview URL：尚未建立，不能宣稱已部署。
設定成功後預期網址為 https://ask-eng.github.io/nutrition-photo-coach/，必須以 deploy-pages 回傳及 HTTPS 資源檢查確認後交付。
Android 相機、相簿、PWA 安裝、離線、資料跨重開保存皆尚未實機確認，操作 SOP 見 ANDROID_ACCEPTANCE_TASK004.md。
