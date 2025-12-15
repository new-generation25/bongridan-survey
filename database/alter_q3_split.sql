-- Q3 설문 분리를 위한 마이그레이션
-- q3_purpose (방문목적) → q3_activity (이용예정) + q3_1_occasion (방문계기)

-- 1. 새 컬럼 추가
ALTER TABLE surveys ADD COLUMN IF NOT EXISTS q3_activity TEXT[];
ALTER TABLE surveys ADD COLUMN IF NOT EXISTS q3_1_occasion VARCHAR(50);

-- 2. 기존 데이터 마이그레이션 (기존 q3_purpose 데이터를 q3_activity로 복사)
UPDATE surveys
SET q3_activity = q3_purpose
WHERE q3_activity IS NULL AND q3_purpose IS NOT NULL;

-- 3. 기존 데이터에 기본 방문계기 설정 (데이터가 있는 경우)
UPDATE surveys
SET q3_1_occasion = '기타'
WHERE q3_1_occasion IS NULL AND q3_purpose IS NOT NULL;

-- 4. 새 응답에 대해 NOT NULL 제약 추가 (선택사항 - 기존 데이터 때문에 주의 필요)
-- ALTER TABLE surveys ALTER COLUMN q3_activity SET NOT NULL;
-- ALTER TABLE surveys ALTER COLUMN q3_1_occasion SET NOT NULL;

-- 참고: q3_purpose 컬럼은 호환성을 위해 유지하거나,
-- 데이터 마이그레이션 확인 후 삭제할 수 있습니다.
-- DROP COLUMN IF EXISTS q3_purpose;
