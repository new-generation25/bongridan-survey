-- API 키 테이블 추가 마이그레이션
-- Supabase SQL Editor에서 실행하세요
-- 실행 날짜: 2026-08-23

-- api_keys 테이블 생성
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_hash VARCHAR(64) NOT NULL UNIQUE,
  key_prefix VARCHAR(12) NOT NULL,
  partner_name VARCHAR(100) NOT NULL,
  partner_contact VARCHAR(200) NOT NULL,
  permissions TEXT[] DEFAULT ARRAY['survey', 'coupon'],
  rate_limit INTEGER DEFAULT 1000,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  note TEXT
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(is_active);
CREATE INDEX IF NOT EXISTS idx_api_keys_partner ON api_keys(partner_name);

-- RLS 활성화 (서비스 키만 접근)
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제 (있다면)
DROP POLICY IF EXISTS "Service role only" ON api_keys;

-- 서비스 역할만 접근 허용
CREATE POLICY "Service role only" ON api_keys
  FOR ALL
  USING (auth.role() = 'service_role');

-- 테이블 설명 추가
COMMENT ON TABLE api_keys IS '파트너 API 키 관리';
COMMENT ON COLUMN api_keys.key_hash IS 'API 키의 SHA-256 해시 (원본 저장 안 함)';
COMMENT ON COLUMN api_keys.key_prefix IS '관리자 화면에서 식별용 prefix (brg_xxxx)';
COMMENT ON COLUMN api_keys.permissions IS '허용된 API 범위 (survey, coupon, store 등)';
COMMENT ON COLUMN api_keys.rate_limit IS '시간당 최대 요청 수';
