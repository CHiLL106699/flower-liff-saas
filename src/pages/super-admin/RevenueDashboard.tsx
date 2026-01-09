import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface Organization {
  id: number;
  name: string;
  is_active: boolean;
  plan_type: string;
  subscription_status: string;
  monthly_fee: number;
  valid_until: string;
}

interface Stats {
  totalTenants: number;
  activeTenants: number;
  inactiveTenants: number;
  mrr: number;
  pastDueTenants: number;
  expiringThisMonth: number;
}

export default function RevenueDashboard() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalTenants: 0,
    activeTenants: 0,
    inactiveTenants: 0,
    mrr: 0,
    pastDueTenants: 0,
    expiringThisMonth: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const orgs = data || [];
      setOrganizations(orgs);

      // 計算統計數據
      const now = new Date();
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      const active = orgs.filter(o => o.is_active);
      const inactive = orgs.filter(o => !o.is_active);
      const pastDue = orgs.filter(o => o.subscription_status === 'past_due');
      const expiring = orgs.filter(o => {
        if (!o.valid_until) return false;
        const validDate = new Date(o.valid_until);
        return validDate <= endOfMonth && validDate >= now;
      });

      const mrr = active.reduce((sum, o) => sum + (o.monthly_fee || 0), 0);

      setStats({
        totalTenants: orgs.length,
        activeTenants: active.length,
        inactiveTenants: inactive.length,
        mrr,
        pastDueTenants: pastDue.length,
        expiringThisMonth: expiring.length,
      });
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 方案分佈數據
  const planDistribution = [
    { name: 'Basic', value: organizations.filter(o => o.plan_type === 'basic').length, color: '#94a3b8' },
    { name: 'Pro', value: organizations.filter(o => o.plan_type === 'pro').length, color: '#a855f7' },
    { name: 'Enterprise', value: organizations.filter(o => o.plan_type === 'enterprise').length, color: '#f59e0b' },
  ].filter(p => p.value > 0);

  // 模擬月營收趨勢 (實際應從資料庫取得歷史數據)
  const monthlyTrend = [
    { month: '8月', revenue: stats.mrr * 0.6 },
    { month: '9月', revenue: stats.mrr * 0.7 },
    { month: '10月', revenue: stats.mrr * 0.8 },
    { month: '11月', revenue: stats.mrr * 0.9 },
    { month: '12月', revenue: stats.mrr * 0.95 },
    { month: '1月', revenue: stats.mrr },
  ];

  // 訂閱狀態分佈
  const statusDistribution = [
    { name: '正常', count: organizations.filter(o => o.subscription_status === 'active').length },
    { name: '逾期', count: organizations.filter(o => o.subscription_status === 'past_due').length },
    { name: '已取消', count: organizations.filter(o => o.subscription_status === 'cancelled').length },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 頁面標題 */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">營收儀表板</h2>
        <p className="text-gray-500 mt-1">訂閱狀態與營收分析</p>
      </div>

      {/* 統計卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* MRR */}
        <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">預估月營收 (MRR)</p>
              <p className="text-3xl font-bold mt-2">NT$ {stats.mrr.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <span className="text-2xl">💰</span>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-white/20">
            <span className="text-purple-100 text-sm">
              來自 {stats.activeTenants} 個活躍診所
            </span>
          </div>
        </div>

        {/* 總診所數 */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">總診所數</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalTenants}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <span className="text-2xl">🏥</span>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <span className="text-green-600 text-sm font-medium">
              {stats.activeTenants} 啟用中
            </span>
            <span className="text-gray-400 mx-2">|</span>
            <span className="text-gray-500 text-sm">
              {stats.inactiveTenants} 已停權
            </span>
          </div>
        </div>

        {/* 逾期帳戶 */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">逾期帳戶</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.pastDueTenants}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
              <span className="text-2xl">⚠️</span>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <span className={`text-sm font-medium ${stats.pastDueTenants > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {stats.pastDueTenants > 0 ? '需要跟進催繳' : '全部正常繳費'}
            </span>
          </div>
        </div>

        {/* 本月到期 */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">本月到期</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.expiringThisMonth}</p>
            </div>
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
              <span className="text-2xl">📅</span>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <span className="text-amber-600 text-sm font-medium">
              {stats.expiringThisMonth > 0 ? '需提醒續約' : '本月無到期'}
            </span>
          </div>
        </div>
      </div>

      {/* 圖表區域 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 營收趨勢 */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">營收趨勢</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`} />
              <Tooltip
                formatter={(value: any) => [`NT$ ${Number(value).toLocaleString()}`, '營營收']}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
              />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="url(#colorGradient)"
                strokeWidth={3}
                dot={{ fill: '#a855f7', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, fill: '#a855f7' }}
              />
              <defs>
                <linearGradient id="colorGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#a855f7" />
                  <stop offset="100%" stopColor="#ec4899" />
                </linearGradient>
              </defs>
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* 方案分佈 */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">方案分佈</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={planDistribution}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(Number(percent) * 100).toFixed(0)}%`}
              >
                {planDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* 訂閱狀態 */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 lg:col-span-2">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">訂閱狀態分佈</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={statusDistribution} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" stroke="#94a3b8" />
              <YAxis dataKey="name" type="category" stroke="#94a3b8" width={80} />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
              />
              <Bar dataKey="count" fill="#a855f7" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 即將到期列表 */}
      {stats.expiringThisMonth > 0 && (
        <div className="bg-amber-50 rounded-2xl p-6 border border-amber-200">
          <h3 className="text-lg font-semibold text-amber-800 mb-4 flex items-center gap-2">
            <span>⚠️</span>
            本月即將到期的診所
          </h3>
          <div className="space-y-3">
            {organizations
              .filter(o => {
                if (!o.valid_until) return false;
                const now = new Date();
                const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                const validDate = new Date(o.valid_until);
                return validDate <= endOfMonth && validDate >= now;
              })
              .map(org => (
                <div key={org.id} className="flex items-center justify-between bg-white rounded-xl p-4">
                  <div>
                    <p className="font-semibold text-gray-900">{org.name}</p>
                    <p className="text-sm text-gray-500">
                      到期日：{new Date(org.valid_until).toLocaleDateString('zh-TW')}
                    </p>
                  </div>
                  <button className="px-4 py-2 bg-amber-500 text-white font-medium rounded-lg hover:bg-amber-600 transition-colors">
                    發送提醒
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
