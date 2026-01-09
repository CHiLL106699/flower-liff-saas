/**
 * Admin Login Page - 管理員登入頁面
 * 
 * 支援登入與註冊功能
 * 使用 Supabase Auth 進行真實驗證
 */

import { useState } from 'react';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Settings, Eye, EyeOff, AlertCircle, CheckCircle, User } from 'lucide-react';
import { supabase } from '../../lib/supabase';

type AuthMode = 'login' | 'register';

export function AdminLogin() {
  const { login, isLoading: authLoading, error: authError } = useAdminAuth();
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!email || !password) {
      setLocalError('請輸入帳號和密碼');
      return;
    }

    const result = await login(email, password);
    if (!result.success) {
      setLocalError(result.error || '登入失敗');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setLocalError(null);
    setSuccess(null);

    // 驗證
    if (!name.trim()) {
      setLocalError('請輸入姓名');
      setIsLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setLocalError('兩次輸入的密碼不一致');
      setIsLoading(false);
      return;
    }

    if (password.length < 6) {
      setLocalError('密碼至少需要 6 個字元');
      setIsLoading(false);
      return;
    }

    try {
      // 1. 在 Supabase Auth 建立帳號
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name,
            role: 'admin',
          },
        },
      });

      if (signUpError) {
        if (signUpError.message.includes('already registered')) {
          setLocalError('此電子郵件已被註冊');
        } else {
          setLocalError(signUpError.message);
        }
        setIsLoading(false);
        return;
      }

      if (!authData.user) {
        setLocalError('註冊失敗，請稍後再試');
        setIsLoading(false);
        return;
      }

      // 2. 確保 staff 表有對應資料
      const { data: existingStaff } = await supabase
        .from('staff')
        .select('id')
        .eq('organization_id', 1)
        .limit(1)
        .maybeSingle();

      let staffId = existingStaff?.id;

      if (!existingStaff) {
        // 建立 staff 資料
        const { data: newStaff } = await supabase
          .from('staff')
          .insert({
            organization_id: 1,
            name: name,
            position: 'admin',
            is_active: true,
          })
          .select('id')
          .single();
        
        staffId = newStaff?.id;
      }

      // 3. 在 staff_credentials 表建立關聯資料
      if (staffId) {
        await supabase
          .from('staff_credentials')
          .upsert({
            id: authData.user.id,
            staff_id: staffId,
            organization_id: 1,
            role: 'admin',
          });
      }

      setSuccess('註冊成功！請使用您的帳號密碼登入。');
      setMode('login');
      setPassword('');
      setConfirmPassword('');
      setName('');
    } catch (err) {
      console.error('Registration error:', err);
      setLocalError('註冊過程發生錯誤');
    }

    setIsLoading(false);
  };

  const switchMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    setLocalError(null);
    setSuccess(null);
    setPassword('');
    setConfirmPassword('');
  };

  const displayError = localError || authError;
  const loading = isLoading || authLoading;

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

        {/* 登入/註冊卡片 */}
        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl text-center">
              {mode === 'login' ? '員工登入' : '建立管理員帳號'}
            </CardTitle>
            <CardDescription className="text-center">
              {mode === 'login' 
                ? '請使用您的員工帳號登入系統' 
                : '首次使用請先建立管理員帳號'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* 成功訊息 */}
            {success && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200 text-green-600 text-sm mb-4">
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
                <span>{success}</span>
              </div>
            )}

            <form onSubmit={mode === 'login' ? handleLogin : handleRegister} className="space-y-4">
              {/* 錯誤訊息 */}
              {displayError && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{displayError}</span>
                </div>
              )}

              {/* 姓名 (僅註冊時顯示) */}
              {mode === 'register' && (
                <div className="space-y-2">
                  <label htmlFor="name" className="text-sm font-medium text-slate-700">
                    姓名
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      id="name"
                      type="text"
                      placeholder="請輸入您的姓名"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={loading}
                      className="pl-10"
                      required
                    />
                  </div>
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
                  disabled={loading}
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
                    disabled={loading}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    className="pr-10"
                    minLength={6}
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

              {/* 確認密碼 (僅註冊時顯示) */}
              {mode === 'register' && (
                <div className="space-y-2">
                  <label htmlFor="confirmPassword" className="text-sm font-medium text-slate-700">
                    確認密碼
                  </label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="請再次輸入密碼"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={loading}
                    autoComplete="new-password"
                    minLength={6}
                  />
                </div>
              )}

              {/* 提交按鈕 */}
              <Button
                type="submit"
                className="w-full h-12 text-base"
                isLoading={loading}
                disabled={loading}
              >
                {loading 
                  ? (mode === 'login' ? '登入中...' : '註冊中...') 
                  : (mode === 'login' ? '登入' : '建立帳號')
                }
              </Button>
            </form>

            {/* 切換模式 */}
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={switchMode}
                className="text-sm text-pink-600 hover:text-pink-700 hover:underline transition-colors"
              >
                {mode === 'login' ? '還沒有帳號？點此註冊' : '已有帳號？點此登入'}
              </button>
            </div>

            {/* 分隔線 */}
            {mode === 'login' && (
              <>
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-slate-400">快速填入</span>
                  </div>
                </div>

                {/* 測試帳號提示 */}
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                  <p className="text-xs text-amber-700 text-center">
                    首次使用請先點擊「點此註冊」建立您的管理員帳號
                  </p>
                </div>
              </>
            )}
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
