import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

interface Organization {
  id: number;
  name: string;
  slug: string;
  admin_email: string;
  is_active: boolean;
  plan_type: string;
  subscription_status: string;
  valid_until: string;
  monthly_fee: number;
  created_at: string;
}

interface NewTenantForm {
  name: string;
  slug: string;
  admin_email: string;
  plan_type: string;
  monthly_fee: number;
}

export default function TenantManagement() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTenant, setNewTenant] = useState<NewTenantForm>({
    name: '',
    slug: '',
    admin_email: '',
    plan_type: 'basic',
    monthly_fee: 999,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrganizations(data || []);
    } catch (error) {
      console.error('Error fetching organizations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTenantStatus = async (org: Organization) => {
    try {
      const { error } = await supabase
        .from('organizations')
        .update({ is_active: !org.is_active })
        .eq('id', org.id);

      if (error) throw error;
      
      setOrganizations(prev =>
        prev.map(o => o.id === org.id ? { ...o, is_active: !o.is_active } : o)
      );
    } catch (error) {
      console.error('Error toggling status:', error);
      alert('更新狀態失敗');
    }
  };

  const handleAddTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // 計算到期日 (一個月後)
      const validUntil = new Date();
      validUntil.setMonth(validUntil.getMonth() + 1);

      const { error } = await supabase
        .from('organizations')
        .insert({
          name: newTenant.name,
          slug: newTenant.slug.toLowerCase().replace(/\s+/g, '-'),
          admin_email: newTenant.admin_email,
          plan_type: newTenant.plan_type,
          monthly_fee: newTenant.monthly_fee,
          subscription_status: 'active',
          is_active: true,
          valid_until: validUntil.toISOString().split('T')[0],
        });

      if (error) throw error;

      setShowAddModal(false);
      setNewTenant({
        name: '',
        slug: '',
        admin_email: '',
        plan_type: 'basic',
        monthly_fee: 999,
      });
      fetchOrganizations();
    } catch (error) {
      console.error('Error adding tenant:', error);
      alert('新增診所失敗');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredOrganizations = organizations.filter(org => {
    const matchesSearch = org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          org.slug?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          org.admin_email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' ||
                          (filterStatus === 'active' && org.is_active) ||
                          (filterStatus === 'inactive' && !org.is_active);
    return matchesSearch && matchesFilter;
  });

  const getPlanBadge = (plan: string) => {
    const badges: Record<string, { bg: string; text: string }> = {
      basic: { bg: 'bg-gray-100 text-gray-700', text: 'Basic' },
      pro: { bg: 'bg-purple-100 text-purple-700', text: 'Pro' },
      enterprise: { bg: 'bg-amber-100 text-amber-700', text: 'Enterprise' },
    };
    return badges[plan] || badges.basic;
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string }> = {
      active: { bg: 'bg-green-100 text-green-700', text: '正常' },
      past_due: { bg: 'bg-red-100 text-red-700', text: '逾期' },
      cancelled: { bg: 'bg-gray-100 text-gray-700', text: '已取消' },
    };
    return badges[status] || badges.active;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 頁面標題與操作 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">租戶管理</h2>
          <p className="text-gray-500 mt-1">管理所有訂閱的診所客戶</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all shadow-lg shadow-purple-500/25"
        >
          <span className="text-xl">+</span>
          新增診所
        </button>
      </div>

      {/* 搜尋與篩選 */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="搜尋診所名稱、代碼或 Email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'active', 'inactive'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2 rounded-xl font-medium transition-all ${
                filterStatus === status
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {status === 'all' ? '全部' : status === 'active' ? '啟用中' : '已停權'}
            </button>
          ))}
        </div>
      </div>

      {/* 租戶列表 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">診所資訊</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">方案</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">訂閱狀態</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">月費</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">到期日</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-600">服務狀態</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-600">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredOrganizations.map((org) => {
                const planBadge = getPlanBadge(org.plan_type);
                const statusBadge = getStatusBadge(org.subscription_status);
                
                return (
                  <tr key={org.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center text-white font-bold">
                          {org.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">{org.name}</div>
                          <div className="text-sm text-gray-500">{org.slug || '-'}</div>
                          <div className="text-xs text-gray-400">{org.admin_email || '-'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${planBadge.bg}`}>
                        {planBadge.text}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${statusBadge.bg}`}>
                        {statusBadge.text}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-semibold text-gray-900">
                        NT$ {org.monthly_fee?.toLocaleString() || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-600">
                        {org.valid_until ? new Date(org.valid_until).toLocaleDateString('zh-TW') : '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => toggleTenantStatus(org)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          org.is_active ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            org.is_active ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        className="text-purple-600 hover:text-purple-800 font-medium"
                        onClick={() => window.location.href = `/super-admin/tenant/${org.id}`}
                      >
                        詳情 →
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredOrganizations.length === 0 && (
          <div className="py-12 text-center text-gray-500">
            <span className="text-4xl mb-4 block">🏥</span>
            <p>尚無符合條件的診所</p>
          </div>
        )}
      </div>

      {/* 新增診所 Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-xl font-bold text-gray-900">新增診所 (Onboarding)</h3>
              <p className="text-gray-500 text-sm mt-1">建立新的租戶並生成 Organization ID</p>
            </div>

            <form onSubmit={handleAddTenant} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  診所名稱 *
                </label>
                <input
                  type="text"
                  value={newTenant.name}
                  onChange={(e) => setNewTenant({ ...newTenant, name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="例：美麗診所"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  代碼 (Slug) *
                </label>
                <input
                  type="text"
                  value={newTenant.slug}
                  onChange={(e) => setNewTenant({ ...newTenant, slug: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="例：beauty-clinic"
                  required
                />
                <p className="text-xs text-gray-400 mt-1">用於 URL 識別，僅限英文小寫與連字號</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  管理員 Email *
                </label>
                <input
                  type="email"
                  value={newTenant.admin_email}
                  onChange={(e) => setNewTenant({ ...newTenant, admin_email: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="admin@clinic.com"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    方案類型
                  </label>
                  <select
                    value={newTenant.plan_type}
                    onChange={(e) => setNewTenant({ ...newTenant, plan_type: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="basic">Basic (NT$ 999)</option>
                    <option value="pro">Pro (NT$ 2,999)</option>
                    <option value="enterprise">Enterprise (NT$ 9,999)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    月費 (NT$)
                  </label>
                  <input
                    type="number"
                    value={newTenant.monthly_fee}
                    onChange={(e) => setNewTenant({ ...newTenant, monthly_fee: Number(e.target.value) })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-3 border border-gray-200 text-gray-600 font-medium rounded-xl hover:bg-gray-50 transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? '建立中...' : '建立診所'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
