/**
 * LINE LIFF 身份綁定閘道 (Identity Gateway)
 * 
 * 核心邏輯：
 * 1. 初始化 LIFF SDK
 * 2. 取得 LINE 使用者資料
 * 3. 檢查使用者在該組織的註冊狀態 (is_registered)
 * 4. 若未註冊 -> 強制彈出 Onboarding 表單
 * 5. 完成註冊後 -> 放行進入系統
 * 
 * Multi-Tenancy 設計：
 * - 每個 LIFF App 對應一個 Organization (診所)
 * - Organization ID 從 LIFF App 的 URL 參數或環境變數取得
 * - 使用者可綁定多個 Organization
 */

import liff from '@line/liff';

// ============================================================================
// Types
// ============================================================================

export interface LiffProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
}

export interface OrganizationUser {
  organizationId: number;
  userId: number;
  role: 'admin' | 'staff' | 'customer';
  customerRealName: string | null;
  customerPhone: string | null;
  isBound: boolean;
}

export interface GatewayResult {
  isAuthenticated: boolean;
  isRegistered: boolean;
  requiresOnboarding: boolean;
  profile: LiffProfile | null;
  organizationUser: OrganizationUser | null;
  accessToken: string | null;
}

export interface UserRegistrationData {
  lineUserId: string;
  lineDisplayName: string;
  linePictureUrl?: string;
  realName: string;
  phone: string;
  organizationId: number;
}

// ============================================================================
// Configuration
// ============================================================================

const LIFF_ID = import.meta.env.VITE_LIFF_ID || '';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

/**
 * 從 URL 參數或環境變數取得當前 Organization ID
 * Multi-Tenancy 的關鍵：每個 LIFF App 對應一個診所
 */
export function getCurrentOrganizationId(): number {
  // 優先從 URL 參數取得 (支援動態切換)
  const urlParams = new URLSearchParams(window.location.search);
  const orgIdFromUrl = urlParams.get('org_id');
  if (orgIdFromUrl) {
    return parseInt(orgIdFromUrl, 10);
  }

  // 從環境變數取得 (LIFF App 預設綁定的組織)
  const orgIdFromEnv = import.meta.env.VITE_ORGANIZATION_ID;
  if (orgIdFromEnv) {
    return parseInt(orgIdFromEnv, 10);
  }

  // 預設為 1 (Flower Demo Clinic)
  return 1;
}

// ============================================================================
// LIFF SDK Wrapper
// ============================================================================

let isLiffInitialized = false;

/**
 * 初始化 LIFF SDK
 */
async function initializeLiff(): Promise<void> {
  if (isLiffInitialized) return;

  try {
    await liff.init({ liffId: LIFF_ID });
    isLiffInitialized = true;
  } catch (error) {
    console.error('LIFF initialization failed:', error);
    throw new Error('無法初始化 LINE 服務');
  }
}

/**
 * 取得 LINE 使用者資料
 */
async function getLiffProfile(): Promise<LiffProfile | null> {
  if (!liff.isLoggedIn()) {
    // 在 LIFF 環境中自動登入
    if (liff.isInClient()) {
      liff.login();
      return null;
    }
    // 在外部瀏覽器中導向登入
    liff.login({ redirectUri: window.location.href });
    return null;
  }

  try {
    const profile = await liff.getProfile();
    return {
      userId: profile.userId,
      displayName: profile.displayName,
      pictureUrl: profile.pictureUrl,
      statusMessage: profile.statusMessage,
    };
  } catch (error) {
    console.error('Failed to get LIFF profile:', error);
    return null;
  }
}

/**
 * 取得 LIFF Access Token
 */
function getLiffAccessToken(): string | null {
  return liff.getAccessToken();
}

// ============================================================================
// API Client
// ============================================================================

/**
 * 檢查使用者在指定組織的註冊狀態
 */
async function checkRegistrationStatus(
  lineUserId: string,
  organizationId: number,
  accessToken: string
): Promise<OrganizationUser | null> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/users/check-registration?lineUserId=${encodeURIComponent(lineUserId)}&organizationId=${organizationId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.status === 404) {
      return null; // 未註冊
    }

    if (!response.ok) {
      throw new Error('Failed to check registration status');
    }

    return await response.json();
  } catch (error) {
    console.error('Registration check failed:', error);
    return null;
  }
}

/**
 * 註冊新使用者並綁定組織
 */
export async function registerUser(data: UserRegistrationData): Promise<OrganizationUser> {
  const accessToken = getLiffAccessToken();
  if (!accessToken) {
    throw new Error('未取得授權，請重新登入');
  }

  const response = await fetch(`${API_BASE_URL}/api/users/register`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || '註冊失敗');
  }

  return await response.json();
}

// ============================================================================
// Identity Gateway (Main Entry Point)
// ============================================================================

/**
 * 身份綁定閘道 - 主要入口函數
 * 
 * 流程：
 * 1. 初始化 LIFF
 * 2. 取得 LINE 使用者資料
 * 3. 檢查該使用者在當前組織的註冊狀態
 * 4. 回傳閘道結果，由 UI 層決定是否顯示 Onboarding 表單
 */
export async function identityGateway(): Promise<GatewayResult> {
  const defaultResult: GatewayResult = {
    isAuthenticated: false,
    isRegistered: false,
    requiresOnboarding: false,
    profile: null,
    organizationUser: null,
    accessToken: null,
  };

  try {
    // Step 1: 初始化 LIFF
    await initializeLiff();

    // Step 2: 取得使用者資料
    const profile = await getLiffProfile();
    if (!profile) {
      // 使用者未登入或正在導向登入頁
      return defaultResult;
    }

    // Step 3: 取得 Access Token
    const accessToken = getLiffAccessToken();
    if (!accessToken) {
      return {
        ...defaultResult,
        profile,
      };
    }

    // Step 4: 檢查註冊狀態
    const organizationId = getCurrentOrganizationId();
    const organizationUser = await checkRegistrationStatus(
      profile.userId,
      organizationId,
      accessToken
    );

    const isRegistered = organizationUser !== null && organizationUser.isBound;

    return {
      isAuthenticated: true,
      isRegistered,
      requiresOnboarding: !isRegistered,
      profile,
      organizationUser,
      accessToken,
    };
  } catch (error) {
    console.error('Identity gateway error:', error);
    return defaultResult;
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * 登出
 */
export function logout(): void {
  if (liff.isLoggedIn()) {
    liff.logout();
    window.location.reload();
  }
}

/**
 * 關閉 LIFF 視窗
 */
export function closeLiff(): void {
  if (liff.isInClient()) {
    liff.closeWindow();
  }
}

/**
 * 分享訊息到 LINE 聊天室
 */
export async function shareMessage(text: string): Promise<void> {
  if (!liff.isInClient()) {
    throw new Error('此功能僅在 LINE 應用程式中可用');
  }

  await liff.shareTargetPicker([
    {
      type: 'text',
      text,
    },
  ]);
}
