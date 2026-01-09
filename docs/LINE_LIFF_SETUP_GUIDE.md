# LINE LIFF 應用程式配置與部署教學

## 摘要

本文件旨在提供一個完整的教學，說明如何將您的 Web 應用程式配置為 LINE LIFF (LINE Front-end Framework) 應用程式，並與 Supabase 後端進行整合。我們將涵蓋從建立 LINE Provider 和 Channel，到設定 LIFF 應用程式，再到部署至 Netlify/Vercel，以及最終在 LINE 官方帳號中使用的完整流程。

## 第一部分：LINE 開發者後台配置

### 步驟一：建立 Provider

1.  **登入 LINE Developers Console**: 前往 [https://developers.line.biz/](https://developers.line.biz/) 並使用您的 LINE 帳號登入。
2.  **建立 Provider**: 如果您還沒有 Provider，請點擊「Create a new provider」，輸入您想要的名稱 (例如：您的公司或品牌名稱)，然後點擊「Create」。

### 步驟二：建立 LINE Login Channel

1.  **選擇 Provider**: 在您剛建立的 Provider 中，點擊「Create a new channel」。
2.  **選擇 Channel Type**: 選擇「LINE Login」。
3.  **填寫 Channel 資訊**:
    *   **Channel type**: LINE Login (已選定)
    *   **Provider**: 您剛建立的 Provider (已選定)
    *   **Region**: Taiwan
    *   **Channel icon**: 上傳您的品牌 Logo。
    *   **Channel name**: 輸入您的應用程式名稱 (例如：Flower Demo Clinic 預約系統)。
    *   **Channel description**: 輸入應用程式的簡短描述。
    *   **App types**: 選擇「Web app」。
    *   **Email address**: 輸入您的聯絡信箱。
    *   **Privacy policy URL** (非必填): 如果有隱私權政策頁面，請填寫。
    *   **Terms of use URL** (非必填): 如果有服務條款頁面，請填寫。
4.  **同意條款**: 勾選同意 LINE 開發者協議，然後點擊「Create」。

### 步驟三：設定 LINE Login Channel

1.  **進入 Channel**: 點擊您剛建立的 LINE Login Channel。
2.  **啟用 LINE Login**: 在「LINE Login」頁籤中，確認 LINE Login 功能已啟用。
3.  **設定 Callback URL**: 在「LINE Login」頁籤的「Callback URL」區塊，點擊「Edit」，並填入您的 Web 應用程式的 URL。**由於您同時使用 Netlify 和 Vercel，請將兩個 URL 都加入**。
    *   `https://flower-liff-saas.netlify.app/`
    *   `https://flower-liff-saas.vercel.app/`

### 步驟四：建立 LIFF 應用程式

1.  **進入 LIFF 頁籤**: 在您的 LINE Login Channel 中，點擊「LIFF」頁籤。
2.  **新增 LIFF App**: 點擊「Add」。
3.  **填寫 LIFF App 資訊**:
    *   **LIFF app name**: 輸入您的 LIFF 應用程式名稱 (例如：Flower Clinic 預約)。
    *   **Size**: 選擇「Full」。
    *   **Endpoint URL**: 填入您的**主要** Web 應用程式 URL (例如：`https://flower-liff-saas.netlify.app`)。
    *   **Scopes**: 勾選 `profile` 和 `openid`。這將允許您的應用程式獲取用戶的 LINE 個人資料。
    *   **Bot link feature**: 選擇「On (Normal)」。這將在 LIFF 應用程式的標頭顯示一個按鈕，讓用戶可以將您的官方帳號加為好友。
    *   **Scan QR**: 保持「Off」。
    *   **Module mode**: 保持「Off」。
4.  **儲存設定**: 點擊「Add」以儲存您的 LIFF 應用程式。

### 步驟五：取得 LIFF ID

1.  **複製 LIFF ID**: 在 LIFF 應用程式列表中，您會看到剛建立的應用程式。複製其「LIFF ID」。

## 第二部分：前端與後端環境變數設定

### 步驟一：設定前端環境變數

您需要在 Netlify 和 Vercel 的專案設定中，加入以下環境變數：

| 變數名稱 | 變數值 | 說明 |
|---|---|---|
| `VITE_LIFF_ID` | 您剛複製的 LIFF ID | 用於初始化 LIFF SDK |
| `VITE_SUPABASE_URL` | `https://atjbwafqvyqniyybagsm.supabase.co` | 您的 Supabase 專案 URL |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0amJ3YWZxdnlxbml5eWJhZ3NtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5MTg1MDcsImV4cCI6MjA4MzQ5NDUwN30.iFYUd-dwha6nmPyCoqSS3-mWciozxXIBHvldTbvMkxo` | 您的 Supabase 公開金鑰 |
| `VITE_ORGANIZATION_ID` | `1` | 您要操作的組織 ID |

**Netlify 設定方式**:
1.  前往 Netlify 儀表板，選擇您的專案。
2.  點擊「Site settings」 > 「Build & deploy」 > 「Environment」。
3.  在「Environment variables」區塊，點擊「Edit variables」，並逐一加入上述變數。

**Vercel 設定方式**:
1.  前往 Vercel 儀表板，選擇您的專案。
2.  點擊「Settings」 > 「Environment Variables」。
3.  逐一加入上述變數。

### 步驟二：重新部署

設定完環境變數後，請務必在 Netlify 和 Vercel 上**重新觸發部署 (Redeploy)**，以確保新的環境變數生效。

## 第三部分：LINE 官方帳號整合

### 步驟一：建立圖文選單 (Rich Menu)

1.  **登入 LINE Official Account Manager**: 前往 [https://manager.line.biz/](https://manager.line.biz/)。
2.  **選擇您的官方帳號**。
3.  **前往圖文選單頁面**: 在左側選單中，點擊「聊天室相關」 > 「圖文選單」。
4.  **建立新選單**: 點擊「建立」。
5.  **設定選單內容**:
    *   **標題**: 輸入選單標題 (例如：主選單)。
    *   **使用期間**: 設定您希望選單顯示的時間。
    *   **選單列顯示文字**: 輸入顯示在底部的文字 (例如：點此開啟選單)。
    *   **預設顯示方式**: 選擇「顯示」。
6.  **設計選單版面**:
    *   點擊「選擇版型」，選擇您想要的版型 (例如：六宮格)。
    *   上傳您設計好的圖文選單圖片。
7.  **設定按鈕動作**:
    *   點擊每個按鈕區塊，設定其「類型」為「連結」。
    *   在「連結」欄位中，貼上您的 **LIFF URL** (格式為 `https://liff.line.me/{您的 LIFF ID}` )。
8.  **儲存選單**: 點擊「儲存」。

### 步驟二：啟用圖文選單

儲存後，您的圖文選單將在您設定的時間內，自動顯示在所有用戶的聊天室中。

## 第四部分：完整流程驗證

1.  **開啟 LINE App**: 在您的手機上開啟 LINE。
2.  **進入您的官方帳號聊天室**。
3.  **點擊圖文選單**: 點擊您剛設定的圖文選單按鈕。
4.  **LIFF 應用程式啟動**: 您的 Web 應用程式應該會在 LINE 的內建瀏覽器中開啟。
5.  **身份驗證**: 應用程式會自動透過 LIFF SDK 進行登入，並顯示註冊表單或已登入的畫面。
6.  **功能測試**: 測試預約、查詢等功能是否正常運作。

## 結論

透過以上步驟，您已成功將您的 Web 應用程式與 LINE LIFF 進行深度整合，並透過 Supabase 實現了安全、可擴展的後端服務。這套架構不僅提供了流暢的使用者體驗，也為未來的多租戶 SaaS 平台奠定了穩固的基礎。
