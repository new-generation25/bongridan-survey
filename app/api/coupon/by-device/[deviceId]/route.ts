import { NextRequest, NextResponse } from 'next/server';
import { db, COLLECTIONS } from '@/lib/firebase';
import { ERROR_MESSAGES } from '@/lib/constants';

// Node.js 런타임 사용
export const runtime = 'nodejs';

/**
 * 디바이스 ID로 쿠폰 목록 조회
 * 봉황메모리즈 연동용 API
 *
 * GET /api/coupon/by-device/{deviceId}
 *
 * Query Parameters:
 * - status: 'all' | 'active' | 'used' | 'expired' (기본값: 'all')
 * - limit: number (기본값: 20, 최대: 100)
 * - offset: number (기본값: 0)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  try {
    const { deviceId } = await params;
    const searchParams = request.nextUrl.searchParams;

    // 쿼리 파라미터 파싱
    const status = searchParams.get('status') || 'all';
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!deviceId || deviceId.length < 5) {
      return NextResponse.json(
        { success: false, message: 'Invalid device ID', code: 'INVALID_DEVICE_ID' },
        { status: 400 }
      );
    }

    // 해당 device_id로 생성된 설문 조회
    const surveysSnapshot = await db
      .collection(COLLECTIONS.SURVEYS)
      .where('device_id', '==', deviceId)
      .get();

    if (surveysSnapshot.empty) {
      return NextResponse.json({
        success: true,
        coupons: [],
        total: 0,
        message: 'No surveys found for this device'
      });
    }

    const surveyIds = surveysSnapshot.docs.map(doc => doc.id);

    // 쿠폰 조회 쿼리 빌드
    let query = db
      .collection(COLLECTIONS.COUPONS)
      .where('survey_id', 'in', surveyIds.slice(0, 10)) // Firestore 'in' 최대 10개
      .orderBy('issued_at', 'desc');

    // 상태 필터 (별도 쿼리 필요 - Firestore 제한)
    const couponsSnapshot = await query.get();

    let coupons = couponsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        code: data.code as string,
        status: data.status as string,
        amount: data.amount as number,
        survey_id: data.survey_id as string,
        issued_at: data.issued_at,
        expires_at: data.expires_at,
        used_at: data.used_at,
        used_store_id: data.used_store_id as string | undefined,
      };
    });

    // 상태 필터 (클라이언트 사이드)
    if (status !== 'all') {
      coupons = coupons.filter(c => c.status === status);
    }

    // 페이지네이션 (클라이언트 사이드)
    const total = coupons.length;
    coupons = coupons.slice(offset, offset + limit);

    // 쿠폰 데이터 가공
    const safeCoupons = coupons.map(coupon => ({
      id: coupon.id,
      code: coupon.code,
      status: coupon.status,
      discount_amount: coupon.amount,
      created_at: coupon.issued_at?.toDate?.() || coupon.issued_at,
      expires_at: coupon.expires_at?.toDate?.() || coupon.expires_at,
      used_at: coupon.used_at?.toDate?.() || coupon.used_at,
      used_store_id: coupon.used_store_id,
      qr_data: `bongridan://coupon/${coupon.id}`,
    }));

    // 사용된 가맹점 정보 조회
    const usedStoreIds = [...new Set(safeCoupons
      .filter((c): c is typeof c & { used_store_id: string } => !!c.used_store_id)
      .map(c => c.used_store_id))];

    const storesMap: Record<string, string> = {};
    for (const storeId of usedStoreIds) {
      const storeDoc = await db
        .collection(COLLECTIONS.STORES)
        .doc(storeId)
        .get();
      if (storeDoc.exists) {
        storesMap[storeId] = storeDoc.data()?.name || '';
      }
    }

    // 가맹점 이름 추가
    const enrichedCoupons = safeCoupons.map(coupon => ({
      ...coupon,
      used_store_name: coupon.used_store_id ? storesMap[coupon.used_store_id] || null : null,
    }));

    return NextResponse.json({
      success: true,
      coupons: enrichedCoupons,
      total,
      pagination: {
        limit,
        offset,
        has_more: total > offset + limit,
      }
    });
  } catch (error) {
    console.error('Get coupons by device error:', error);
    return NextResponse.json(
      {
        success: false,
        message: ERROR_MESSAGES.INTERNAL_ERROR,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
