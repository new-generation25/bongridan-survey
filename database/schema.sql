-- 봉리단길 설문조사 시스템 데이터베이스 스키마

-- UUID 확장 활성화 (필요한 경우)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. stores (가맹점) - 다른 테이블이 참조하므로 먼저 생성
CREATE TABLE stores (
  id VARCHAR(2) PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  name VARCHAR(100) NOT NULL,
  manager_name VARCHAR(50),
  manager_phone VARCHAR(20),
  
  is_active BOOLEAN DEFAULT true,
  total_settled INTEGER DEFAULT 0
);

-- 2. surveys (설문 응답)
CREATE TABLE surveys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  device_id VARCHAR(255) NOT NULL,
  
  -- 1단계 필수 문항
  q1_region VARCHAR(50) NOT NULL,
  q1_1_dong VARCHAR(50),
  q2_age VARCHAR(30) NOT NULL,
  q3_activity TEXT[] NOT NULL,
  q4_occasion VARCHAR(50) NOT NULL,
  q5_channel VARCHAR(50) NOT NULL,
  q6_budget VARCHAR(30) NOT NULL,
  q7_companion VARCHAR(30) NOT NULL,

  -- 2단계 추가 문항
  q8_frequency VARCHAR(30),
  q9_duration VARCHAR(30),
  q10_satisfaction VARCHAR(30),
  q11_improvement TEXT[],
  q12_other_spots TEXT[],
  
  -- 메타 정보
  stage_completed INTEGER DEFAULT 1,
  response_time_step1 INTEGER,
  response_time_step2 INTEGER
);

CREATE INDEX idx_surveys_created_at ON surveys(created_at);
CREATE INDEX idx_surveys_device_id ON surveys(device_id);
CREATE INDEX idx_surveys_q1_region ON surveys(q1_region);

-- 3. coupons (쿠폰) - stores와 surveys를 참조하므로 나중에 생성
CREATE TABLE coupons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(6) UNIQUE NOT NULL,
  survey_id UUID REFERENCES surveys(id),
  
  status VARCHAR(20) DEFAULT 'issued',
  amount INTEGER DEFAULT 500,
  
  issued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  used_store_id VARCHAR(2) REFERENCES stores(id),
  
  CONSTRAINT valid_status CHECK (status IN ('issued', 'used', 'expired'))
);

CREATE INDEX idx_coupons_code ON coupons(code);
CREATE INDEX idx_coupons_status ON coupons(status);
CREATE INDEX idx_coupons_used_store_id ON coupons(used_store_id);

-- 4. settlements (정산 이력)
CREATE TABLE settlements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  store_id VARCHAR(2) REFERENCES stores(id) NOT NULL,
  amount INTEGER NOT NULL,
  note TEXT,
  settled_by VARCHAR(50)
);

CREATE INDEX idx_settlements_store_id ON settlements(store_id);

-- 5. raffle_entries (추첨 응모)
CREATE TABLE raffle_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  survey_id UUID REFERENCES surveys(id) NOT NULL,
  name VARCHAR(50) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  agreed_privacy BOOLEAN DEFAULT true
);

CREATE INDEX idx_raffle_entries_phone ON raffle_entries(phone);

-- 6. settings (시스템 설정)
CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key VARCHAR(50) UNIQUE NOT NULL,
  value TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 초기 설정 데이터
INSERT INTO settings (key, value) VALUES
  ('coupon_amount', '500'),
  ('coupon_validity_hours', '24'),
  ('survey_active', 'true'),
  ('total_budget', '280000'),
  ('raffle_prizes', '3'),
  ('admin_password', 'change_this_password_in_production');

-- 7. 가맹점 초기 데이터 (24개)
INSERT INTO stores (id, name) VALUES
  ('01', '너글스'), ('02', '퐁세'), ('03', '카츠타다이'), ('04', '토그커피샵'),
  ('05', '왓포식당'), ('06', '공원반점'), ('07', '덴웨스'), ('08', '니치니치'),
  ('09', '봉황1935'), ('10', '희유'), ('11', '하루담'), ('12', '미야상회'),
  ('13', '서부커피'), ('14', '오히루텐'), ('15', '초이블리'), ('16', '호우오우'),
  ('17', '씅카츠'), ('18', '카페탱자'), ('19', '올던하우스'), ('20', '샤브샵'),
  ('21', '해온정'), ('22', '사계'), ('23', '밤비공기'), ('24', '밀집');

