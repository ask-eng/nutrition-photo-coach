# 原始碼交付與遠端提交受阻

開發分支：`dev/mvp-v0.1-task002`。補充交付時 GitHub 寫入恢復，原始碼已透過 GitHub API 提交至此分支。瀏覽：https://github.com/ask-eng/nutrition-photo-coach/tree/dev/mvp-v0.1-task002

GitHub API 產生的遠端 Commit Hash 與較早本機 bundle 的 Commit 不同；原始碼交付以 GitHub 分支為準。完整建置與 Android 安裝仍未驗證。

本機 Git 已匯入原 Repository 的**完全相同** initial commit（包含原簽章）：`5f156e4b18c765f3afd8450e75c7a53d4571771f`，開發 commit 以此為 parent。沒有重寫或修改 main。現有 README 完整保留。

## 封裝
- `nutrition-photo-coach-task002.bundle`：原始 parent 與本機開發 commit。
- `nutrition-photo-coach-task002-source.zip`：原始碼，不包含 node_modules、dist 或 API Key。

## 在已有 Repository 的機器接續
先確認本機沒有同名分支或未提交修改，再執行：

```sh
git fetch /path/to/nutrition-photo-coach-task002.bundle dev/mvp-v0.1-task002:dev/mvp-v0.1-task002
git switch dev/mvp-v0.1-task002
npm install
npm run test:core
npm test
npm run build
git push -u origin dev/mvp-v0.1-task002
```

首次安裝後應提交審查過的 package-lock.json。不得把上述結果視為本次已執行；本次實際結果見 VERIFICATION.md。

## 需要補足的設定
GitHub App／連接工具必須被授權到 ask-eng/nutrition-photo-coach，且具有 Contents read/write；如無可用寫入範圍，可由有權限的本機 Git 使用者推送 bundle 中的開發分支。不要直接合併或推送 main。

雲端環境需修復 `proxy:8080` 的連線／沙箱網路權限並確保 registry.npmjs.org 可存取；不要取消代理或 TLS 驗證來繞過政策。
