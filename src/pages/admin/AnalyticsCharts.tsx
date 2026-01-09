import { useState, useEffect, useMemo } from 'react';
import {
  AreaChart,
  Area,
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
import { supabase } from '../../lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { TrendingUp, Calendar, Users, Activity, RefreshCw } from 'lucide-react';
import { cn } from '../../lib/utils';

interface AnalyticsChartsProps {
  organizationId: number;
}

// 顏色配置
const COLORS = {
  primary: '#ec4899',    // Pink
  secondary: '#f472b6',  // Light Pink
  success: '#10b981',    // Green
  warning: '#f59e0b',    // Yellow
  info: '#3b82f6',       // Blue
  purple: '#8b5cf6',     // Purple
};

const PIE_COLORS = [COLORS.primary, COLORS.info, COLORS.success, COLORS.warning, COLORS.purple];

interface DailyStats {
  date: string;
  appointments: number;
  checkedIn: number;
  cancelled: number;
}

interface TreatmentStats {
  name: string;
  count: number;
  revenue: number;
}

interface StatusDistribution {
  name: string;
  value: number;
  [key: string]: string | number;
}

export function AnalyticsCharts({ organizationId }: AnalyticsChartsProps) {
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [treatmentStats, setTreatmentStats] = useState<TreatmentStats[]>([]);
  const [statusDistribution, setStatusDistribution] = useState<StatusDistribution[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('30d');

  // 取得日期範圍
  const getDateRange = useMemo(() => {
    const end = new Date();
    const start = new Date();
    
    switch (dateRange) {
      case '7d':
        start.setDate(start.getDate() - 7);
        break;
      case '30d':
        start.setDate(start.getDate() - 30);
        break;
      case '90d':
        start.setDate(start.getDate() - 90);
        break;
    }
    
    return { start, end };
  }, [dateRange]);

  // 取得統計資料
  const fetchAnalytics = async () => {
    setIsLoading(true);
    
    try {
      const { start, end } = getDateRange;

      // 取得預約資料
      const { data: appointments, error } = await supabase
        .from('appointments')
        .select(`
          id,
          appointment_time,
          status,
          treatment_id,
          treatments:treatment_id(name, price)
        `)
        .eq('organization_id', organizationId)
        .gte('appointment_time', start.toISOString())
        .lte('appointment_time', end.toISOString());

      if (error) {
        console.error('Error fetching analytics:', error);
        return;
      }

      // 處理每日統計
      const dailyMap = new Map<string, DailyStats>();
      const treatmentMap = new Map<string, TreatmentStats>();
      const statusMap = new Map<string, number>();

      // 初始化日期範圍
      const current = new Date(start);
      while (current <= end) {
        const dateStr = current.toISOString().split('T')[0];
        dailyMap.set(dateStr, {
          date: dateStr,
          appointments: 0,
          checkedIn: 0,
          cancelled: 0,
        });
        current.setDate(current.getDate() + 1);
      }

      // 處理預約資料
      appointments?.forEach((apt: any) => {
        const dateStr = apt.appointment_time.split('T')[0];
        const daily = dailyMap.get(dateStr);
        
        if (daily) {
          daily.appointments++;
          if (apt.status === 'checked_in' || apt.status === 'completed') {
            daily.checkedIn++;
          }
          if (apt.status === 'cancelled') {
            daily.cancelled++;
          }
        }

        // 療程統計
        const treatmentName = apt.treatments?.name || '未知療程';
        const treatmentPrice = apt.treatments?.price || 0;
        
        if (!treatmentMap.has(treatmentName)) {
          treatmentMap.set(treatmentName, { name: treatmentName, count: 0, revenue: 0 });
        }
        const treatment = treatmentMap.get(treatmentName)!;
        treatment.count++;
        if (apt.status === 'completed') {
          treatment.revenue += treatmentPrice;
        }

        // 狀態分布
        const statusLabel = getStatusLabel(apt.status);
        statusMap.set(statusLabel, (statusMap.get(statusLabel) || 0) + 1);
      });

      // 轉換為陣列
      setDailyStats(Array.from(dailyMap.values()));
      setTreatmentStats(
        Array.from(treatmentMap.values())
          .sort((a, b) => b.count - a.count)
          .slice(0, 5)
      );
      setStatusDistribution(
        Array.from(statusMap.entries()).map(([name, value]) => ({ name, value }))
      );

    } catch (err) {
      console.error('Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // 狀態標籤轉換
  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: '待確認',
      confirmed: '已確認',
      checked_in: '已報到',
      completed: '已完成',
      cancelled: '已取消',
    };
    return labels[status] || status;
  };

  useEffect(() => {
    fetchAnalytics();
  }, [organizationId, dateRange]);

  // 計算總計
  const totals = useMemo(() => {
    const totalAppointments = dailyStats.reduce((sum, d) => sum + d.appointments, 0);
    const totalCheckedIn = dailyStats.reduce((sum, d) => sum + d.checkedIn, 0);
    const totalCancelled = dailyStats.reduce((sum, d) => sum + d.cancelled, 0);
    const totalRevenue = treatmentStats.reduce((sum, t) => sum + t.revenue, 0);
    
    return { totalAppointments, totalCheckedIn, totalCancelled, totalRevenue };
  }, [dailyStats, treatmentStats]);

  // 格式化日期顯示
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  return (
    <div className="space-y-6">
      {/* 控制列 */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
          <Activity className="w-5 h-5 text-pink-500" />
          數據分析
        </h2>
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 rounded-lg p-1">
            {(['7d', '30d', '90d'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={cn(
                  'px-3 py-1.5 text-sm rounded-md transition-colors',
                  dateRange === range
                    ? 'bg-white text-pink-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-800'
                )}
              >
                {range === '7d' ? '7 天' : range === '30d' ? '30 天' : '90 天'}
              </button>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchAnalytics}
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
            刷新
          </Button>
        </div>
      </div>

      {/* 摘要卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-pink-50 to-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">總預約數</p>
                <p className="text-2xl font-bold text-slate-800">{totals.totalAppointments}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-pink-100 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-pink-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">完成報到</p>
                <p className="text-2xl font-bold text-slate-800">{totals.totalCheckedIn}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                <Users className="w-6 h-6 text-emerald-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">取消數</p>
                <p className="text-2xl font-bold text-slate-800">{totals.totalCancelled}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
                <Activity className="w-6 h-6 text-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">預估營收</p>
                <p className="text-2xl font-bold text-slate-800">
                  ${totals.totalRevenue.toLocaleString()}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 圖表區域 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 預約趨勢圖 */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">預約趨勢</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyStats}>
                  <defs>
                    <linearGradient id="colorAppointments" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorCheckedIn" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.success} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={COLORS.success} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDate}
                    stroke="#94a3b8"
                    fontSize={12}
                  />
                  <YAxis stroke="#94a3b8" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    }}
                    labelFormatter={(label) => `日期: ${label}`}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="appointments"
                    name="預約數"
                    stroke={COLORS.primary}
                    fillOpacity={1}
                    fill="url(#colorAppointments)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="checkedIn"
                    name="報到數"
                    stroke={COLORS.success}
                    fillOpacity={1}
                    fill="url(#colorCheckedIn)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* 療程排行 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">熱門療程 TOP 5</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={treatmentStats} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis type="number" stroke="#94a3b8" fontSize={12} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    stroke="#94a3b8"
                    fontSize={12}
                    width={100}
                    tickFormatter={(value) => 
                      value.length > 8 ? value.substring(0, 8) + '...' : value
                    }
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar
                    dataKey="count"
                    name="預約次數"
                    fill={COLORS.primary}
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* 狀態分布 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">預約狀態分布</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => 
                      `${name} ${((percent || 0) * 100).toFixed(0)}%`
                    }
                    labelLine={false}
                  >
                    {statusDistribution.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={PIE_COLORS[index % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default AnalyticsCharts;
