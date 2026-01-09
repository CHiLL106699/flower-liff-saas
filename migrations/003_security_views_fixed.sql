-- ============================================================
-- YOKAGE SaaS Platform - Security Definer Views (Fixed)
-- Migration: 003_security_views_fixed.sql
-- Purpose: 根據實際資料表結構建立安全的 Views 與 Functions
-- ============================================================

-- ============================================================
-- PART 1: 建立 Security Definer Views (根據實際欄位)
-- ============================================================

-- 1.1 員工公開資訊 View (使用 position 而非 title)
CREATE OR REPLACE VIEW public.v_staff_public
WITH (security_invoker = false)
AS
SELECT 
    s.id,
    s.organization_id,
    s.name,
    s.position,
    s.is_active,
    o.name as organization_name
FROM public.staff s
JOIN public.organizations o ON s.organization_id = o.id
WHERE s.is_active = true AND o.is_active = true;

GRANT SELECT ON public.v_staff_public TO anon, authenticated;

-- 1.2 可用排班 View (使用 doctor_id 而非 staff_id)
CREATE OR REPLACE VIEW public.v_available_shifts
WITH (security_invoker = false)
AS
SELECT 
    ds.id,
    ds.organization_id,
    ds.doctor_id,
    ds.start_time,
    ds.end_time,
    ds.is_available,
    s.name as doctor_name,
    s.position as doctor_position,
    o.name as organization_name
FROM public.doctor_shifts ds
JOIN public.staff s ON ds.doctor_id = s.id
JOIN public.organizations o ON ds.organization_id = o.id
WHERE ds.is_available = true 
  AND ds.start_time >= NOW()
  AND s.is_active = true
  AND o.is_active = true;

GRANT SELECT ON public.v_available_shifts TO anon, authenticated;

-- ============================================================
-- PART 2: 修正 RPC Functions (根據實際欄位)
-- ============================================================

-- 2.1 檢查用戶在組織中的註冊狀態 (使用 is_bound 和 customer_real_name)
CREATE OR REPLACE FUNCTION public.check_user_registration(
    p_line_user_id TEXT,
    p_organization_id INTEGER
)
RETURNS TABLE (
    is_registered BOOLEAN,
    user_id INTEGER,
    real_name TEXT,
    phone TEXT,
    organization_user_role TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(ou.is_bound, false) as is_registered,
        u.id as user_id,
        ou.customer_real_name as real_name,
        ou.customer_phone as phone,
        ou.role as organization_user_role
    FROM users u
    LEFT JOIN organization_users ou ON u.id = ou.user_id AND ou.organization_id = p_organization_id
    WHERE u.line_user_id = p_line_user_id
    LIMIT 1;
END;
$$;

-- 重新授予執行權限
GRANT EXECUTE ON FUNCTION public.check_user_registration TO anon, authenticated;

-- 2.2 用戶註冊函數 (使用正確欄位名稱)
DROP FUNCTION IF EXISTS public.register_user(TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT);

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
    message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id INTEGER;
BEGIN
    -- 檢查組織是否存在且啟用
    IF NOT EXISTS (SELECT 1 FROM organizations WHERE id = p_organization_id AND is_active = true) THEN
        RETURN QUERY SELECT false, NULL::INTEGER, '組織不存在或已停用'::TEXT;
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
    IF EXISTS (SELECT 1 FROM organization_users WHERE user_id = v_user_id AND organization_id = p_organization_id) THEN
        -- 更新註冊資訊
        UPDATE organization_users 
        SET customer_real_name = p_real_name,
            customer_phone = p_phone,
            is_bound = true
        WHERE user_id = v_user_id AND organization_id = p_organization_id;
    ELSE
        -- 建立新的組織用戶關聯
        INSERT INTO organization_users (user_id, organization_id, customer_real_name, customer_phone, is_bound, role)
        VALUES (v_user_id, p_organization_id, p_real_name, p_phone, true, 'customer');
    END IF;

    RETURN QUERY SELECT true, v_user_id, '註冊成功'::TEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_user TO anon, authenticated;

-- 2.3 建立預約函數 (使用 appointment_time 而非 appointment_date + start_time)
DROP FUNCTION IF EXISTS public.create_appointment(INTEGER, INTEGER, INTEGER, INTEGER, INTEGER, DATE, TIME, TEXT);

CREATE OR REPLACE FUNCTION public.create_appointment(
    p_organization_id INTEGER,
    p_user_id INTEGER,
    p_treatment_id INTEGER,
    p_staff_id INTEGER,
    p_appointment_time TIMESTAMPTZ,
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
BEGIN
    -- 檢查用戶是否已在該組織註冊
    IF NOT EXISTS (
        SELECT 1 FROM organization_users 
        WHERE user_id = p_user_id 
          AND organization_id = p_organization_id 
          AND is_bound = true
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

    -- 檢查醫師是否有該時段的排班
    IF NOT EXISTS (
        SELECT 1 FROM doctor_shifts
        WHERE organization_id = p_organization_id
          AND doctor_id = p_staff_id
          AND is_available = true
          AND p_appointment_time >= start_time
          AND p_appointment_time < end_time
    ) THEN
        RETURN QUERY SELECT false, NULL::INTEGER, '該時段醫師無排班'::TEXT;
        RETURN;
    END IF;

    -- 建立預約
    INSERT INTO appointments (
        organization_id, user_id, treatment_id, staff_id, 
        appointment_time, duration_minutes, status, notes
    )
    VALUES (
        p_organization_id, p_user_id, p_treatment_id, p_staff_id,
        p_appointment_time, v_treatment_duration, 'pending', p_notes
    )
    RETURNING id INTO v_appointment_id;

    RETURN QUERY SELECT true, v_appointment_id, '預約建立成功，等待確認'::TEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_appointment TO anon, authenticated;

-- 2.4 取得用戶預約列表 (使用 appointment_time)
DROP FUNCTION IF EXISTS public.get_user_appointments(TEXT, INTEGER);

CREATE OR REPLACE FUNCTION public.get_user_appointments(
    p_line_user_id TEXT,
    p_organization_id INTEGER
)
RETURNS TABLE (
    appointment_id INTEGER,
    treatment_name TEXT,
    staff_name TEXT,
    appointment_time TIMESTAMPTZ,
    duration_minutes INTEGER,
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
        a.appointment_time,
        a.duration_minutes,
        a.status,
        a.notes,
        a.created_at
    FROM appointments a
    JOIN users u ON a.user_id = u.id
    JOIN treatments t ON a.treatment_id = t.id
    JOIN staff s ON a.staff_id = s.id
    WHERE u.line_user_id = p_line_user_id
      AND a.organization_id = p_organization_id
    ORDER BY a.appointment_time DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_appointments TO anon, authenticated;

-- ============================================================
-- PART 3: 建立正確的索引
-- ============================================================

-- organization_users 索引 (使用 is_bound)
CREATE INDEX IF NOT EXISTS idx_org_users_org_bound ON public.organization_users(organization_id, is_bound);

-- appointments 索引 (使用 appointment_time)
CREATE INDEX IF NOT EXISTS idx_appointments_org_time ON public.appointments(organization_id, appointment_time);

-- doctor_shifts 索引 (使用 doctor_id)
CREATE INDEX IF NOT EXISTS idx_shifts_org_doctor ON public.doctor_shifts(organization_id, doctor_id);
CREATE INDEX IF NOT EXISTS idx_shifts_doctor_time ON public.doctor_shifts(doctor_id, start_time);
CREATE INDEX IF NOT EXISTS idx_shifts_available_time ON public.doctor_shifts(is_available, start_time);

-- ============================================================
-- Migration Complete
-- ============================================================
