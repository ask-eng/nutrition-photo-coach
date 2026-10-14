# 開發與手機測試

此版本只使用固定 Mock 範例，不會辨識照片內容或呼叫真實 AI。

## 安裝與執行
需求 Node.js >= 22.12（本次原生核心測試使用 Node.js 24.19）。

```sh
npm ci
npm run test:core
npm test
npm run build
npm run dev
```

Task #003 已透過 GitHub Actions 的實際 npm install 產生 package-lock.json 並提交；接續安裝使用 npm ci。雲端工作區的 proxy 限制仍存在，但不影響 GitHub Actions runner。

`npm run dev` 僅綁定 localhost，不公開服務。PWA Service Worker 在開發模式關閉；需先成功 build，再執行 `npm run preview` 驗證建置產物。

## Android PWA 驗收（本次未執行）
- 使用可信 HTTPS 的受控測試網址；或利用 Android USB 遠端偵錯的 localhost port forwarding，在手機 Chrome 開啟 localhost。一般區域網路 HTTP 不符合完整 PWA／安全情境條件。
- 安裝至主畫面，確認圖示、繁中名稱及 standalone。
- 完整載入一次後關閉網路，重開 App、查看紀錄、建立 Mock／手動餐點並修改。
- 拍照、相簿選取、重新選取及拒絕權限／HEIC 的錯誤處理。
- 關閉 App 再開啟，餐點與目標仍保留。
- 草稿未保存前不計入，連按保存不重複；跨日期修改總量立即刷新。
- 修改目標生效日，不改變早於該日的比較。
- 確認刪除只影響指定餐點，取消不刪除。
- 清除網站資料可能造成資料遺失，先匯出 JSON 備份；本版無匯入或跨裝置同步。

## 真實 AI 接入邊界
`src/analysis/provider.ts` 定義分析介面。本版只有 Mock adapter；未來需另授權後端 API、配額與憑證。API Key 只能放後端秘密設定，不放前端／VITE 變數／GitHub。
