import { NextRequest, NextResponse } from 'next/server';
import { db, COLLECTIONS, Timestamp, generateId } from '@/lib/firebase';
import { createApiKey } from '@/lib/apiKey';

// Node.js 런타임 사용
export const runtime = 'nodejs';

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
  { key: 'admin_password', value: 'bongridan2024!' }, // 초기 비밀번호 (변경 필요!)
  { key: 'coupon_amount', value: '500' },
  { key: 'coupon_validity_hours', value: '24' },
  { key: 'survey_active', value: 'true' },
  { key: 'total_budget', value: '280000' },
  { key: 'raffle_prizes', value: '3' },
];

/**
 * 초기 데이터 시드 + API 키 발급
 *
 * GET /api/admin/seed?secret=bongridan-seed-2024
 *
 * ⚠️ 한 번만 실행! 배포 후 이 파일 삭제 권장
 */
async function seedDatabase(request: NextRequest) {
  try {
    // 시크릿 키 확인
    const secret = request.nextUrl.searchParams.get('secret');
    const expectedSecret = process.env.SEED_SECRET || 'bongridan-seed-2024';

    if (secret !== expectedSecret) {
      return NextResponse.json(
        { success: false, message: 'Invalid secret' },
        { status: 401 }
      );
    }

    const now = Timestamp.now();
    const results = {
      stores: 0,
      settings: 0,
      api_key: null as string | null,
    };

    // 이미 데이터가 있는지 확인
    const existingStores = await db.collection(COLLECTIONS.STORES).limit(1).get();

    if (existingStores.empty) {
      // 가맹점 데이터 추가
      for (const store of STORES) {
        await db.collection(COLLECTIONS.STORES).doc(store.id).set({
          name: store.name,
          is_active: true,
          total_settled: 0,
          created_at: now,
        });
        results.stores++;
      }

      // 설정 데이터 추가
      for (const setting of SETTINGS) {
        await db.collection(COLLECTIONS.SETTINGS).doc(setting.key).set({
          value: setting.value,
          updated_at: now,
        });
        results.settings++;
      }
    } else {
      return NextResponse.json({
        success: false,
        message: '이미 데이터가 존재합니다. API 키만 발급하려면 ?secret=...&apikey=true 를 사용하세요.',
      });
    }

    // 봉황메모리즈용 API 키 생성
    const apiKeyResult = await createApiKey({
      partnerName: '봉황메모리즈',
      partnerContact: 'socialceos@gmail.com',
      permissions: ['survey', 'coupon', 'device'],
      rateLimitPerHour: 10000,
      expiresInDays: 365,
    });

    if (apiKeyResult) {
      results.api_key = apiKeyResult.key;
    }

    return NextResponse.json({
      success: true,
      message: '초기 데이터 시드 완료!',
      results: {
        stores: results.stores,
        settings: results.settings,
      },
      api_key: results.api_key,
      api_key_warning: '⚠️ 이 키는 다시 확인할 수 없습니다. 안전하게 보관하세요!',
      next_steps: [
        '1. 위 api_key를 봉황메모리즈 팀에 전달',
        '2. Firebase Console에서 admin_password 변경',
        '3. 이 API 파일(app/api/admin/seed/route.ts) 삭제',
      ],
    });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Seed 실패',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return seedDatabase(request);
}

export async function POST(request: NextRequest) {
  return seedDatabase(request);
}
