-- 관리자 비밀번호 확인 쿼리
-- Supabase SQL Editor에서 실행하세요

SELECT 
  key,
  CASE 
    WHEN key = 'admin_password' THEN 
      CASE 
        WHEN value = 'change_this_password_in_production' THEN '⚠️ 초기 비밀번호 (변경 필요!)'
        ELSE '✅ 변경됨: ' || LEFT(value, 3) || '***'
      END
    ELSE value
  END as value_status
FROM settings 
WHERE key = 'admin_password';

-- 또는 전체 설정 확인
SELECT * FROM settings ORDER BY key;



