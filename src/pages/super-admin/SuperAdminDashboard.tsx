import { useState } from 'react';
import { useSuperAdminAuth } from '../../contexts/SuperAdminAuthContext';
import TenantManagement from './TenantManagement';
import RevenueDashboard from './RevenueDashboard';

type Tab = 'tenants' | 'revenue' | 'settings';

export default function SuperAdminDashboard() {
  const { superAdmin, logout } = useSuperAdminAuth();
  const [activeTab, setActiveTab] = useState<Tab>('tenants');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const menuItems = [
    { id: 'tenants', label: '租戶管理', icon: '🏥' },
    { id: 'revenue', label: '營收儀表板', icon: '💰' },
    { id: 'settings', label: '系統設定', icon: '⚙️' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* 側邊欄 */}
      <aside
        className={`bg-slate-900 text-white transition-all duration-300 flex flex-col ${
          isSidebarOpen ? 'w-64' : 'w-20'
        }`}
      >
        {/* Logo */}
        <div className="p-6 flex items-center gap-3 border-b border-white/10">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center text-xl">
            🏢
          </div>
          {isSidebarOpen && (
            <span className="font-bold text-xl tracking-tight">Super Admin</span>
          )}
        </div>

        {/* 選單 */}
        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as Tab)}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${
                activeTab === item.id
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/20'
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              {isSidebarOpen && <span className="font-medium">{item.label}</span>}
            </button>
          ))}
        </nav>

        {/* 使用者資訊 */}
        <div className="p-4 border-t border-white/10">
          <div className={`flex items-center gap-3 p-3 rounded-xl bg-white/5 ${!isSidebarOpen && 'justify-center'}`}>
            <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-sm font-bold">
              {superAdmin?.name.charAt(0)}
            </div>
            {isSidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{superAdmin?.name}</p>
                <p className="text-xs text-gray-500 truncate">Super Admin</p>
              </div>
            )}
          </div>
          <button
            onClick={logout}
            className={`w-full mt-4 flex items-center gap-4 px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-xl transition-all ${
              !isSidebarOpen && 'justify-center'
            }`}
          >
            <span className="text-xl">🚪</span>
            {isSidebarOpen && <span className="font-medium">登出系統</span>}
          </button>
        </div>
      </aside>

      {/* 主內容區 */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* 頂部欄 */}
        <header className="bg-white border-b border-gray-100 px-8 py-4 flex items-center justify-between">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <span className="text-xl">☰</span>
          </button>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-gray-900">系統狀態</p>
              <p className="text-xs text-green-500 flex items-center justify-end gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                運作正常
              </p>
            </div>
          </div>
        </header>

        {/* 內容滾動區 */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-7xl mx-auto">
            {activeTab === 'tenants' && <TenantManagement />}
            {activeTab === 'revenue' && <RevenueDashboard />}
            {activeTab === 'settings' && (
              <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
                <span className="text-6xl mb-4 block">⚙️</span>
                <h3 className="text-xl font-bold text-gray-900">系統設定</h3>
                <p className="text-gray-500 mt-2">此模組正在開發中...</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
