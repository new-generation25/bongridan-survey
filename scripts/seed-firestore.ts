/**
 * Firestore 초기 데이터 시드 스크립트
 *
 * 사용법:
 * 1. Firebase 서비스 계정 키 JSON 파일 준비
 * 2. 환경변수 설정: export FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'
 * 3. 실행: npx ts-node scripts/seed-firestore.ts
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

// 서비스 계정 키 확인
const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
if (!serviceAccountKey) {
  console.error('❌ FIREBASE_SERVICE_ACCOUNT_KEY 환경변수를 설정하세요.');
  console.log('\n예시:');
  console.log('export FIREBASE_SERVICE_ACCOUNT_KEY=\'{"type":"service_account",...}\'');
  process.exit(1);
}

// Firebase 초기화
const app = initializeApp({
  credential: cert(JSON.parse(serviceAccountKey)),
});
const db = getFirestore(app);

// 가맹점 데이터 (24개)
const STORES = [
  { id: '01', name: '너글스' },
  { id: '02', name: '퐁세' },
  { id: '03', name: '카츠타다이' },
  { id: '04', name: '토그커피샵' },
  { id: '05', name: '왓포식당' },
  { id: '06', name: '공원반점' },
  { id: '07', name: '덴웨스' },
  { id: '08', name: '니치니치' },
  { id: '09', name: '봉황1935' },
  { id: '10', name: '희유' },
  { id: '11', name: '하루담' },
  { id: '12', name: '미야상회' },
  { id: '13', name: '서부커피' },
  { id: '14', name: '오히루텐' },
  { id: '15', name: '초이블리' },
  { id: '16', name: '호우오우' },
  { id: '17', name: '씅카츠' },
  { id: '18', name: '카페탱자' },
  { id: '19', name: '올던하우스' },
  { id: '20', name: '샤브샵' },
  { id: '21', name: '해온정' },
  { id: '22', name: '사계' },
  { id: '23', name: '밤비공기' },
  { id: '24', name: '밀집' },
];

// 설정 데이터
const SETTINGS = [
  { key: 'admin_password', value: 'change_this_password' },
  { key: 'coupon_amount', value: '500' },
  { key: 'coupon_validity_hours', value: '24' },
  { key: 'survey_active', value: 'true' },
  { key: 'total_budget', value: '280000' },
  { key: 'raffle_prizes', value: '3' },
];

async function seedFirestore() {
  console.log('🔥 Firestore 초기 데이터 시드 시작...\n');

  const batch = db.batch();
  const now = Timestamp.now();

  // 가맹점 데이터 추가
  console.log('📍 가맹점 데이터 추가 중...');
  for (const store of STORES) {
    const ref = db.collection('stores').doc(store.id);
    batch.set(ref, {
      name: store.name,
      is_active: true,
      total_settled: 0,
      created_at: now,
    });
    console.log(`   ✓ ${store.id}: ${store.name}`);
  }

  // 설정 데이터 추가
  console.log('\n⚙️  설정 데이터 추가 중...');
  for (const setting of SETTINGS) {
    const ref = db.collection('settings').doc(setting.key);
    batch.set(ref, {
      value: setting.value,
      updated_at: now,
    });
    console.log(`   ✓ ${setting.key}: ${setting.value}`);
  }

  // 배치 커밋
  await batch.commit();

  console.log('\n✅ Firestore 초기 데이터 시드 완료!');
  console.log('\n📝 다음 단계:');
  console.log('   1. Firebase Console에서 admin_password 값을 변경하세요');
  console.log('   2. Vercel에 환경변수를 설정하세요');
  console.log('   3. PR을 머지하고 배포하세요');
}

// 실행
seedFirestore().catch((error) => {
  console.error('❌ 시드 실패:', error);
  process.exit(1);
});
