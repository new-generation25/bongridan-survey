import { NextRequest, NextResponse } from 'next/server';
import { db, COLLECTIONS, Timestamp } from '@/lib/firebase';
import { ERROR_MESSAGES } from '@/lib/constants';

// Node.js 런타임 사용
export const runtime = 'nodejs';

// 한국 시간 기준 오늘 시작 시간
function getKoreaTodayStart(): Date {
  const now = new Date();
  const koreaOffset = 9 * 60; // UTC+9
  const koreaTime = new Date(now.getTime() + koreaOffset * 60 * 1000);
  koreaTime.setUTCHours(0, 0, 0, 0);
  return new Date(koreaTime.getTime() - koreaOffset * 60 * 1000);
}

export async function POST(request: NextRequest) {
  try {
    const { code, store_id } = await request.json();

    if (!code || !store_id) {
      return NextResponse.json(
        { success: false, message: ERROR_MESSAGES.INVALID_REQUEST },
        { status: 400 }
      );
    }

    // 가맹점 존재 및 활성화 상태 확인
    const storeDoc = await db
      .collection(COLLECTIONS.STORES)
      .doc(store_id)
      .get();

    if (!storeDoc.exists) {
      return NextResponse.json(
        { success: false, message: ERROR_MESSAGES.STORE_NOT_FOUND },
        { status: 404 }
      );
    }

    const store = storeDoc.data();
    if (!store?.is_active) {
      return NextResponse.json(
        { success: false, message: '비활성화된 가맹점입니다.' },
        { status: 403 }
      );
    }

    // 쿠폰 조회
    const couponSnapshot = await db
      .collection(COLLECTIONS.COUPONS)
      .where('code', '==', code)
      .limit(1)
      .get();

    if (couponSnapshot.empty) {
      return NextResponse.json(
        { success: false, message: ERROR_MESSAGES.COUPON_NOT_FOUND },
        { status: 404 }
      );
    }

    const couponDoc = couponSnapshot.docs[0];
    const coupon = couponDoc.data();

    // 쿠폰 상태 확인
    if (coupon.status === 'used') {
      return NextResponse.json(
        { success: false, message: '이미 사용된 쿠폰입니다' },
        { status: 400 }
      );
    }

    if (coupon.status !== 'issued') {
      return NextResponse.json(
        { success: false, message: ERROR_MESSAGES.COUPON_NOT_FOUND },
        { status: 404 }
      );
    }

    // 쿠폰 사용 처리 (트랜잭션)
    const now = Timestamp.now();
    await db.runTransaction(async (transaction) => {
      // 쿠폰 상태 재확인
      const freshCouponDoc = await transaction.get(couponDoc.ref);
      if (freshCouponDoc.data()?.status !== 'issued') {
        throw new Error('COUPON_ALREADY_USED');
      }

      transaction.update(couponDoc.ref, {
        status: 'used',
        used_at: now,
        used_store_id: store_id,
      });
    });

    // 가맹점 통계 조회
    const todayStart = getKoreaTodayStart();
    const todayTimestamp = Timestamp.fromDate(todayStart);

    // 오늘 사용 건수
    const todaySnapshot = await db
      .collection(COLLECTIONS.COUPONS)
      .where('used_store_id', '==', store_id)
      .where('status', '==', 'used')
      .where('used_at', '>=', todayTimestamp)
      .get();
    const todayCount = todaySnapshot.size;

    // 전체 사용 건수
    const totalSnapshot = await db
      .collection(COLLECTIONS.COUPONS)
      .where('used_store_id', '==', store_id)
      .where('status', '==', 'used')
      .get();
    const totalCount = totalSnapshot.size;

    return NextResponse.json({
      success: true,
      total_amount: coupon.amount,
      used_count: totalCount,
      store_stats: {
        today_count: todayCount,
        today_amount: todayCount * coupon.amount,
        total_count: totalCount,
        total_amount: totalCount * coupon.amount,
      },
    });
  } catch (error) {
    console.error('Use coupon error:', error);

    if (error instanceof Error && error.message === 'COUPON_ALREADY_USED') {
      return NextResponse.json(
        { success: false, message: '이미 사용된 쿠폰입니다' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: ERROR_MESSAGES.INTERNAL_ERROR },
      { status: 500 }
    );
  }
}
