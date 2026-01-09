# 競品分析與 LIFF 整合策略研究

## 一、夯客 (HungK / HOTCAKE) 分析

### 商業模式
- **定位**: 專為美業設計的 SaaS 預約與經營管理系統
- **目標客群**: 美髮沙龍、美甲美睫、健身瑜伽、醫美診所
- **估值**: 已突破新台幣 1 億元 (Pre-A 輪募資超過百萬美元)
- **續訂率**: 98% (極高客戶黏著度)

### LINE 整合策略
1. **圖文選單建置**: 快速建置商家專屬圖文選單
2. **LINE 通知與提醒**: 透過 LINE 發送預約提醒和通知訊息
3. **分眾行銷**: 會員標籤分級，精準廣告投放
4. **會員入口**: 用 LINE 打造專屬會員入口
   - 即時線上預約
   - 會員註冊與查詢預約紀錄
   - 整合儲值金、紅利點數機制

### 技術架構特點
- 使用 LINE 官方帳號 Marketplace 外掛模組
- **重要限制**: 若同時使用 Messaging API，外掛模組可能無法正常運行
- 需確保 Webhook 停用或回應模式設為聊天模式
- 不建議同時訂閱多個外掛模組

---

## 二、Super8 Studio 分析

### 商業模式
- **定位**: AI Agent x CRM 解決方案 (AaaS - AI-as-a-Service)
- **核心功能**: 
  - 多渠道訊息整合 (LINE、Instagram、Facebook)
  - 聊天機器人自動篩選 30%+ 訊息
  - AI Copilot 工作效率提升

### LINE 整合策略
1. **多官方帳號管理**: 快速切換多個 LINE 官方帳號
2. **訊息中心**: 統一掌握多渠道訊息
3. **聊天機器人**: 有效篩選訊息，減輕客服負擔
4. **LIFF 整合**: 提供 InsightArk 功能

### LIFF 設置流程 (Super8 教學)
1. 登入 LINE Developer
2. 點選串接 Super 8 的 Channel
3. 點擊 Create a new channel
4. 選擇 LINE Login 並輸入相關資訊
5. 在 LIFF 頁籤新增 LIFF 應用
6. 填入 Endpoint URL 等欄位
7. 複製 LIFF 網址貼上聊天機器人卡片

---

## 三、LINE LIFF 技術架構分析

### LIFF SDK 核心概念
- LIFF (LINE Front-end Framework) 是 LINE 官方提供的前端應用程式框架
- 可在 LINE APP 內直接操作網頁
- 透過 JS SDK 獲取使用者資訊

### 初始化流程
```javascript
liff.init({
  liffId: "1234567890-AbcdEfgh",
  withLoginOnExternalBrowser: true // 外部瀏覽器自動登入
})
.then(() => {
  // 開始使用 LIFF API
})
```

### 關鍵 API
1. **liff.init()**: 初始化 LIFF 應用，必須在每個頁面執行
2. **liff.getProfile()**: 獲取用戶 LINE 資料
3. **liff.sendMessages()**: 發送訊息到聊天室
4. **liff.isLoggedIn()**: 檢查登入狀態
5. **liff.login()**: 執行登入流程

### 重要注意事項
- LIFF 應用必須在每次開啟頁面時初始化
- 即使在同一 LIFF 應用內轉換頁面，也需重新執行 liff.init()
- 外部瀏覽器需設定 withLoginOnExternalBrowser: true

---

## 四、Supabase RLS 多租戶安全策略

### 核心原則
- RLS (Row Level Security) 是 PostgreSQL 原生功能
- 提供深度防禦，即使透過第三方工具存取也能保護資料

### 多租戶實作模式
1. **organization_id 隔離**: 所有資料表包含 organization_id
2. **策略設計**:
   - 讀取: 只能讀取自己組織的資料
   - 寫入: 只能在自己組織建立資料
   - 更新: 只能更新自己組織的資料

### 常見錯誤
- 只依賴前端隱藏按鈕控制存取
- 未在資料庫端設定 RLS 策略
- 使用過於寬鬆的策略 (如 USING (true))

### 最佳實踐
1. 使用 Security Definer Functions 處理跨表操作
2. 透過 RPC 函數封裝敏感邏輯
3. 建立 Security Definer Views 提供安全的資料存取
4. 絕不將 SERVICE_ROLE_KEY 暴露於前端

---

## 五、競品差異化策略建議

### 對標夯客
- 夯客專注美業垂直市場
- 我們可擴展至更廣泛的醫美/診所市場
- 強調多租戶 SaaS 架構的彈性

### 對標 Super8
- Super8 強調 AI 自動化
- 我們可專注於「LINE 即作業系統」的深度整合
- 提供更專業的醫美業務邏輯 (排班、庫存、療程管理)

### 核心競爭優勢
1. **嚴格多租戶架構**: 從第一天起就支援 100+ 診所
2. **身份綁定閘道**: 強制用戶註冊，確保資料完整性
3. **邏輯驅動預約**: 自動檢查排班與庫存
4. **深度 LIFF 整合**: 所有功能都在 LINE 內完成
