/**
 * Onboarding Gate Component - Flower Pink Theme
 * 
 * 身份綁定閘道的 React 元件實作
 * 攔截所有未註冊使用者，強制完成 Onboarding 流程
 * 
 * Theme: Flower Pink (粉色系 - 適合花花醫美品牌)
 */

import React, { useState, useEffect, ReactNode } from 'react';
import {
  identityGateway,
  registerUser,
  GatewayResult,
  LiffProfile,
  UserRegistrationData,
  getCurrentOrganizationId,
} from '../lib/liff-auth';

// Props Types
interface OnboardingGateProps {
  children: ReactNode;
  loadingComponent?: ReactNode;
  onAuthSuccess?: (result: GatewayResult) => void;
  onRegistrationComplete?: (result: GatewayResult) => void;
}

interface OnboardingFormData {
  realName: string;
  phone: string;
}

// Loading Spinner Component - Flower Pink Theme
const DefaultLoadingComponent: React.FC = () => (
  <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-pink-50 to-white">
    <div className="text-center">
      <div className="w-16 h-16 border-4 border-pink-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
      <p className="text-slate-700 text-lg font-medium">正在驗證身份...</p>
    </div>
  </div>
);

// Onboarding Modal Component - Flower Pink Theme
interface OnboardingModalProps {
  profile: LiffProfile;
  onSubmit: (data: OnboardingFormData) => Promise<void>;
  isSubmitting: boolean;
  error: string | null;
}

const OnboardingModal: React.FC<OnboardingModalProps> = ({
  profile,
  onSubmit,
  isSubmitting,
  error,
}) => {
  const [formData, setFormData] = useState<OnboardingFormData>({
    realName: '',
    phone: '',
  });
  const [validationErrors, setValidationErrors] = useState<Partial<OnboardingFormData>>({});

  const validateForm = (): boolean => {
    const errors: Partial<OnboardingFormData> = {};

    if (!formData.realName.trim()) {
      errors.realName = '請輸入真實姓名';
    } else if (formData.realName.trim().length < 2) {
      errors.realName = '姓名至少需要 2 個字';
    }

    if (!formData.phone.trim()) {
      errors.phone = '請輸入手機號碼';
    } else if (!/^09\d{8}$/.test(formData.phone.trim())) {
      errors.phone = '請輸入有效的台灣手機號碼 (09xxxxxxxx)';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      await onSubmit(formData);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-pink-900/30 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-pink-100">
        {/* Header - Flower Pink Gradient */}
        <div className="bg-gradient-to-r from-pink-400 to-rose-400 px-6 py-8 text-white text-center">
          {profile.pictureUrl && (
            <img
              src={profile.pictureUrl}
              alt={profile.displayName}
              className="w-20 h-20 rounded-full mx-auto mb-4 border-4 border-white/40 shadow-lg"
            />
          )}
          <h2 className="text-xl font-bold mb-1">歡迎，{profile.displayName}！</h2>
          <p className="text-pink-100 text-sm">請完成以下資料以開始使用服務</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 bg-gradient-to-b from-white to-pink-50/30">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          {/* Real Name Input */}
          <div>
            <label htmlFor="realName" className="block text-sm font-medium text-slate-700 mb-1.5">
              真實姓名 <span className="text-pink-500">*</span>
            </label>
            <input
              type="text"
              id="realName"
              value={formData.realName}
              onChange={(e) => setFormData({ ...formData, realName: e.target.value })}
              placeholder="請輸入您的真實姓名"
              className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-pink-400 focus:border-pink-400 transition-colors bg-white ${
                validationErrors.realName ? 'border-red-300 bg-red-50' : 'border-pink-200'
              }`}
              disabled={isSubmitting}
            />
            {validationErrors.realName && (
              <p className="mt-1.5 text-sm text-red-600">{validationErrors.realName}</p>
            )}
          </div>

          {/* Phone Input */}
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-slate-700 mb-1.5">
              手機號碼 <span className="text-pink-500">*</span>
            </label>
            <input
              type="tel"
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="09xxxxxxxx"
              className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-pink-400 focus:border-pink-400 transition-colors bg-white ${
                validationErrors.phone ? 'border-red-300 bg-red-50' : 'border-pink-200'
              }`}
              disabled={isSubmitting}
            />
            {validationErrors.phone && (
              <p className="mt-1.5 text-sm text-red-600">{validationErrors.phone}</p>
            )}
          </div>

          {/* Submit Button - Flower Pink Gradient */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-gradient-to-r from-pink-500 to-rose-400 text-white py-3.5 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                處理中...
              </span>
            ) : (
              '確認送出'
            )}
          </button>

          {/* Privacy Notice */}
          <p className="text-xs text-slate-500 text-center">
            點擊「確認送出」即表示您同意我們的
            <a href="#" className="text-pink-500 hover:underline">服務條款</a>
            與
            <a href="#" className="text-pink-500 hover:underline">隱私權政策</a>
          </p>
        </form>
      </div>
    </div>
  );
};

// Main OnboardingGate Component
export const OnboardingGate: React.FC<OnboardingGateProps> = ({
  children,
  loadingComponent,
  onAuthSuccess,
  onRegistrationComplete,
}) => {
  const [gatewayResult, setGatewayResult] = useState<GatewayResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registrationError, setRegistrationError] = useState<string | null>(null);

  // 執行身份閘道檢查
  useEffect(() => {
    const runGateway = async () => {
      try {
        const result = await identityGateway();
        setGatewayResult(result);

        if (result.isAuthenticated && result.isRegistered) {
          onAuthSuccess?.(result);
        }
      } catch (error) {
        console.error('Gateway error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    runGateway();
  }, [onAuthSuccess]);

  // 處理註冊表單提交
  const handleRegistrationSubmit = async (formData: { realName: string; phone: string }) => {
    if (!gatewayResult?.profile) return;

    setIsSubmitting(true);
    setRegistrationError(null);

    try {
      const registrationData: UserRegistrationData = {
        lineUserId: gatewayResult.profile.userId,
        lineDisplayName: gatewayResult.profile.displayName,
        linePictureUrl: gatewayResult.profile.pictureUrl,
        realName: formData.realName.trim(),
        phone: formData.phone.trim(),
        organizationId: getCurrentOrganizationId(),
      };

      const organizationUser = await registerUser(registrationData);

      // 更新閘道結果
      const newResult: GatewayResult = {
        ...gatewayResult,
        isRegistered: true,
        requiresOnboarding: false,
        organizationUser,
      };

      setGatewayResult(newResult);
      onRegistrationComplete?.(newResult);
    } catch (error) {
      setRegistrationError(
        error instanceof Error ? error.message : '註冊失敗，請稍後再試'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // 載入中狀態 - Flower Pink Theme
  if (isLoading) {
    return <>{loadingComponent || <DefaultLoadingComponent />}</>;
  }

  // 未認證 (LIFF 初始化失敗或未登入) - Flower Pink Theme
  if (!gatewayResult?.isAuthenticated) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-pink-50 to-white p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center border border-pink-100">
          <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-700 mb-2">無法驗證身份</h2>
          <p className="text-slate-500 mb-6">請確保您是從 LINE 應用程式開啟此頁面</p>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-gradient-to-r from-pink-500 to-rose-400 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all"
          >
            重新嘗試
          </button>
        </div>
      </div>
    );
  }

  // 需要 Onboarding (未註冊)
  if (gatewayResult.requiresOnboarding && gatewayResult.profile) {
    return (
      <OnboardingModal
        profile={gatewayResult.profile}
        onSubmit={handleRegistrationSubmit}
        isSubmitting={isSubmitting}
        error={registrationError}
      />
    );
  }

  // 已認證且已註冊 - 放行
  return <>{children}</>;
};

// Context for accessing gateway result in child components
interface OnboardingContextValue {
  gatewayResult: GatewayResult | null;
  profile: LiffProfile | null;
  organizationId: number;
}

const OnboardingContext = React.createContext<OnboardingContextValue>({
  gatewayResult: null,
  profile: null,
  organizationId: 1,
});

export const useOnboarding = () => React.useContext(OnboardingContext);

// Provider wrapper for accessing gateway data
export const OnboardingProvider: React.FC<OnboardingGateProps> = ({
  children,
  ...props
}) => {
  const [contextValue, setContextValue] = useState<OnboardingContextValue>({
    gatewayResult: null,
    profile: null,
    organizationId: getCurrentOrganizationId(),
  });

  const handleAuthSuccess = (result: GatewayResult) => {
    setContextValue({
      gatewayResult: result,
      profile: result.profile,
      organizationId: getCurrentOrganizationId(),
    });
    props.onAuthSuccess?.(result);
  };

  const handleRegistrationComplete = (result: GatewayResult) => {
    setContextValue({
      gatewayResult: result,
      profile: result.profile,
      organizationId: getCurrentOrganizationId(),
    });
    props.onRegistrationComplete?.(result);
  };

  return (
    <OnboardingContext.Provider value={contextValue}>
      <OnboardingGate
        {...props}
        onAuthSuccess={handleAuthSuccess}
        onRegistrationComplete={handleRegistrationComplete}
      >
        {children}
      </OnboardingGate>
    </OnboardingContext.Provider>
  );
};

export default OnboardingGate;
