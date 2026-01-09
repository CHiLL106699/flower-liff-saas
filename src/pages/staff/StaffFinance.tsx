/**
 * 員工版 LIFF - 簡易財報頁面
 * 
 * 功能：
 * - 本月營收總覽
 * - 營收趨勢圖 (Recharts)
 * - 療程銷售排行
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { 
  ArrowLeft, 
  DollarSign, 
  TrendingUp,
  TrendingDown,
  Calendar,
  Loader2,
  BarChart3,
  PieChart
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';

interface DailyRevenue {
  date: string;
  revenue: number;
  count: number;
}

interface TreatmentSales {
  name: string;
  count: number;
  revenue: number;
}

export default function StaffFinance() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);
  const [lastMonthRevenue, setLastMonthRevenue] = useState(0);
  const [dailyData, setDailyData] = useState<DailyRevenue[]>([]);
  const [treatmentSales, setTreatmentSales] = useState<TreatmentSales[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month'>('month');

  useEffect(() => {
    loadFinanceData();
  }, [selectedPeriod]);

  const loadFinanceData = async () => {
    setIsLoading(true);
    try {
      const organizationId = import.meta.env.VITE_ORGANIZATION_ID || '1';
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      // 計算日期範圍
      const startOfMonth = new Date(currentYear, currentMonth, 1);
      const endOfMonth = new Date(currentYear, currentMonth + 1, 0);
      const startOfLastMonth = new Date(currentYear, currentMonth - 1, 1);
      const endOfLastMonth = new Date(currentYear, currentMonth, 0);

      // 取得本月預約資料 (模擬營收)
      const { data: currentMonthData } = await supabase
        .from('appointments')
        .select(`
          id,
          appointment_time,
          status,
          treatments (name, price)
        `)
        .eq('organization_id', organizationId)
        .gte('appointment_time', startOfMonth.toISOString())
        .lte('appointment_time', endOfMonth.toISOString())
        .in('status', ['completed', 'checked_in']);

      // 取得上月預約資料
      const { data: lastMonthData } = await supabase
        .from('appointments')
        .select(`
          id,
          treatments (price)
        `)
        .eq('organization_id', organizationId)
        .gte('appointment_time', startOfLastMonth.toISOString())
        .lte('appointment_time', endOfLastMonth.toISOString())
        .in('status', ['completed', 'checked_in']);

      // 計算營收
      const currentRevenue = currentMonthData?.reduce((sum, apt) => {
        return sum + ((apt.treatments as any)?.price || 0);
      }, 0) || 0;

      const lastRevenue = lastMonthData?.reduce((sum, apt) => {
        return sum + ((apt.treatments as any)?.price || 0);
      }, 0) || 0;

      setMonthlyRevenue(currentRevenue);
      setLastMonthRevenue(lastRevenue);

      // 計算每日營收
      const dailyMap = new Map<string, { revenue: number; count: number }>();
      
      // 初始化本月每一天
      for (let d = new Date(startOfMonth); d <= endOfMonth; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        dailyMap.set(dateStr, { revenue: 0, count: 0 });
      }

      // 填入實際資料
      currentMonthData?.forEach(apt => {
        const dateStr = apt.appointment_time.split('T')[0];
        const existing = dailyMap.get(dateStr) || { revenue: 0, count: 0 };
        dailyMap.set(dateStr, {
          revenue: existing.revenue + ((apt.treatments as any)?.price || 0),
          count: existing.count + 1,
        });
      });

      // 轉換為陣列
      const dailyArray: DailyRevenue[] = [];
      dailyMap.forEach((value, key) => {
        dailyArray.push({
          date: key,
          revenue: value.revenue,
          count: value.count,
        });
      });

      // 根據選擇的期間過濾
      if (selectedPeriod === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        setDailyData(dailyArray.filter(d => new Date(d.date) >= weekAgo).slice(-7));
      } else {
        setDailyData(dailyArray);
      }

      // 計算療程銷售排行
      const treatmentMap = new Map<string, { count: number; revenue: number }>();
      currentMonthData?.forEach(apt => {
        const name = (apt.treatments as any)?.name || '其他';
        const price = (apt.treatments as any)?.price || 0;
        const existing = treatmentMap.get(name) || { count: 0, revenue: 0 };
        treatmentMap.set(name, {
          count: existing.count + 1,
          revenue: existing.revenue + price,
        });
      });

      const salesArray: TreatmentSales[] = [];
      treatmentMap.forEach((value, key) => {
        salesArray.push({
          name: key,
          count: value.count,
          revenue: value.revenue,
        });
      });

      // 按營收排序
      salesArray.sort((a, b) => b.revenue - a.revenue);
      setTreatmentSales(salesArray.slice(0, 5));

    } catch (error) {
      console.error('Load finance data error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('zh-TW', {
      style: 'currency',
      currency: 'TWD',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatShortDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const getGrowthRate = (): string => {
    if (lastMonthRevenue === 0) return '0';
    return ((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue * 100).toFixed(1);
  };

  const isGrowthPositive = parseFloat(getGrowthRate()) >= 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-pink-500 mx-auto mb-2" />
          <p className="text-gray-600">載入財務資料...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-pink-500 to-rose-500 text-white px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => navigate('/staff/dashboard')}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold">財務報表</h1>
            <p className="text-pink-100 text-xs">營收數據分析</p>
          </div>
          <DollarSign className="w-6 h-6" />
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* 營收總覽卡片 */}
        <div className="bg-gradient-to-br from-yellow-400 to-amber-500 rounded-2xl p-5 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-yellow-100 text-sm">本月營收</span>
            <Calendar className="w-5 h-5 text-yellow-100" />
          </div>
          <p className="text-3xl font-bold mb-2">{formatCurrency(monthlyRevenue)}</p>
          <div className="flex items-center gap-2">
            {isGrowthPositive ? (
              <TrendingUp className="w-4 h-4 text-green-200" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-200" />
            )}
            <span className={`text-sm ${isGrowthPositive ? 'text-green-200' : 'text-red-200'}`}>
              {isGrowthPositive ? '+' : ''}{getGrowthRate()}% 較上月
            </span>
          </div>
        </div>

        {/* 期間選擇 */}
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedPeriod('week')}
            className={`flex-1 py-2 rounded-xl font-medium transition-colors ${
              selectedPeriod === 'week'
                ? 'bg-pink-500 text-white'
                : 'bg-white text-gray-600 border border-gray-200'
            }`}
          >
            近 7 天
          </button>
          <button
            onClick={() => setSelectedPeriod('month')}
            className={`flex-1 py-2 rounded-xl font-medium transition-colors ${
              selectedPeriod === 'month'
                ? 'bg-pink-500 text-white'
                : 'bg-white text-gray-600 border border-gray-200'
            }`}
          >
            本月
          </button>
        </div>

        {/* 營收趨勢圖 */}
        <div className="bg-white rounded-2xl shadow-md p-4">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-pink-500" />
            營收趨勢
          </h3>
          
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={formatShortDate}
                  tick={{ fontSize: 10 }}
                  stroke="#9ca3af"
                />
                <YAxis 
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                  tick={{ fontSize: 10 }}
                  stroke="#9ca3af"
                  width={40}
                />
                <Tooltip 
                  formatter={(value) => [formatCurrency(value as number), '營收']}
                  labelFormatter={(label) => `日期: ${String(label)}`}
                  contentStyle={{
                    borderRadius: '8px',
                    border: 'none',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#ec4899" 
                  strokeWidth={2}
                  dot={{ fill: '#ec4899', strokeWidth: 2, r: 3 }}
                  activeDot={{ r: 5, fill: '#ec4899' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 預約數量圖 */}
        <div className="bg-white rounded-2xl shadow-md p-4">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-500" />
            預約數量
          </h3>
          
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={formatShortDate}
                  tick={{ fontSize: 10 }}
                  stroke="#9ca3af"
                />
                <YAxis 
                  tick={{ fontSize: 10 }}
                  stroke="#9ca3af"
                  width={30}
                />
                <Tooltip 
                  formatter={(value) => [`${value} 筆`, '預約']}
                  labelFormatter={(label) => `日期: ${String(label)}`}
                  contentStyle={{
                    borderRadius: '8px',
                    border: 'none',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  }}
                />
                <Bar 
                  dataKey="count" 
                  fill="#3b82f6" 
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 療程銷售排行 */}
        <div className="bg-white rounded-2xl shadow-md p-4">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <PieChart className="w-5 h-5 text-purple-500" />
            熱門療程 TOP 5
          </h3>

          {treatmentSales.length > 0 ? (
            <div className="space-y-3">
              {treatmentSales.map((item, index) => (
                <div key={item.name} className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                    index === 0 ? 'bg-yellow-500' :
                    index === 1 ? 'bg-gray-400' :
                    index === 2 ? 'bg-amber-600' :
                    'bg-gray-300'
                  }`}>
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-800 text-sm truncate">{item.name}</p>
                    <p className="text-xs text-gray-500">{item.count} 筆</p>
                  </div>
                  <p className="font-bold text-pink-600">{formatCurrency(item.revenue)}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <PieChart className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>本月尚無銷售資料</p>
            </div>
          )}
        </div>

        {/* 快速統計 */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl p-4 shadow-md">
            <p className="text-gray-500 text-sm mb-1">本月預約數</p>
            <p className="text-2xl font-bold text-gray-800">
              {dailyData.reduce((sum, d) => sum + d.count, 0)}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-md">
            <p className="text-gray-500 text-sm mb-1">平均客單價</p>
            <p className="text-2xl font-bold text-gray-800">
              {formatCurrency(
                dailyData.reduce((sum, d) => sum + d.count, 0) > 0
                  ? monthlyRevenue / dailyData.reduce((sum, d) => sum + d.count, 0)
                  : 0
              )}
            </p>
          </div>
        </div>

        {/* 提示 */}
        <div className="bg-pink-50 rounded-2xl p-4 text-center">
          <p className="text-sm text-pink-700">
            💡 財務資料每日自動更新，如需詳細報表請聯繫管理員
          </p>
        </div>
      </div>
    </div>
  );
}
