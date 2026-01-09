-- ============================================================================
-- Schema Migration: 體重追蹤、術後關懷、意見回饋
-- 
-- 執行環境: YOKAGE Supabase (atjbwafqvyqniyybagsm)
-- 執行日期: 2026-01-09
-- ============================================================================

-- 建立體重追蹤資料表 (user_id 使用 INTEGER)
CREATE TABLE IF NOT EXISTS weight_records (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  weight DECIMAL(5,2) NOT NULL,
  body_fat DECIMAL(5,2),
  waist DECIMAL(5,2),
  medication_dose VARCHAR(50),
  notes TEXT,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 建立體重目標資料表
CREATE TABLE IF NOT EXISTS weight_goals (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  target_weight DECIMAL(5,2) NOT NULL,
  target_date DATE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 建立術後關懷資料表
CREATE TABLE IF NOT EXISTS aftercare_records (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  treatment_id INTEGER REFERENCES treatments(id),
  treatment_name VARCHAR(255) NOT NULL,
  treatment_date TIMESTAMP WITH TIME ZONE NOT NULL,
  follow_up_date TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 建立意見回饋資料表
CREATE TABLE IF NOT EXISTS feedback (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations(id),
  user_id INTEGER REFERENCES users(id),
  name VARCHAR(100),
  phone VARCHAR(20),
  message TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'read', 'replied')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_weight_records_user ON weight_records(user_id);
CREATE INDEX IF NOT EXISTS idx_weight_records_org ON weight_records(organization_id);
CREATE INDEX IF NOT EXISTS idx_weight_goals_user ON weight_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_aftercare_records_user ON aftercare_records(user_id);
CREATE INDEX IF NOT EXISTS idx_aftercare_records_org ON aftercare_records(organization_id);
CREATE INDEX IF NOT EXISTS idx_feedback_org ON feedback(organization_id);

-- 啟用 RLS
ALTER TABLE weight_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE weight_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE aftercare_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- 建立 RLS 策略 - 允許公開讀寫（LIFF 前端使用 anon key）
CREATE POLICY "Allow all operations on weight_records" ON weight_records FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on weight_goals" ON weight_goals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on aftercare_records" ON aftercare_records FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on feedback" ON feedback FOR ALL USING (true) WITH CHECK (true);
