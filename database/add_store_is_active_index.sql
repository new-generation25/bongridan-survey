-- stores 테이블의 is_active 컬럼에 인덱스 추가
-- 이 인덱스는 활성 가맹점만 조회하는 쿼리 성능을 향상시킵니다.

-- 1. is_active 컬럼이 존재하는지 확인하고 없으면 추가
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'stores' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE stores ADD COLUMN is_active BOOLEAN DEFAULT true;
  END IF;
END $$;

-- 2. 기존 가맹점들의 is_active 값을 true로 설정 (NULL인 경우)
UPDATE stores SET is_active = true WHERE is_active IS NULL;

-- 3. is_active 컬럼에 NOT NULL 제약조건 추가 (기본값이 있으므로 안전)
ALTER TABLE stores ALTER COLUMN is_active SET DEFAULT true;
ALTER TABLE stores ALTER COLUMN is_active SET NOT NULL;

-- 4. is_active 컬럼에 인덱스 추가 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_stores_is_active ON stores(is_active);

