// Firebase 설정 및 초기화

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

// Firebase Admin SDK 초기화 (서버 사이드)
function initializeFirebaseAdmin() {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  // 환경변수에서 서비스 계정 정보 가져오기
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (!serviceAccount) {
    // 운영 환경에서는 반드시 설정되어야 함
    if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
      throw new Error(
        'FIREBASE_SERVICE_ACCOUNT_KEY is required in production. ' +
        'Please set the environment variable in Vercel project settings.'
      );
    }
    // 로컬 개발 환경에서만 에뮬레이터 사용 (명시적 프로젝트 ID 필수)
    const projectId = process.env.FIREBASE_PROJECT_ID;
    if (!projectId) {
      throw new Error(
        'FIREBASE_PROJECT_ID is required when FIREBASE_SERVICE_ACCOUNT_KEY is not set.'
      );
    }
    console.warn('Warning: Using Firebase without service account (dev mode)');
    return initializeApp({ projectId });
  }

  try {
    const parsedServiceAccount = JSON.parse(serviceAccount);
    return initializeApp({
      credential: cert(parsedServiceAccount),
      projectId: parsedServiceAccount.project_id,
    });
  } catch (error) {
    console.error('Failed to parse Firebase service account:', error);
    throw new Error('Invalid FIREBASE_SERVICE_ACCOUNT_KEY');
  }
}

// Firebase Admin 앱 초기화
const app = initializeFirebaseAdmin();

// Firestore 인스턴스
export const db = getFirestore(app);

// Firestore 컬렉션 이름
export const COLLECTIONS = {
  SURVEYS: 'surveys',
  COUPONS: 'coupons',
  STORES: 'stores',
  SETTLEMENTS: 'settlements',
  RAFFLE_ENTRIES: 'raffle_entries',
  SETTINGS: 'settings',
  API_KEYS: 'api_keys',
} as const;

// Timestamp 헬퍼
export { Timestamp };

// 날짜 변환 헬퍼
export function toFirestoreTimestamp(date: Date): Timestamp {
  return Timestamp.fromDate(date);
}

export function fromFirestoreTimestamp(timestamp: Timestamp): Date {
  return timestamp.toDate();
}

// 문서 ID 생성 헬퍼
export function generateId(): string {
  return db.collection('_').doc().id;
}

// 쿠폰 코드 생성 (6자리 영문+숫자)
export async function generateCouponCode(): Promise<string> {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 혼동 문자 제외 (I, O, 0, 1)
  const maxRetries = 10;

  for (let retry = 0; retry < maxRetries; retry++) {
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // 중복 체크
    const existing = await db
      .collection(COLLECTIONS.COUPONS)
      .where('code', '==', code)
      .limit(1)
      .get();

    if (existing.empty) {
      return code;
    }
  }

  throw new Error('Failed to generate unique coupon code');
}

// 설정 값 조회
export async function getSetting(key: string): Promise<string | null> {
  const doc = await db.collection(COLLECTIONS.SETTINGS).doc(key).get();
  if (!doc.exists) {
    return null;
  }
  return doc.data()?.value || null;
}

// 설정 값 업데이트
export async function setSetting(key: string, value: string): Promise<void> {
  await db.collection(COLLECTIONS.SETTINGS).doc(key).set({
    value,
    updated_at: Timestamp.now(),
  }, { merge: true });
}
