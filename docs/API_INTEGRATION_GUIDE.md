# 봉리단길 설문 API 연동 가이드

## 개요

이 문서는 봉황메모리즈 앱에서 봉리단길 설문 API를 연동하기 위한 기술 가이드입니다.

### Base URL
```
Production: https://bongridan-survey.vercel.app
Development: http://localhost:3000
```

---

## 인증

### API 키 인증

모든 외부 요청에는 API 키가 필요합니다.

```http
X-API-Key: {발급받은_API_키}
```

**요청 예시:**
```bash
curl -X POST https://bongridan-survey.vercel.app/api/survey/step1 \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key-here" \
  -d '{"device_id": "memories_user_123", ...}'
```

### API 키 발급

API 키는 관리자에게 요청하여 발급받습니다. 발급된 키는 환경 변수 `PARTNER_API_KEYS`에 등록됩니다.

---

## 엔드포인트

### 1. 설문 1단계 저장

사용자의 기본 정보와 방문 목적을 저장합니다.

```http
POST /api/survey/step1
```

**Headers:**
```
Content-Type: application/json
X-API-Key: {API_KEY}
```

**Request Body:**
```json
{
  "device_id": "memories_user_12345",
  "region": "김해시",
  "gimhae_dong": "봉황동",
  "age_group": "20대 초반 (20~24세)",
  "activities": ["카페/디저트", "사진 촬영"],
  "visit_occasion": "일상적인 외출/휴식",
  "visit_channel": "SNS (인스타그램, 유튜브 등)",
  "budget": "2~3만원",
  "companion": "친구",
  "frequency": "월 1~2회"
}
```

**필드 설명:**

| 필드 | 타입 | 필수 | 설명 | 허용값 |
|------|------|------|------|--------|
| device_id | string | ✅ | 사용자 식별자 (메모리즈 user_id) | 5자 이상 |
| region | string | ✅ | 거주 지역 | 김해시, 부산시, 양산시, 창원시, 경남 기타 지역, 그 외 지역 |
| gimhae_dong | string | ❌ | 김해시 동 (region이 김해시일 때만) | 봉황동, 내외동, 삼계동, 장유동, 기타 |
| age_group | string | ✅ | 연령대 | 10대, 20대 초반 (20~24세), 20대 후반 (25~29세), 30대 초반 (30~34세), 30대 후반 (35~39세), 40대, 50대 이상 |
| activities | string[] | ✅ | 이용 예정 활동 (복수) | 카페/디저트, 식사, 쇼핑/구경, 사진 촬영, 산책/여가, 기타 |
| visit_occasion | string | ✅ | 방문 계기 | 일상적인 외출/휴식, 특별한 날 (생일, 기념일 등), 관광/여행 중, 업무/미팅, 우연히 지나가다, 기타 |
| visit_channel | string | ✅ | 방문 경로 | SNS (인스타그램, 유튜브 등), 지인 추천, 검색/블로그 (네이버, 구글 등), TV/언론 보도, 우연히 지나가다, 기타 |
| budget | string | ✅ | 예상 지출 | 1만원 미만, 1~2만원, 2~3만원, 3~5만원, 5만원 이상 |
| companion | string | ✅ | 동행 유형 | 혼자, 친구, 연인, 가족, 직장 동료, 기타 |
| frequency | string | ✅ | 방문 빈도 | 처음 방문, 연 1~2회, 월 1~2회, 주 1회 이상 |

**Response (성공):**
```json
{
  "success": true,
  "survey_id": "550e8400-e29b-41d4-a716-446655440000",
  "message": "설문이 저장되었습니다"
}
```

**Response (중복 참여):**
```json
{
  "success": false,
  "message": "오늘 이미 참여하셨습니다. 내일 다시 참여해주세요!",
  "code": "DUPLICATE_RESPONSE"
}
```

---

### 2. 설문 2단계 저장 + 쿠폰 발급

만족도 및 피드백을 저장하고 쿠폰을 발급합니다.

```http
POST /api/survey/step2
```

**Request Body:**
```json
{
  "survey_id": "550e8400-e29b-41d4-a716-446655440000",
  "device_id": "memories_user_12345",
  "duration": "1~2시간",
  "satisfaction": "만족",
  "improvements": ["주차 불편", "볼거리 부족"],
  "other_spots": ["수로왕릉/대성동고분군", "봉황대/국립김해박물관"],
  "feedback": "전체적으로 좋았어요!"
}
```

**필드 설명:**

| 필드 | 타입 | 필수 | 설명 | 허용값 |
|------|------|------|------|--------|
| survey_id | string | ✅ | 1단계에서 받은 설문 ID | UUID |
| device_id | string | ✅ | 사용자 식별자 | 1단계와 동일 |
| duration | string | ✅ | 체류 시간 | 1시간 미만, 1~2시간, 3~4시간, 1박 |
| satisfaction | string | ✅ | 만족도 | 매우 만족, 만족, 보통, 불만족, 매우 불만족 |
| improvements | string[] | ✅ | 개선사항 (복수) | 주차 불편, 가게 종류 부족, 볼거리 부족, 안내/정보 부족, 가격이 비쌈, 특별히 없음, 기타 |
| other_spots | string[] | ✅ | 다른 관광지 관심 (복수) | 수로왕릉/대성동고분군, 김해한옥체험관, 봉황대/국립김해박물관, 가야테마파크, 장유/율하 카페거리, 롯데프리미엄아울렛 등 쇼핑시설, 잘 모르겠음, 기타 |
| feedback | string | ❌ | 자유 의견 | 최대 500자 |

**Response (성공):**
```json
{
  "success": true,
  "message": "설문이 완료되었습니다",
  "coupon": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "code": "BRD-ABC123",
    "discount_amount": 500,
    "expires_at": "2026-08-24T12:00:00.000Z"
  }
}
```

---

### 3. 사용자 쿠폰 목록 조회

특정 device_id의 모든 쿠폰을 조회합니다.

```http
GET /api/coupon/by-device/{deviceId}
```

**Query Parameters:**

| 파라미터 | 타입 | 기본값 | 설명 |
|----------|------|--------|------|
| status | string | all | 쿠폰 상태 필터 (all, active, used, expired) |
| limit | number | 20 | 조회 개수 (최대 100) |
| offset | number | 0 | 페이지네이션 오프셋 |

**Request 예시:**
```http
GET /api/coupon/by-device/memories_user_12345?status=active&limit=10
```

**Response:**
```json
{
  "success": true,
  "coupons": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "code": "BRD-ABC123",
      "status": "active",
      "discount_amount": 500,
      "created_at": "2026-08-23T12:00:00.000Z",
      "expires_at": "2026-08-24T12:00:00.000Z",
      "used_at": null,
      "used_store_id": null,
      "used_store_name": null,
      "qr_data": "bongridan://coupon/660e8400-e29b-41d4-a716-446655440001"
    }
  ],
  "total": 1,
  "pagination": {
    "limit": 10,
    "offset": 0,
    "has_more": false
  }
}
```

---

### 4. 쿠폰 상세 조회

쿠폰 ID로 상세 정보를 조회합니다.

```http
GET /api/coupon/{couponId}
```

**Response:**
```json
{
  "success": true,
  "coupon": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "code": "BRD-ABC123",
    "status": "active",
    "discount_amount": 500,
    "created_at": "2026-08-23T12:00:00.000Z",
    "expires_at": "2026-08-24T12:00:00.000Z",
    "survey_stage_completed": 2,
    "raffle_entered": false
  }
}
```

---

### 5. 가맹점 목록 조회

쿠폰 사용 가능한 가맹점 목록을 조회합니다.

```http
GET /api/stores
```

**Response:**
```json
{
  "success": true,
  "stores": [
    {
      "id": "store-uuid",
      "name": "봉황카페",
      "category": "카페",
      "address": "김해시 봉황동 123",
      "image_url": "https://...",
      "is_active": true
    }
  ]
}
```

---

## 에러 코드

| 코드 | HTTP Status | 설명 |
|------|-------------|------|
| UNAUTHORIZED | 401 | API 키 누락 또는 유효하지 않음 |
| INVALID_API_KEY | 401 | API 키가 유효하지 않음 |
| INVALID_DEVICE_ID | 400 | device_id가 유효하지 않음 |
| INVALID_REQUEST | 400 | 요청 형식 오류 |
| DUPLICATE_RESPONSE | 409 | 오늘 이미 설문 참여함 |
| COUPON_NOT_FOUND | 404 | 쿠폰을 찾을 수 없음 |
| COUPON_EXPIRED | 400 | 쿠폰이 만료됨 |
| COUPON_USED | 400 | 쿠폰이 이미 사용됨 |
| STORE_NOT_FOUND | 404 | 가맹점을 찾을 수 없음 |
| INTERNAL_ERROR | 500 | 서버 내부 오류 |

---

## 연동 예시 코드

### React Native (봉황메모리즈)

```typescript
// api/bongridan.ts
const API_BASE_URL = 'https://bongridan-survey.vercel.app';
const API_KEY = process.env.BONGRIDAN_API_KEY;

interface SurveyStep1Data {
  device_id: string;
  region: string;
  gimhae_dong?: string;
  age_group: string;
  activities: string[];
  visit_occasion: string;
  visit_channel: string;
  budget: string;
  companion: string;
  frequency: string;
}

interface SurveyStep2Data {
  survey_id: string;
  device_id: string;
  duration: string;
  satisfaction: string;
  improvements: string[];
  other_spots: string[];
  feedback?: string;
}

// 설문 1단계 제출
export async function submitSurveyStep1(data: SurveyStep1Data) {
  const response = await fetch(`${API_BASE_URL}/api/survey/step1`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
    },
    body: JSON.stringify(data),
  });

  return response.json();
}

// 설문 2단계 제출 + 쿠폰 발급
export async function submitSurveyStep2(data: SurveyStep2Data) {
  const response = await fetch(`${API_BASE_URL}/api/survey/step2`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
    },
    body: JSON.stringify(data),
  });

  return response.json();
}

// 내 쿠폰 목록 조회
export async function getMyCoupons(deviceId: string, status = 'all') {
  const response = await fetch(
    `${API_BASE_URL}/api/coupon/by-device/${deviceId}?status=${status}`,
    {
      headers: {
        'X-API-Key': API_KEY,
      },
    }
  );

  return response.json();
}

// 쿠폰 상세 조회
export async function getCouponDetail(couponId: string) {
  const response = await fetch(`${API_BASE_URL}/api/coupon/${couponId}`, {
    headers: {
      'X-API-Key': API_KEY,
    },
  });

  return response.json();
}

// 가맹점 목록 조회
export async function getStores() {
  const response = await fetch(`${API_BASE_URL}/api/stores`, {
    headers: {
      'X-API-Key': API_KEY,
    },
  });

  return response.json();
}
```

### 사용 예시

```typescript
// 설문 화면에서
import { submitSurveyStep1, submitSurveyStep2 } from './api/bongridan';

const handleSubmitSurvey = async () => {
  // 1단계 제출
  const step1Result = await submitSurveyStep1({
    device_id: memoriesUserId,  // 봉황메모리즈 사용자 ID
    region: '김해시',
    gimhae_dong: '봉황동',
    age_group: '20대 초반 (20~24세)',
    activities: ['카페/디저트', '사진 촬영'],
    visit_occasion: '일상적인 외출/휴식',
    visit_channel: 'SNS (인스타그램, 유튜브 등)',
    budget: '2~3만원',
    companion: '친구',
    frequency: '월 1~2회',
  });

  if (!step1Result.success) {
    Alert.alert('오류', step1Result.message);
    return;
  }

  // 2단계 제출 + 쿠폰 발급
  const step2Result = await submitSurveyStep2({
    survey_id: step1Result.survey_id,
    device_id: memoriesUserId,
    duration: '1~2시간',
    satisfaction: '만족',
    improvements: ['특별히 없음'],
    other_spots: ['봉황대/국립김해박물관'],
    feedback: '좋은 경험이었습니다!',
  });

  if (step2Result.success) {
    Alert.alert('🎉 설문 완료!', `쿠폰 코드: ${step2Result.coupon.code}`);
    // 쿠폰함으로 이동
    navigation.navigate('MyCoupons');
  }
};
```

---

## 주의사항

1. **API 키 보안**: API 키는 서버사이드에서만 사용하고, 클라이언트에 노출하지 마세요.

2. **중복 참여 제한**: 같은 device_id로 하루에 한 번만 설문 참여 가능합니다.

3. **쿠폰 유효기간**: 쿠폰은 발급 후 24시간 동안 유효합니다.

4. **Rate Limiting**: 과도한 요청 시 일시적으로 차단될 수 있습니다 (추후 적용 예정).

---

## 문의

API 연동 관련 문의는 관리자에게 연락해주세요.
