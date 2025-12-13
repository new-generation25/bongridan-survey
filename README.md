# 봉리단길 방문객 설문조사 시스템

## 프로젝트 개요
봉리단길 방문객 설문 수집, 쿠폰 발급/사용, 데이터 분석 시스템

## 기술 스택
- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS
- Supabase (PostgreSQL)
- Vercel

## 시작하기

### 1. 의존성 설치
```bash
pnpm install
```

### 2. 환경 변수 설정
`.env.local.example`을 복사하여 `.env.local` 파일을 생성하고 필요한 값을 입력하세요.

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_KEY=your_supabase_service_key_here

NEXT_PUBLIC_COUPON_AMOUNT=500
NEXT_PUBLIC_COUPON_VALIDITY_HOURS=24
```

### 3. 데이터베이스 스키마 적용
1. Supabase 대시보드에서 SQL Editor 열기
2. `database/schema.sql` 파일의 SQL을 복사하여 실행
3. 테이블과 초기 데이터가 생성됩니다

### 4. 개발 서버 실행
```bash
pnpm dev
```

브라우저에서 http://localhost:3000 열기

## 프로젝트 구조
```
bongridan-survey/
├── app/                      # Next.js App Router
│   ├── api/                  # API 라우트
│   │   ├── survey/          # 설문 API
│   │   ├── coupon/          # 쿠폰 API
│   │   ├── stores/          # 가맹점 API
│   │   └── raffle/          # 추첨 API
│   ├── survey/              # 설문 페이지
│   ├── coupon/              # 쿠폰 페이지
│   ├── store/               # 점원용 페이지
│   ├── raffle/              # 추첨 페이지
│   ├── complete/            # 완료 페이지
│   └── stores/              # 가맹점 목록
├── components/              # 재사용 컴포넌트
│   └── ui/                  # UI 컴포넌트
├── lib/                     # 유틸리티
│   ├── supabase.ts         # Supabase 클라이언트
│   ├── types.ts            # TypeScript 타입
│   ├── constants.ts        # 상수
│   └── utils.ts            # 유틸 함수
├── database/               # 데이터베이스
│   └── schema.sql         # 스키마 정의
└── public/                # 정적 파일
```

## 주요 기능

### 고객용
- ✅ 2단계 설문조사 시스템
- ✅ 쿠폰 자동 발급 (QR 코드 + 숫자 코드)
- ✅ 추첨 응모 시스템
- ✅ 가맹점 목록 조회
- ✅ 중복 응답 방지 (디바이스 ID 기반)

### 점원용
- ✅ QR 코드 스캔 (html5-qrcode)
- ✅ 숫자 코드 수동 입력
- ✅ 쿠폰 유효성 검증
- ✅ 실시간 사용 통계

### 관리자용
- ✅ 대시보드 (통계 및 차트)
- ✅ 가맹점 관리
- ✅ 정산 관리
- ✅ 추첨 응모자 목록
- ✅ QR 코드 생성

## URL 구조

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
- `/admin/stores` - 가맹점 관리
- `/admin/settlements` - 정산 관리
- `/admin/raffle` - 추첨 응모자
- `/admin/qr` - QR 코드 생성

## 배포

### Vercel 배포
1. GitHub에 푸시
2. Vercel에서 프로젝트 import
3. 환경 변수 설정
4. 배포

### 환경 변수 설정 (Vercel)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_KEY`
- `NEXT_PUBLIC_COUPON_AMOUNT`
- `NEXT_PUBLIC_COUPON_VALIDITY_HOURS`

## 개발 상태

✅ 완료:
- 프로젝트 초기 설정
- 데이터베이스 스키마
- 공통 UI 컴포넌트
- API 라우트 (설문, 쿠폰, 가맹점)
- 고객용 페이지 (설문, 쿠폰, 추첨)
- 점원용 페이지 (QR 스캔)
- 관리자 페이지 (대시보드, 가맹점, 정산, 추첨, QR)

## 라이선스
MIT

## 문의
프로젝트 관련 문의사항이 있으시면 이슈를 등록해주세요.
