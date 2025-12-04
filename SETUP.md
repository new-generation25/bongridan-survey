# 봉리단길 설문조사 시스템 - 설치 가이드

## 1. 프로젝트 클론 및 의존성 설치

```bash
cd bongridan-survey
pnpm install
```

## 2. Supabase 설정

### 2.1. Supabase 프로젝트 생성
1. [Supabase](https://supabase.com) 접속
2. 새 프로젝트 생성
3. 프로젝트 URL과 API 키 복사

### 2.2. 환경 변수 설정
`.env.local.example` 파일을 복사하여 `.env.local` 생성:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_role_key

# App Settings
NEXT_PUBLIC_COUPON_AMOUNT=500
NEXT_PUBLIC_COUPON_VALIDITY_HOURS=24
```

### 2.3. 데이터베이스 스키마 적용
1. Supabase 대시보드 → SQL Editor 열기
2. `database/schema.sql` 파일 내용 복사
3. SQL Editor에 붙여넣고 실행
4. 테이블과 초기 데이터(24개 가맹점) 자동 생성됨

## 3. 개발 서버 실행

```bash
pnpm dev
```

브라우저에서 http://localhost:3000 접속

## 4. 빌드 및 배포

### 로컬 빌드
```bash
pnpm build
pnpm start
```

### Vercel 배포
1. GitHub에 푸시
2. [Vercel](https://vercel.com) 접속
3. 프로젝트 Import
4. 환경 변수 설정:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_KEY`
   - `NEXT_PUBLIC_COUPON_AMOUNT`
   - `NEXT_PUBLIC_COUPON_VALIDITY_HOURS`
5. 배포 완료!

## 5. 초기 설정

### 관리자 비밀번호 변경
1. Supabase → Table Editor → `settings` 테이블
2. `key = 'admin_password'` 행 찾기
3. `value` 컬럼 값을 원하는 비밀번호로 변경

### 예산 설정
1. Supabase → Table Editor → `settings` 테이블
2. `key = 'total_budget'` 행 찾기
3. `value` 컬럼 값을 원하는 예산으로 변경 (예: 200000)

## 6. 사용 방법

### 고객용
- 메인 페이지: `/`
- 설문 시작 → 쿠폰 발급 → 2단계 설문 → 추첨 응모

### 점원용
- 가맹점 스캔 페이지: `/store/[가맹점ID]`
- QR 스캔 또는 숫자 코드 입력으로 쿠폰 사용 처리

### 관리자용
- 로그인: `/admin`
- 대시보드: `/admin/dashboard`
- 통계 및 데이터 확인

## 7. 주요 URL

### 고객용
- `/` - 설문 시작
- `/survey/step1` - 1단계 설문
- `/survey/step2` - 2단계 설문
- `/coupon/[id]` - 쿠폰 표시
- `/raffle` - 추첨 응모
- `/complete` - 완료
- `/stores` - 가맹점 목록

### 점원용
- `/store/[storeId]` - QR 스캔
- `/store/[storeId]/manual` - 숫자 코드 입력
- `/store/[storeId]/complete` - 사용 완료

### 관리자용
- `/admin` - 로그인
- `/admin/dashboard` - 대시보드

## 8. 문제 해결

### "supabaseUrl is required" 오류
- `.env.local` 파일이 있는지 확인
- 환경 변수가 올바르게 설정되었는지 확인
- 개발 서버 재시작

### QR 스캔이 안 됨
- HTTPS 환경에서만 작동 (로컬은 localhost OK)
- 카메라 권한 확인
- 숫자 코드 수동 입력 기능 사용

### 빌드 오류
```bash
rm -rf .next node_modules
pnpm install
pnpm build
```

## 9. 기술 지원

문제가 발생하면 GitHub Issues에 등록해주세요.

