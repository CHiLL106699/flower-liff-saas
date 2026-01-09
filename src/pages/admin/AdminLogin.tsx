import { useState } from 'react';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Settings, Eye, EyeOff, AlertCircle } from 'lucide-react';

interface AdminLoginProps {
  onLoginSuccess?: () => void;
}

export function AdminLogin({ onLoginSuccess }: AdminLoginProps) {
  const { login, isLoading, error } = useAdminAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!email || !password) {
      setLocalError('請輸入帳號和密碼');
      return;
    }

    const result = await login(email, password);
    if (result.success) {
      onLoginSuccess?.();
    } else {
      setLocalError(result.error || '登入失敗');
    }
  };

  const displayError = localError || error;

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-rose-50 flex items-center justify-center p-4">
      {/* 背景裝飾 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-rose-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo 區域 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-500 shadow-lg shadow-pink-500/30 mb-4">
            <Settings className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">管理後台</h1>
          <p className="text-slate-500 mt-1">Flower Demo Clinic</p>
        </div>

        {/* 登入卡片 */}
        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl text-center">員工登入</CardTitle>
            <CardDescription className="text-center">
              請使用您的員工帳號登入系統
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 錯誤訊息 */}
              {displayError && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{displayError}</span>
                </div>
              )}

              {/* Email 輸入 */}
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-slate-700">
                  電子郵件
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  autoComplete="email"
                />
              </div>

              {/* 密碼輸入 */}
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-slate-700">
                  密碼
                </label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="請輸入密碼"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    autoComplete="current-password"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* 登入按鈕 */}
              <Button
                type="submit"
                className="w-full h-12 text-base"
                isLoading={isLoading}
                disabled={isLoading}
              >
                {isLoading ? '登入中...' : '登入'}
              </Button>
            </form>

            {/* 分隔線 */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-slate-400">測試帳號</span>
              </div>
            </div>

            {/* 測試帳號提示 */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setEmail('admin@flower.clinic');
                  setPassword('admin123456');
                }}
                className="p-3 rounded-lg border border-pink-200 hover:bg-pink-50 transition-colors text-left"
              >
                <div className="text-xs font-medium text-pink-600">管理員</div>
                <div className="text-xs text-slate-500 mt-0.5">admin@flower.clinic</div>
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmail('staff@flower.clinic');
                  setPassword('staff123456');
                }}
                className="p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors text-left"
              >
                <div className="text-xs font-medium text-slate-600">員工</div>
                <div className="text-xs text-slate-500 mt-0.5">staff@flower.clinic</div>
              </button>
            </div>
          </CardContent>
        </Card>

        {/* 版權資訊 */}
        <p className="text-center text-xs text-slate-400 mt-6">
          © 2026 Flower LIFF SaaS Platform
        </p>
      </div>
    </div>
  );
}

export default AdminLogin;
