# 第三方來源與授權

本專案僅轉化下列 MIT 授權的資料模型與計算邏輯，不移植 Kotlin／Dart UI、不使用上游圖像、訓練模型、食物資料庫、訂閱服務或 API Key 儲存方式。

## fud-ai
- Repository: https://github.com/apoorvdarshan/fud-ai
- 固定來源 Commit: `ef9e1d1e77ebf306d5a8038b73a02d90bc51cbed`
- 來源: `android/app/src/main/java/com/apoorvdarshan/calorietracker/models/MealIngredient.kt`
- 套用位置: `src/domain/types.ts`、`src/domain/nutrition.ts`
- 轉化內容: 食材名稱、克數、四項營養欄位；按份量比例換算与項目加總。
- 差異: 增加穩定 ID、有限非負數檢查；營養結果保留小數而非把熱量提前取整。
- Copyright (c) 2026 Apoorv Darshan
- 完整 MIT: `licenses/fud-ai-MIT.txt`

## Calorie-AI-Nutrition-Tracker
- Repository: https://github.com/priyanshu0508/Calorie-AI-Nutrition-Tracker
- 固定來源 Commit: `1620cee2f515409bc695614cc673bcbbdf506636`
- 來源: `lib/models/meal.dart`、`lib/models/diary_day.dart`
- 套用位置: `src/domain/types.ts`、`src/domain/nutrition.ts`
- 轉化內容: 餐別、餐點食材集合、單餐與每日营養加總概念。
- 差異: 飲食日期與時間分開保存；不使用 UTC 截字作為當地飲食日。不移植畫面占比估重算法。
- Copyright (c) 2026 Priyanshu Saurabh
- 完整 MIT: `licenses/calorie-ai-nutrition-tracker-MIT.txt`

## 其他依賴
React／React DOM、Vite、TypeScript、Tailwind、Dexie、Zod、Vitest、vite-plugin-pwa、測試工具依 `package.json` 安裝。尚未成功安裝依賴，因此完整鎖檔及間接依賴授權清單仍待建立。原創圖示由本專案生成，未引用第三方圖片或字型檔。

其他審查候選沒有被移植；未使用授權不明程式碼。
