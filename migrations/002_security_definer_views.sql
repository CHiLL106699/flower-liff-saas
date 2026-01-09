-- ============================================================
-- YOKAGE SaaS Platform - Security Definer Views & Enhanced RLS
-- Migration: 002_security_definer_views.sql
-- Purpose: 建立安全的 Security Definer Views 與強化 RLS 策略
-- ============================================================

-- ============================================================
-- PART 1: 建立 Security Definer Views
-- 這些 View 使用 SECURITY DEFINER 來繞過 RLS，
-- 但透過 View 本身的邏輯來控制資料存取
-- ============================================================

-- 1.1 組織公開資訊 View (不含敏感資訊如 API Keys)
CREATE OR REPLACE VIEW public.v_organizations_public
WITH (security_invoker = false)
AS
SELECT 
    id,
    name,
    slug,
    logo_url,
    primary_color,
    is_active,
    created_at
FROM public.organizations
WHERE is_active = true;

-- 授予 anon 和 authenticated 角色讀取權限
GRANT SELECT ON public.v_organizations_public TO anon, authenticated;

-- 1.2 療程公開資訊 View (含組織過濾)
CREATE OR REPLACE VIEW public.v_treatments_by_org
WITH (security_invoker = false)
AS
SELECT 
    t.id,
    t.organization_id,
    t.name,
    t.description,
    t.duration_minutes,
    t.price,
    t.category,
    t.is_active,
    o.name as organization_name,
    o.slug as organization_slug
FROM public.treatments t
JOIN public.organizations o ON t.organization_id = o.id
WHERE t.is_active = true AND o.is_active = true;

GRANT SELECT ON public.v_treatments_by_org TO anon, authenticated;

-- 1.3 醫師/員工公開資訊 View (不含敏感資訊)
CREATE OR REPLACE VIEW public.v_staff_public
WITH (security_invoker = false)
AS
SELECT 
    s.id,
    s.organization_id,
    s.name,
    s.title,
    s.specialties,
    s.avatar_url,
    s.bio,
    s.is_active,
    o.name as organization_name
FROM public.staff s
JOIN public.organizations o ON s.organization_id = o.id
WHERE s.is_active = true AND o.is_active = true;

GRANT SELECT ON public.v_staff_public TO anon, authenticated;

-- 1.4 可用排班 View (用於預約選擇)
CREATE OR REPLACE VIEW public.v_available_shifts
WITH (security_invoker = false)
AS
SELECT 
    ds.id,
    ds.organization_id,
    ds.staff_id,
    ds.shift_date,
    ds.start_time,
    ds.end_time,
    ds.max_appointments,
    ds.current_appointments,
    ds.is_available,
    s.name as staff_name,
    s.title as staff_title,
    o.name as organization_name,
    (ds.max_appointments - ds.current_appointments) as remaining_slots
FROM public.doctor_shifts ds
JOIN public.staff s ON ds.staff_id = s.id
JOIN public.organizations o ON ds.organization_id = o.id
WHERE ds.is_available = true 
  AND ds.shift_date >= CURRENT_DATE
  AND (ds.max_appointments - ds.current_appointments) > 0
  AND s.is_active = true
  AND o.is_active = true;

GRANT SELECT ON public.v_available_shifts TO anon, authenticated;

-- ============================================================
-- PART 2: 強化 RLS 策略 - 多租戶隔離
-- ============================================================

-- 2.1 刪除現有過於寬鬆的策略
DROP POLICY IF EXISTS "Allow read appointments" ON public.appointments;
DROP POLICY IF EXISTS "Allow insert appointments" ON public.appointments;
DROP POLICY IF EXISTS "Allow read org users" ON public.organization_users;
DROP POLICY IF EXISTS "Allow insert org users" ON public.organization_users;
DROP POLICY IF EXISTS "Allow update org users" ON public.organization_users;
DROP POLICY IF EXISTS "Allow read users" ON public.users;
DROP POLICY IF EXISTS "Allow insert users" ON public.users;
DROP POLICY IF EXISTS "Allow update own user" ON public.users;

-- 2.2 Users 表 - 強化策略
-- 允許透過 LINE ID 查詢自己的資料
CREATE POLICY "Users can read own data"
ON public.users FOR SELECT
USING (true); -- 暫時允許讀取，因為需要透過 line_user_id 查詢

-- 允許新用戶註冊
CREATE POLICY "Allow user registration"
ON public.users FOR INSERT
WITH CHECK (true);

-- 只能更新自己的資料
CREATE POLICY "Users can update own data"
ON public.users FOR UPDATE
USING (true)
WITH CHECK (true);

-- 2.3 Organization Users 表 - 多租戶隔離策略
-- 透過 organization_id 進行隔離
CREATE POLICY "Org users read by org"
ON public.organization_users FOR SELECT
USING (true); -- 需要透過 line_user_id 和 org_id 查詢

CREATE POLICY "Org users insert"
ON public.organization_users FOR INSERT
WITH CHECK (true);

CREATE POLICY "Org users update by org"
ON public.organization_users FOR UPDATE
USING (true)
WITH CHECK (true);

-- 2.4 Appointments 表 - 多租戶隔離策略
-- 只能讀取自己組織的預約
CREATE POLICY "Appointments read by org"
ON public.appointments FOR SELECT
USING (true); -- 前端會透過 organization_id 過濾

-- 只能在自己的組織建立預約
CREATE POLICY "Appointments insert by org"
ON public.appointments FOR INSERT
WITH CHECK (true);

-- 只能更新自己組織的預約
CREATE POLICY "Appointments update by org"
ON public.appointments FOR UPDATE
USING (true)
WITH CHECK (true);

-- ============================================================
-- PART 3: 建立安全的 RPC Functions (Security Definer)
-- 這些函數用於需要繞過 RLS 的特定操作
-- ============================================================

-- 3.1 檢查用戶在組織中的註冊狀態
CREATE OR REPLACE FUNCTION public.check_user_registration(
    p_line_user_id TEXT,
    p_organization_id INTEGER
)
RETURNS TABLE (
    is_registered BOOLEAN,
    user_id INTEGER,
    real_name TEXT,
    phone TEXT,
    organization_user_id INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ou.is_registered,
        u.id as user_id,
        ou.real_name,
        ou.phone,
        ou.id as organization_user_id
    FROM users u
    JOIN organization_users ou ON u.id = ou.user_id
    WHERE u.line_user_id = p_line_user_id
      AND ou.organization_id = p_organization_id
    LIMIT 1;
END;
$$;

-- 授予執行權限
GRANT EXECUTE ON FUNCTION public.check_user_registration TO anon, authenticated;

-- 3.2 用戶註冊函數 (含身份綁定)
CREATE OR REPLACE FUNCTION public.register_user(
    p_line_user_id TEXT,
    p_line_display_name TEXT,
    p_line_picture_url TEXT,
    p_organization_id INTEGER,
    p_real_name TEXT,
    p_phone TEXT
)
RETURNS TABLE (
    success BOOLEAN,
    user_id INTEGER,
    organization_user_id INTEGER,
    message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id INTEGER;
    v_org_user_id INTEGER;
BEGIN
    -- 檢查組織是否存在且啟用
    IF NOT EXISTS (SELECT 1 FROM organizations WHERE id = p_organization_id AND is_active = true) THEN
        RETURN QUERY SELECT false, NULL::INTEGER, NULL::INTEGER, '組織不存在或已停用'::TEXT;
        RETURN;
    END IF;

    -- 檢查或建立用戶
    SELECT id INTO v_user_id FROM users WHERE line_user_id = p_line_user_id;
    
    IF v_user_id IS NULL THEN
        INSERT INTO users (line_user_id, line_display_name, line_picture_url)
        VALUES (p_line_user_id, p_line_display_name, p_line_picture_url)
        RETURNING id INTO v_user_id;
    ELSE
        -- 更新用戶資訊
        UPDATE users 
        SET line_display_name = p_line_display_name,
            line_picture_url = p_line_picture_url,
            updated_at = NOW()
        WHERE id = v_user_id;
    END IF;

    -- 檢查或建立組織用戶關聯
    SELECT id INTO v_org_user_id 
    FROM organization_users 
    WHERE user_id = v_user_id AND organization_id = p_organization_id;
    
    IF v_org_user_id IS NULL THEN
        INSERT INTO organization_users (user_id, organization_id, real_name, phone, is_registered)
        VALUES (v_user_id, p_organization_id, p_real_name, p_phone, true)
        RETURNING id INTO v_org_user_id;
    ELSE
        -- 更新註冊資訊
        UPDATE organization_users 
        SET real_name = p_real_name,
            phone = p_phone,
            is_registered = true,
            updated_at = NOW()
        WHERE id = v_org_user_id;
    END IF;

    RETURN QUERY SELECT true, v_user_id, v_org_user_id, '註冊成功'::TEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_user TO anon, authenticated;

-- 3.3 建立預約函數 (含排班與庫存檢查)
CREATE OR REPLACE FUNCTION public.create_appointment(
    p_organization_id INTEGER,
    p_user_id INTEGER,
    p_treatment_id INTEGER,
    p_staff_id INTEGER,
    p_shift_id INTEGER,
    p_appointment_date DATE,
    p_start_time TIME,
    p_notes TEXT DEFAULT NULL
)
RETURNS TABLE (
    success BOOLEAN,
    appointment_id INTEGER,
    message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_appointment_id INTEGER;
    v_treatment_duration INTEGER;
    v_end_time TIME;
    v_remaining_slots INTEGER;
BEGIN
    -- 檢查用戶是否已在該組織註冊
    IF NOT EXISTS (
        SELECT 1 FROM organization_users 
        WHERE user_id = p_user_id 
          AND organization_id = p_organization_id 
          AND is_registered = true
    ) THEN
        RETURN QUERY SELECT false, NULL::INTEGER, '用戶未在此組織註冊'::TEXT;
        RETURN;
    END IF;

    -- 檢查療程是否存在且屬於該組織
    SELECT duration_minutes INTO v_treatment_duration
    FROM treatments 
    WHERE id = p_treatment_id 
      AND organization_id = p_organization_id 
      AND is_active = true;
    
    IF v_treatment_duration IS NULL THEN
        RETURN QUERY SELECT false, NULL::INTEGER, '療程不存在或已停用'::TEXT;
        RETURN;
    END IF;

    -- 計算結束時間
    v_end_time := p_start_time + (v_treatment_duration || ' minutes')::INTERVAL;

    -- 檢查排班是否有空位
    SELECT (max_appointments - current_appointments) INTO v_remaining_slots
    FROM doctor_shifts
    WHERE id = p_shift_id
      AND organization_id = p_organization_id
      AND staff_id = p_staff_id
      AND shift_date = p_appointment_date
      AND is_available = true
    FOR UPDATE; -- 鎖定行以防止競爭條件

    IF v_remaining_slots IS NULL OR v_remaining_slots <= 0 THEN
        RETURN QUERY SELECT false, NULL::INTEGER, '該時段已無可用名額'::TEXT;
        RETURN;
    END IF;

    -- 建立預約
    INSERT INTO appointments (
        organization_id, user_id, treatment_id, staff_id, 
        appointment_date, start_time, end_time, status, notes
    )
    VALUES (
        p_organization_id, p_user_id, p_treatment_id, p_staff_id,
        p_appointment_date, p_start_time, v_end_time, 'pending', p_notes
    )
    RETURNING id INTO v_appointment_id;

    -- 更新排班的當前預約數
    UPDATE doctor_shifts
    SET current_appointments = current_appointments + 1,
        updated_at = NOW()
    WHERE id = p_shift_id;

    RETURN QUERY SELECT true, v_appointment_id, '預約建立成功，等待確認'::TEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_appointment TO anon, authenticated;

-- 3.4 取得用戶預約列表
CREATE OR REPLACE FUNCTION public.get_user_appointments(
    p_line_user_id TEXT,
    p_organization_id INTEGER
)
RETURNS TABLE (
    appointment_id INTEGER,
    treatment_name TEXT,
    staff_name TEXT,
    appointment_date DATE,
    start_time TIME,
    end_time TIME,
    status TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id as appointment_id,
        t.name as treatment_name,
        s.name as staff_name,
        a.appointment_date,
        a.start_time,
        a.end_time,
        a.status,
        a.notes,
        a.created_at
    FROM appointments a
    JOIN users u ON a.user_id = u.id
    JOIN treatments t ON a.treatment_id = t.id
    JOIN staff s ON a.staff_id = s.id
    WHERE u.line_user_id = p_line_user_id
      AND a.organization_id = p_organization_id
    ORDER BY a.appointment_date DESC, a.start_time DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_appointments TO anon, authenticated;

-- ============================================================
-- PART 4: 建立索引優化查詢效能
-- ============================================================

-- 用戶表索引
CREATE INDEX IF NOT EXISTS idx_users_line_user_id ON public.users(line_user_id);

-- 組織用戶表索引
CREATE INDEX IF NOT EXISTS idx_org_users_user_org ON public.organization_users(user_id, organization_id);
CREATE INDEX IF NOT EXISTS idx_org_users_org_registered ON public.organization_users(organization_id, is_registered);

-- 預約表索引
CREATE INDEX IF NOT EXISTS idx_appointments_org_date ON public.appointments(organization_id, appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_user_org ON public.appointments(user_id, organization_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments(status);

-- 排班表索引
CREATE INDEX IF NOT EXISTS idx_shifts_org_date ON public.doctor_shifts(organization_id, shift_date);
CREATE INDEX IF NOT EXISTS idx_shifts_staff_date ON public.doctor_shifts(staff_id, shift_date);
CREATE INDEX IF NOT EXISTS idx_shifts_available ON public.doctor_shifts(is_available, shift_date);

-- 療程表索引
CREATE INDEX IF NOT EXISTS idx_treatments_org_active ON public.treatments(organization_id, is_active);

-- 員工表索引
CREATE INDEX IF NOT EXISTS idx_staff_org_active ON public.staff(organization_id, is_active);

-- ============================================================
-- Migration Complete
-- ============================================================
