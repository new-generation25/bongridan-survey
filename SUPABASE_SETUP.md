# Supabase 설정 가이드

## 1단계: Supabase 프로젝트 생성

1. [Supabase 대시보드](https://supabase.com/dashboard) 접속
2. "New Project" 클릭
3. 프로젝트 정보 입력:
   - **Name**: `bongridan-survey` (또는 원하는 이름)
   - **Database Password**: 강력한 비밀번호 설정 (기억해두세요!)
   - **Region**: 가장 가까운 지역 선택 (예: Northeast Asia (Seoul))
   - **Pricing Plan**: Free (무료 플랜으로 충분합니다)
4. "Create new project" 클릭
5. 프로젝트 생성 완료까지 약 2분 대기

## 2단계: API 키 확인

프로젝트 생성 후:

1. 좌측 메뉴에서 **"Settings"** (⚙️) 클릭
2. **"API"** 메뉴 클릭
3. 다음 정보를 복사하세요:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public** 키: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - **service_role** 키: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (⚠️ 비밀!)

## 3단계: 환경 변수 설정

프로젝트 루트에 `.env.local` 파일을 생성하세요:

```bash
# Windows PowerShell
New-Item -Path ".env.local" -ItemType File
```

`.env.local` 파일 내용:

```env
# Supabase 설정
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# 앱 설정
NEXT_PUBLIC_COUPON_AMOUNT=500
NEXT_PUBLIC_COUPON_VALIDITY_HOURS=24
```

⚠️ **중요**: 
- `xxxxx` 부분을 실제 Project URL로 교체하세요
- `eyJhbGci...` 부분을 실제 키로 교체하세요
- `.env.local` 파일은 Git에 올라가지 않습니다 (`.gitignore`에 포함됨)

## 4단계: 데이터베이스 스키마 적용

1. Supabase 대시보드에서 좌측 메뉴 **"SQL Editor"** 클릭
2. **"New query"** 클릭
3. `database/schema.sql` 파일의 **전체 내용**을 복사
4. SQL Editor에 붙여넣기
5. 우측 하단 **"Run"** 버튼 클릭 (또는 `Ctrl + Enter`)
6. 성공 메시지 확인:
   - ✅ 7개 테이블 생성 완료
   - ✅ 24개 가맹점 데이터 삽입 완료
   - ✅ 초기 설정 데이터 삽입 완료

## 5단계: 데이터 확인

1. 좌측 메뉴에서 **"Table Editor"** 클릭
2. 다음 테이블들이 생성되었는지 확인:
   - ✅ `surveys` - 설문 응답
   - ✅ `coupons` - 쿠폰
   - ✅ `stores` - 가맹점 (24개 데이터 확인)
   - ✅ `settlements` - 정산 이력
   - ✅ `raffle_entries` - 추첨 응모
   - ✅ `settings` - 시스템 설정

3. `stores` 테이블을 열어서 24개 가맹점이 있는지 확인:
   - 너글스, 퐁세, 카츠타다이, 토그커피샵 등...

## 6단계: 관리자 비밀번호 변경

1. **"Table Editor"** → **"settings"** 테이블 열기
2. `key = 'admin_password'` 행 찾기
3. `value` 컬럼을 원하는 비밀번호로 변경
   - 예: `mySecurePassword123!`
4. 저장

## 7단계: 개발 서버 실행

```bash
pnpm dev
```

브라우저에서 http://localhost:3000 접속하여 테스트!

## 문제 해결

### "supabaseUrl is required" 오류
- `.env.local` 파일이 프로젝트 루트에 있는지 확인
- 환경 변수 이름이 정확한지 확인 (대소문자 구분)
- 개발 서버 재시작

### SQL 실행 오류
- `uuid_generate_v4()` 함수 오류 시:
  ```sql
  CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
  ```
  먼저 실행 후 다시 스키마 적용

### 테이블이 생성되지 않음
- SQL Editor에서 에러 메시지 확인
- 각 CREATE TABLE 문이 순서대로 실행되었는지 확인
- stores 테이블이 coupons보다 먼저 생성되어야 함

## 다음 단계

✅ Supabase 설정 완료 후:
1. 개발 서버 실행: `pnpm dev`
2. 메인 페이지 접속: http://localhost:3000
3. 설문 테스트 진행
4. 관리자 페이지 테스트: http://localhost:3000/admin

