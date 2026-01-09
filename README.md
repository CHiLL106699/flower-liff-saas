'''
# LINE-Native SaaS Platform - Flower Clinic LIFF

此專案為一個支援多租戶 (Multi-Tenancy) 的 LINE LIFF 應用程式，旨在提供醫美診所一套完整的 LINE 原生解決方案，包含身份綁定、預約管理等功能。

此版本為針對「花花醫美 (Flower Medical Clinic)」品牌客製化的粉色系主題。

## 技術棧

- **前端**: React, Vite, TypeScript, Tailwind CSS
- **後端服務**: Supabase (Database, Auth)
- **LINE 整合**: LINE Front-end Framework (LIFF)

## 核心架構

系統採用嚴格的多租戶架構，以 `organizations` 資料表作為租戶 (診所) 的管理核心。所有業務相關的資料表 (如 `users`, `appointments`, `treatments` 等) 都透過 `organization_id` 與之關聯，確保各租戶之間的資料嚴格隔離。

## 多租戶管理：如何手動新增第二家診所 (Tenant B)

當您需要為新的診所 (例如 Tenant B) 建立一個獨立的環境時，您需要手動在 Supabase 資料庫中新增一筆租戶資料。以下為操作步驟：

1.  **登入 Supabase 控制台**
    - 前往您的 [YOKAGE Supabase 專案](https://supabase.com/dashboard/project/atjbwafqvyqniyybagsm)。

2.  **前往 `organizations` 資料表**
    - 在左側選單中，點擊 `Table Editor`。
    - 從資料表清單中，選擇 `organizations`。

3.  **新增一筆資料 (Insert a new row)**
    - 點擊右上角的 `+ Insert row` 按鈕。
    - 填寫以下欄位：

| 欄位名稱 | 說明 | 範例值 |
| :--- | :--- | :--- |
| `name` | **(必填)** 診所的完整名稱。 | `'''Sparkle Aesthetics Clinic'''` |
| `slug` | **(必填, 唯一)** 診所的英文縮寫或代稱，將用於 URL 或內部識別。 | `'''sparkle-clinic'''` |
| `liff_id` | **(選填)** 為此診所專門建立的 LINE LIFF App ID。 | `'''1234567-abcdefg'''` |
| `primary_color` | **(選填)** 診所的品牌主色，用於未來動態調整 UI 主題。 | `'''#3b82f6'''` (藍色) |
| `is_active` | **(必填)** 設為 `true` 以啟用此診所。 | `true` |

4.  **儲存資料**
    - 點擊 `Save` 按鈕，即可完成新診所的建立。

完成以上步驟後，系統中就成功註冊了一家新的診所。後續您可以將此診所的 `organization_id` (即該筆資料的 `id`) 提供給對應的 LIFF 應用程式，以實現不同診所的資料綁定與隔離。

## 前端部署

此專案已配置 Netlify 自動化部署。當您將代碼推送到 GitHub 倉庫後，Netlify 將會自動建置並部署最新的版本。

- **部署環境**: Netlify
- **建置指令**: `npm run build`
- **發布目錄**: `dist`

### 環境變數

在 Netlify 站點的設定中，請確保已配置以下環境變數：

- `VITE_LIFF_ID`: 您的 LINE LIFF App ID。
- `VITE_SUPABASE_URL`: `https://atjbwafqvyqniyybagsm.supabase.co`
- `VITE_SUPABASE_ANON_KEY`: 您的 Supabase Public Anon Key。
- `VITE_ORGANIZATION_ID`: 對應的 `organizations` 資料表中的 `id`。

'''
