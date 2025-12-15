-- Q3 설문 분리 및 질문 번호 재정렬을 위한 마이그레이션
-- 기존: q3_purpose (방문목적)
-- 변경: q3_activity (이용예정), q4_occasion (방문계기)
-- Q4~Q11 → Q5~Q12로 번호 변경

-- 1. 새 컬럼 추가 (Step1)
ALTER TABLE surveys ADD COLUMN IF NOT EXISTS q3_activity TEXT[];
ALTER TABLE surveys ADD COLUMN IF NOT EXISTS q4_occasion VARCHAR(50);
ALTER TABLE surveys ADD COLUMN IF NOT EXISTS q5_channel VARCHAR(50);
ALTER TABLE surveys ADD COLUMN IF NOT EXISTS q6_budget VARCHAR(30);
ALTER TABLE surveys ADD COLUMN IF NOT EXISTS q7_companion VARCHAR(30);

-- 2. 새 컬럼 추가 (Step2)
ALTER TABLE surveys ADD COLUMN IF NOT EXISTS q8_frequency VARCHAR(30);
ALTER TABLE surveys ADD COLUMN IF NOT EXISTS q9_duration VARCHAR(30);
ALTER TABLE surveys ADD COLUMN IF NOT EXISTS q10_satisfaction VARCHAR(30);
ALTER TABLE surveys ADD COLUMN IF NOT EXISTS q11_improvement TEXT[];
ALTER TABLE surveys ADD COLUMN IF NOT EXISTS q12_other_spots TEXT[];

-- 3. 기존 데이터 마이그레이션 (Step1)
UPDATE surveys SET q3_activity = q3_purpose WHERE q3_activity IS NULL AND q3_purpose IS NOT NULL;
UPDATE surveys SET q4_occasion = '기타' WHERE q4_occasion IS NULL AND q3_purpose IS NOT NULL;
UPDATE surveys SET q5_channel = q4_channel WHERE q5_channel IS NULL AND q4_channel IS NOT NULL;
UPDATE surveys SET q6_budget = q5_budget WHERE q6_budget IS NULL AND q5_budget IS NOT NULL;
UPDATE surveys SET q7_companion = q6_companion WHERE q7_companion IS NULL AND q6_companion IS NOT NULL;

-- 4. 기존 데이터 마이그레이션 (Step2)
UPDATE surveys SET q8_frequency = q7_frequency WHERE q8_frequency IS NULL AND q7_frequency IS NOT NULL;
UPDATE surveys SET q9_duration = q8_duration WHERE q9_duration IS NULL AND q8_duration IS NOT NULL;
UPDATE surveys SET q10_satisfaction = q9_satisfaction WHERE q10_satisfaction IS NULL AND q9_satisfaction IS NOT NULL;
UPDATE surveys SET q11_improvement = q10_improvement WHERE q11_improvement IS NULL AND q10_improvement IS NOT NULL;
UPDATE surveys SET q12_other_spots = q11_other_spots WHERE q12_other_spots IS NULL AND q11_other_spots IS NOT NULL;

-- 참고: 기존 컬럼(q3_purpose, q4_channel 등)은 마이그레이션 확인 후 삭제 가능
-- DROP COLUMN 예시:
-- ALTER TABLE surveys DROP COLUMN IF EXISTS q3_purpose;
-- ALTER TABLE surveys DROP COLUMN IF EXISTS q4_channel;
-- ALTER TABLE surveys DROP COLUMN IF EXISTS q5_budget;
-- ALTER TABLE surveys DROP COLUMN IF EXISTS q6_companion;
-- ALTER TABLE surveys DROP COLUMN IF EXISTS q7_frequency;
-- ALTER TABLE surveys DROP COLUMN IF EXISTS q8_duration;
-- ALTER TABLE surveys DROP COLUMN IF EXISTS q9_satisfaction;
-- ALTER TABLE surveys DROP COLUMN IF EXISTS q10_improvement;
-- ALTER TABLE surveys DROP COLUMN IF EXISTS q11_other_spots;
