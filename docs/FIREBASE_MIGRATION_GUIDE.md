# Supabase → Firebase 마이그레이션 가이드

## 1. 핵심 변경 사항

### 패키지 변경

```bash
# 제거
npm uninstall @supabase/supabase-js

# 추가 (이미 설치됨)
npm install firebase firebase-admin
```

### 환경변수 변경

```bash
# 기존 (Supabase)
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_KEY=...

# 신규 (Firebase)
FIREBASE_PROJECT_ID=bonghwang-memories
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}  # JSON 문자열
```

---

## 2. 코드 패턴 비교

### Import 변경

```typescript
// ❌ Supabase
import { supabaseAdmin } from '@/lib/supabase';

// ✅ Firebase
import { db, COLLECTIONS, Timestamp } from '@/lib/firebase';
```

### 데이터 조회

```typescript
// ❌ Supabase
const { data, error } = await supabaseAdmin
  .from('surveys')
  .select('*')
  .eq('device_id', deviceId)
  .single();

// ✅ Firebase
const doc = await db.collection(COLLECTIONS.SURVEYS)
  .where('device_id', '==', deviceId)
  .limit(1)
  .get();
const data = doc.empty ? null : doc.docs[0].data();
```

### 데이터 삽입

```typescript
// ❌ Supabase
const { data, error } = await supabaseAdmin
  .from('surveys')
  .insert({ device_id, ... })
  .select()
  .single();

// ✅ Firebase
const docRef = db.collection(COLLECTIONS.SURVEYS).doc();
await docRef.set({
  device_id,
  created_at: Timestamp.now(),
  ...
});
const data = { id: docRef.id, ... };
```

### 데이터 업데이트

```typescript
// ❌ Supabase
await supabaseAdmin
  .from('coupons')
  .update({ status: 'used', used_at: new Date() })
  .eq('id', couponId);

// ✅ Firebase
await db.collection(COLLECTIONS.COUPONS).doc(couponId).update({
  status: 'used',
  used_at: Timestamp.now(),
});
```

### 카운트 조회

```typescript
// ❌ Supabase
const { count } = await supabaseAdmin
  .from('coupons')
  .select('*', { count: 'exact', head: true })
  .eq('status', 'used');

// ✅ Firebase (aggregation 사용)
const snapshot = await db.collection(COLLECTIONS.COUPONS)
  .where('status', '==', 'used')
  .count()
  .get();
const count = snapshot.data().count;
```

### 트랜잭션

```typescript
// ❌ Supabase (별도 처리 필요)
// 트랜잭션 지원 제한적

// ✅ Firebase
await db.runTransaction(async (transaction) => {
  const surveyRef = db.collection(COLLECTIONS.SURVEYS).doc();
  const couponRef = db.collection(COLLECTIONS.COUPONS).doc();
  
  transaction.set(surveyRef, surveyData);
  transaction.set(couponRef, couponData);
});
```

---

## 3. Firestore 컬렉션 구조

```
firestore/
├── surveys/
│   └── {surveyId}
│       ├── device_id: string
│       ├── q1_region: string
│       ├── q2_age: string
│       ├── q3_activity: string[]
│       ├── ...
│       ├── stage_completed: number
│       └── created_at: timestamp
│
├── coupons/
│   └── {couponId}
│       ├── code: string
│       ├── survey_id: string
│       ├── amount: number
│       ├── status: 'issued' | 'used' | 'expired'
│       ├── issued_at: timestamp
│       ├── expires_at: timestamp
│       ├── used_at: timestamp | null
│       └── used_store_id: string | null
│
├── stores/
│   └── {storeId}
│       ├── name: string
│       ├── manager_name: string
│       ├── manager_phone: string
│       ├── is_active: boolean
│       └── total_settled: number
│
├── settlements/
│   └── {settlementId}
│       ├── store_id: string
│       ├── amount: number
│       ├── note: string
│       ├── settled_by: string
│       └── created_at: timestamp
│
├── raffle_entries/
│   └── {entryId}
│       ├── survey_id: string
│       ├── name: string
│       ├── phone: string
│       ├── agreed_privacy: boolean
│       └── created_at: timestamp
│
├── settings/
│   └── {key}
│       ├── value: string
│       └── updated_at: timestamp
│
└── api_keys/
    └── {keyId}
        ├── key_hash: string
        ├── key_prefix: string
        ├── partner_name: string
        ├── partner_contact: string
        ├── permissions: string[]
        ├── rate_limit: number
        ├── is_active: boolean
        ├── created_at: timestamp
        ├── last_used_at: timestamp | null
        └── expires_at: timestamp | null
```

---

## 4. Firestore 보안 규칙

```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 모든 컬렉션은 서버(Admin SDK)에서만 접근
    // 클라이언트 직접 접근 차단
    match /{document=**} {
      allow read, write: if false;
    }
    
    // 가맹점 목록은 읽기 허용 (선택적)
    match /stores/{storeId} {
      allow read: if true;
      allow write: if false;
    }
  }
}
```

---

## 5. 마이그레이션 단계

### 단계 1: Firebase 프로젝트 설정
1. 봉황메모리즈의 Firebase 프로젝트 사용
2. Firestore 데이터베이스 생성 (이미 있으면 스킵)
3. 서비스 계정 키 발급

### 단계 2: 환경변수 설정 (Vercel)
```
FIREBASE_PROJECT_ID=bonghwang-memories
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"..."}
JWT_SECRET=your-secure-secret
```

### 단계 3: 초기 데이터 마이그레이션
```typescript
// scripts/migrate-to-firebase.ts
// 기존 Supabase 데이터 → Firestore 이관
```

### 단계 4: 코드 전환
```bash
# 1. lib/supabase.ts → lib/firebase.ts (완료)
# 2. lib/auth.ts → lib/auth-firebase.ts (완료)
# 3. 각 API route 전환
```

### 단계 5: 테스트 및 배포

---

## 6. 봉황메모리즈 통합 시 추천

봉황메모리즈에 **완전 통합**할 경우:

1. **이 프로젝트의 API 로직만 참고**
2. **봉황메모리즈 앱 내에 직접 구현**
3. **별도 API 서버 없이 Firebase 직접 접근**

```
봉황메모리즈 앱
├── firebase/
│   ├── config.ts (기존 설정 활용)
│   └── survey.ts (설문 관련 함수)
├── screens/
│   ├── Survey/
│   └── MyCoupons/
└── ...
```

이렇게 하면 **별도 프로젝트/서버 없이** 봉황메모리즈 하나로 모든 기능 운영 가능!
