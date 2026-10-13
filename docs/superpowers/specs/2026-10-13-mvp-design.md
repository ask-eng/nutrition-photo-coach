# Nutrition Photo Coach v0.1 設計

依 Implementation Task #002 直接實作已核准方案 C，不重新要求設計批准。

## 範圍
繁體中文 Android 手機 PWA：拍照或選圖、預覽、明確標示 Mock 的多食物草稿、修改食物名稱／重量／熱量與三大營養素、確認保存、日期統計、增肌／減脂手動目標、歷史修改及刪除。本版本不辨識照片真實內容、不呼叫任何 AI API、不部署。

## 架構
React／TypeScript／Vite／Tailwind。純 TypeScript 營養與本機日期模組；Zod 驗證食材、餐點、目標；Dexie IndexedDB 儲存餐點與日期化目標。AnalysisProvider 僅接入 Mock，可另實作經授權的後端 adapter。vite-plugin-pwa 生成 manifest 與 Service Worker。

## 行為
- 餐點食材數量至少一項，重量 > 0，营養值為有限非負數。單次照片最大 10MB；壓縮成 JPEG 最長邊 1280px，保存縮圖，不保存原图。
- 修改重量依目前确认的營養值等比例換算；直接修改营養值後，下一次重量換算以該值為基準。刪除食材按穩定 ID，不按位置索引。
- AI 草稿未確認不寫入 DB、不計入每日總量；保存與刪除有忙碌鎖，成功前不顯示成功訊息。
- 餐點使用使用者選定的 YYYY-MM-DD 與 HH:mm，本機时區另記錄；不用 UTC 截字推算飲食日期。修改餐點可換日期；即時刷新统计。
- 目標保存生效日期，歷史選用當日以前最近的目標。首次沒有目標顯示待設定，不以預設值冒充已設定。
- 歷史刪除需使用者確認，只刪指定餐點，不自動清空資料。新版本升級只增加 schema，不刪 DB。
- 離線可手動記錄、使用 Mock 及查看已存紀錄。更新不自動重載頁面，使用者完成草稿後才接受更新。
- 瀏覽器储存可能清除，介面提供 JSON 備份匯出；不做跨裝置同步。

## 开源來源
轉化 fud-ai MIT MealIngredient 的 scaling／totals，參考 Flutter MIT Meal／DiaryDay 的餐點日期分組；不複製 Kotlin／Dart UI、圖片、食物資料庫、BYOK 或訂閱程式。

## 驗證
共同核心案例由 Vitest 及 Node 原生 runner 執行；Dexie 測試使用 fake-indexeddb。React 測試涵蓋草稿不計入、修正保存、歷史編輯／刪除。完整驗收另需 npm build、實際 Android 安裝與 HTTPS 離線測試，未執行不得宣稱通過。
