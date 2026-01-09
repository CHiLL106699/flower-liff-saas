/**
 * LIFF 體重追蹤頁面
 * 
 * 移植自 flower-admin，改用 Supabase 後端
 * 功能：記錄體重、查看歷史、設定目標
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Plus, 
  History, 
  Target, 
  Scale,
  TrendingDown,
  TrendingUp,
  Minus,
  Save,
  Loader2
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

interface WeightRecord {
  id: number;
  weight: number;
  body_fat: number | null;
  waist: number | null;
  medication_dose: string | null;
  notes: string | null;
  recorded_at: string;
}

interface WeightGoal {
  id: number;
  target_weight: number;
  target_date: string | null;
  is_active: boolean;
}

type TabType = 'record' | 'history' | 'goal';

export default function LiffWeight() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('record');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // 記錄表單
  const [weight, setWeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [waist, setWaist] = useState('');
  const [medicationDose, setMedicationDose] = useState('');
  const [notes, setNotes] = useState('');
  
  // 歷史記錄
  const [records, setRecords] = useState<WeightRecord[]>([]);
  
  // 目標設定
  const [goal, setGoal] = useState<WeightGoal | null>(null);
  const [targetWeight, setTargetWeight] = useState('');
  const [targetDate, setTargetDate] = useState('');

  // 從 localStorage 獲取用戶資訊
  const getUserId = () => {
    const userId = localStorage.getItem('flower_user_id');
    return userId ? parseInt(userId) : null;
  };

  const getOrganizationId = () => {
    return parseInt(import.meta.env.VITE_ORGANIZATION_ID || '1');
  };

  // 載入歷史記錄
  const loadRecords = async () => {
    const userId = getUserId();
    if (!userId) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('weight_records')
        .select('*')
        .eq('user_id', userId)
        .eq('organization_id', getOrganizationId())
        .order('recorded_at', { ascending: false })
        .limit(30);

      if (error) throw error;
      setRecords(data || []);
    } catch (error) {
      console.error('Failed to load records:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 載入目標
  const loadGoal = async () => {
    const userId = getUserId();
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('weight_goals')
        .select('*')
        .eq('user_id', userId)
        .eq('organization_id', getOrganizationId())
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      if (data) {
        setGoal(data);
        setTargetWeight(data.target_weight.toString());
        setTargetDate(data.target_date || '');
      }
    } catch (error) {
      console.error('Failed to load goal:', error);
    }
  };

  useEffect(() => {
    loadRecords();
    loadGoal();
  }, []);

  // 儲存體重記錄
  const handleSaveRecord = async () => {
    const userId = getUserId();
    if (!userId) {
      alert('請先完成會員註冊');
      navigate('/');
      return;
    }

    if (!weight) {
      alert('請輸入體重');
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('weight_records')
        .insert({
          organization_id: getOrganizationId(),
          user_id: userId,
          weight: parseFloat(weight),
          body_fat: bodyFat ? parseFloat(bodyFat) : null,
          waist: waist ? parseFloat(waist) : null,
          medication_dose: medicationDose || null,
          notes: notes || null,
          recorded_at: new Date().toISOString()
        });

      if (error) throw error;

      alert('記錄已儲存！');
      setWeight('');
      setBodyFat('');
      setWaist('');
      setMedicationDose('');
      setNotes('');
      loadRecords();
    } catch (error) {
      console.error('Failed to save record:', error);
      alert('儲存失敗，請稍後再試');
    } finally {
      setIsSaving(false);
    }
  };

  // 儲存目標
  const handleSaveGoal = async () => {
    const userId = getUserId();
    if (!userId) {
      alert('請先完成會員註冊');
      navigate('/');
      return;
    }

    if (!targetWeight) {
      alert('請輸入目標體重');
      return;
    }

    setIsSaving(true);
    try {
      // 先將舊目標設為非活躍
      if (goal) {
        await supabase
          .from('weight_goals')
          .update({ is_active: false })
          .eq('id', goal.id);
      }

      // 建立新目標
      const { data, error } = await supabase
        .from('weight_goals')
        .insert({
          organization_id: getOrganizationId(),
          user_id: userId,
          target_weight: parseFloat(targetWeight),
          target_date: targetDate || null,
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;

      setGoal(data);
      alert('目標已設定！');
    } catch (error) {
      console.error('Failed to save goal:', error);
      alert('儲存失敗，請稍後再試');
    } finally {
      setIsSaving(false);
    }
  };

  // 計算趨勢
  const getTrend = () => {
    if (records.length < 2) return null;
    const latest = records[0].weight;
    const previous = records[1].weight;
    const diff = latest - previous;
    return { diff, direction: diff > 0 ? 'up' : diff < 0 ? 'down' : 'same' };
  };

  // 準備圖表資料
  const chartData = [...records]
    .reverse()
    .slice(-14)
    .map(r => ({
      date: new Date(r.recorded_at).toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' }),
      weight: r.weight,
      bodyFat: r.body_fat
    }));

  const trend = getTrend();

  const tabs = [
    { id: 'record' as TabType, label: '記錄', icon: Plus },
    { id: 'history' as TabType, label: '歷史', icon: History },
    { id: 'goal' as TabType, label: '目標', icon: Target }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-violet-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-violet-500 text-white px-4 py-4 rounded-b-3xl shadow-lg">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Scale className="w-6 h-6" />
            <h1 className="text-xl font-bold">體重追蹤</h1>
          </div>
        </div>

        {/* 最新數據摘要 */}
        {records.length > 0 && (
          <div className="mt-4 flex items-center justify-center gap-6">
            <div className="text-center">
              <p className="text-purple-200 text-xs">目前體重</p>
              <p className="text-3xl font-bold">{records[0].weight}</p>
              <p className="text-purple-200 text-xs">kg</p>
            </div>
            {trend && (
              <div className="text-center">
                <p className="text-purple-200 text-xs">較上次</p>
                <div className="flex items-center justify-center gap-1">
                  {trend.direction === 'down' ? (
                    <TrendingDown className="w-5 h-5 text-green-300" />
                  ) : trend.direction === 'up' ? (
                    <TrendingUp className="w-5 h-5 text-red-300" />
                  ) : (
                    <Minus className="w-5 h-5 text-white" />
                  )}
                  <span className={`text-xl font-bold ${
                    trend.direction === 'down' ? 'text-green-300' : 
                    trend.direction === 'up' ? 'text-red-300' : 'text-white'
                  }`}>
                    {Math.abs(trend.diff).toFixed(1)}
                  </span>
                </div>
                <p className="text-purple-200 text-xs">kg</p>
              </div>
            )}
            {goal && (
              <div className="text-center">
                <p className="text-purple-200 text-xs">距離目標</p>
                <p className="text-xl font-bold">
                  {(records[0].weight - goal.target_weight).toFixed(1)}
                </p>
                <p className="text-purple-200 text-xs">kg</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tab 切換 */}
      <div className="px-4 py-3">
        <div className="flex bg-white rounded-xl p-1 shadow-sm">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-purple-500 to-violet-500 text-white shadow-md'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 內容區域 */}
      <div className="px-4 pb-8">
        {/* 記錄 Tab */}
        {activeTab === 'record' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <h3 className="font-bold text-slate-800 mb-4">新增記錄</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-slate-600 mb-1 block">體重 (kg) *</label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="例如：65.5"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    className="text-lg"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm text-slate-600 mb-1 block">體脂肪 (%)</label>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="例如：25.0"
                      value={bodyFat}
                      onChange={(e) => setBodyFat(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm text-slate-600 mb-1 block">腰圍 (cm)</label>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="例如：80.0"
                      value={waist}
                      onChange={(e) => setWaist(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm text-slate-600 mb-1 block">猛健樂劑量</label>
                  <Input
                    type="text"
                    placeholder="例如：0.5mg"
                    value={medicationDose}
                    onChange={(e) => setMedicationDose(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-sm text-slate-600 mb-1 block">備註</label>
                  <textarea
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
                    rows={3}
                    placeholder="今日飲食、運動等備註..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                <Button
                  onClick={handleSaveRecord}
                  disabled={isSaving || !weight}
                  className="w-full bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      儲存中...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      儲存記錄
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* 歷史 Tab */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            {/* 圖表 */}
            {chartData.length > 0 && (
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <h3 className="font-bold text-slate-800 mb-4">體重趨勢</h3>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 10 }}
                        stroke="#94a3b8"
                      />
                      <YAxis 
                        domain={['dataMin - 2', 'dataMax + 2']}
                        tick={{ fontSize: 10 }}
                        stroke="#94a3b8"
                      />
                      <Tooltip />
                      <Line 
                        type="monotone" 
                        dataKey="weight" 
                        stroke="#8b5cf6" 
                        strokeWidth={2}
                        dot={{ fill: '#8b5cf6', strokeWidth: 2 }}
                        name="體重 (kg)"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* 記錄列表 */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <h3 className="font-bold text-slate-800 mb-4">歷史記錄</h3>
              
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
                </div>
              ) : records.length === 0 ? (
                <p className="text-center text-slate-400 py-8">
                  尚無記錄，開始記錄您的第一筆體重吧！
                </p>
              ) : (
                <div className="space-y-3">
                  {records.map((record) => (
                    <div 
                      key={record.id}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-xl"
                    >
                      <div>
                        <p className="text-xs text-slate-400">
                          {new Date(record.recorded_at).toLocaleDateString('zh-TW', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                        <div className="flex items-baseline gap-2 mt-1">
                          <span className="text-xl font-bold text-slate-800">
                            {record.weight}
                          </span>
                          <span className="text-sm text-slate-500">kg</span>
                          {record.body_fat && (
                            <span className="text-xs text-slate-400">
                              體脂 {record.body_fat}%
                            </span>
                          )}
                        </div>
                      </div>
                      {record.medication_dose && (
                        <span className="text-xs bg-purple-100 text-purple-600 px-2 py-1 rounded-full">
                          {record.medication_dose}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 目標 Tab */}
        {activeTab === 'goal' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <h3 className="font-bold text-slate-800 mb-4">設定目標</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-slate-600 mb-1 block">目標體重 (kg) *</label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="例如：55.0"
                    value={targetWeight}
                    onChange={(e) => setTargetWeight(e.target.value)}
                    className="text-lg"
                  />
                </div>

                <div>
                  <label className="text-sm text-slate-600 mb-1 block">預計達成日期</label>
                  <Input
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                  />
                </div>

                <Button
                  onClick={handleSaveGoal}
                  disabled={isSaving || !targetWeight}
                  className="w-full bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      儲存中...
                    </>
                  ) : (
                    <>
                      <Target className="w-4 h-4 mr-2" />
                      設定目標
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* 目前目標 */}
            {goal && (
              <div className="bg-gradient-to-br from-purple-500 to-violet-500 rounded-2xl p-5 text-white shadow-lg">
                <h3 className="font-bold mb-3">目前目標</h3>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-200 text-sm">目標體重</p>
                    <p className="text-3xl font-bold">{goal.target_weight} kg</p>
                  </div>
                  {goal.target_date && (
                    <div className="text-right">
                      <p className="text-purple-200 text-sm">預計達成</p>
                      <p className="font-medium">
                        {new Date(goal.target_date).toLocaleDateString('zh-TW')}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
