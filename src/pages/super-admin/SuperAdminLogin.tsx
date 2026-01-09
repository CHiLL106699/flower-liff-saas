/**
 * Super Admin Login Page - YOChiLL SaaS Management
 * 
 * 深色系主題 (Deep Dark Theme)
 * 嚴格安全性：僅允許資料庫中已存在的超級管理員登入
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSuperAdminAuth } from '../../contexts/SuperAdminAuthContext';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { ShieldCheck, Loader2, AlertCircle, Lock } from 'lucide-react';

const SuperAdminLogin: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { login, isLoading } = useSuperAdminAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('請輸入電子郵件和密碼');
      return;
    }

    try {
      const result = await login(email, password);
      if (!result.success) {
        setError(result.error || '登入失敗：帳號或密碼錯誤，或您不具備超級管理員權限。');
      } else {
        navigate('/super-admin');
      }
    } catch (err) {
      setError('系統發生錯誤，請稍後再試。');
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4 relative overflow-hidden">
      {/* 背景裝飾 - 科技感 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-600/5 rounded-full blur-[150px]" />
        
        {/* 網格線 */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px'
          }}
        />
      </div>

      <div className="relative w-full max-w-md z-10">
        {/* Logo 區域 */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-indigo-600 via-purple-600 to-cyan-500 rounded-2xl shadow-2xl shadow-indigo-500/30 mb-6 relative">
            <ShieldCheck className="w-10 h-10 text-white" />
            <div className="absolute -inset-1 bg-gradient-to-br from-indigo-600 via-purple-600 to-cyan-500 rounded-2xl blur opacity-40" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">YOChiLL</h1>
          <p className="text-slate-400 text-sm">SaaS Management Portal</p>
        </div>

        {/* 登入表單 */}
        <Card className="border-slate-800/50 bg-slate-900/50 backdrop-blur-xl shadow-2xl">
          <CardHeader className="space-y-2 text-center pb-6">
            <CardTitle className="text-xl font-semibold text-white">系統管理員登入</CardTitle>
            <CardDescription className="text-slate-500">
              僅限授權人員存取
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <p>{error}</p>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300 ml-1">電子郵件</label>
                <Input
                  type="email"
                  placeholder="admin@yochill.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-slate-800/50 border-slate-700/50 text-white placeholder:text-slate-500 h-12 rounded-xl focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
                  disabled={isLoading}
                  autoComplete="email"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300 ml-1">安全密碼</label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-slate-800/50 border-slate-700/50 text-white placeholder:text-slate-500 h-12 rounded-xl focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
                  disabled={isLoading}
                  autoComplete="current-password"
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-500 hover:via-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/25 transition-all active:scale-[0.98]"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    安全驗證中...
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 mr-2" />
                    授權登入
                  </>
                )}
              </Button>

              <div className="pt-4 text-center">
                <p className="text-xs text-slate-600">
                  此平台僅供系統授權人員使用<br />
                  未經授權的存取嘗試將被記錄
                </p>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* 版權資訊 */}
        <p className="text-center text-slate-700 text-xs mt-8">
          © 2026 YOChiLL SaaS Platform. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default SuperAdminLogin;
