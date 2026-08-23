import { NextRequest, NextResponse } from 'next/server';
import { db, COLLECTIONS, Timestamp } from '@/lib/firebase';
import { ERROR_MESSAGES } from '@/lib/constants';

// Node.js 런타임 사용
export const runtime = 'nodejs';

// 한국 시간 기준 오늘 시작 시간
function getKoreaTodayStart(): Date {
  const now = new Date();
  const koreaOffset = 9 * 60;
  const koreaTime = new Date(now.getTime() + koreaOffset * 60 * 1000);
  koreaTime.setUTCHours(0, 0, 0, 0);
  return new Date(koreaTime.getTime() - koreaOffset * 60 * 1000);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, message: ERROR_MESSAGES.INVALID_REQUEST },
        { status: 400 }
      );
    }

    // 가맹점 정보 조회
    const storeDoc = await db
      .collection(COLLECTIONS.STORES)
      .doc(id)
      .get();

    if (!storeDoc.exists) {
      return NextResponse.json(
        { success: false, message: ERROR_MESSAGES.STORE_NOT_FOUND },
        { status: 404 }
      );
    }

    const store = storeDoc.data();

    // 오늘 통계 (한국 시간 기준)
    const todayStart = getKoreaTodayStart();
    const todayTimestamp = Timestamp.fromDate(todayStart);

    const todayCouponsSnap = await db
      .collection(COLLECTIONS.COUPONS)
      .where('used_store_id', '==', id)
      .where('status', '==', 'used')
      .where('used_at', '>=', todayTimestamp)
      .get();

    const todayCount = todayCouponsSnap.size;
    const todayAmount = todayCouponsSnap.docs.reduce(
      (sum, doc) => sum + (doc.data().amount || 500), 0
    );

    // 전체 통계
    const totalCouponsSnap = await db
      .collection(COLLECTIONS.COUPONS)
      .where('used_store_id', '==', id)
      .where('status', '==', 'used')
      .get();

    const totalCount = totalCouponsSnap.size;
    const totalAmount = totalCouponsSnap.docs.reduce(
      (sum, doc) => sum + (doc.data().amount || 500), 0
    );

    return NextResponse.json({
      success: true,
      store_name: store?.name,
      today_count: todayCount,
      today_amount: todayAmount,
      total_count: totalCount,
      total_amount: totalAmount,
    });
  } catch (error) {
    console.error('Get store stats error:', error);
    return NextResponse.json(
      { success: false, message: ERROR_MESSAGES.INTERNAL_ERROR },
      { status: 500 }
    );
  }
}
