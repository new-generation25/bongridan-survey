import { NextRequest, NextResponse } from 'next/server';
import { db, COLLECTIONS, Timestamp } from '@/lib/firebase';
import { ERROR_MESSAGES, COUPON_CONFIG } from '@/lib/constants';
import { verifyAdminToken } from '@/lib/auth';

// Node.js 런타임 사용
export const runtime = 'nodejs';

// GET: 가맹점 목록 조회 (통계 포함)
export async function GET(request: NextRequest) {
  try {
    const isAuthenticated = await verifyAdminToken(request);
    if (!isAuthenticated) {
      return NextResponse.json(
        { success: false, message: ERROR_MESSAGES.UNAUTHORIZED },
        { status: 401 }
      );
    }

    // 가맹점 목록 조회 (가맹점 번호 순으로 정렬)
    const storesSnap = await db
      .collection(COLLECTIONS.STORES)
      .orderBy('__name__')
      .get();

    // 각 가맹점별 통계 조회
    const storesWithStats = await Promise.all(
      storesSnap.docs.map(async (storeDoc) => {
        const store = storeDoc.data();
        const storeId = storeDoc.id;

        // 전체 사용 통계
        const usedCouponsSnap = await db
          .collection(COLLECTIONS.COUPONS)
          .where('used_store_id', '==', storeId)
          .where('status', '==', 'used')
          .get();
        const totalUsed = usedCouponsSnap.size;

        // 정산 금액은 쿠폰 사용 건수 × 700원으로 계산
        const totalAmount = totalUsed * COUPON_CONFIG.SETTLEMENT_RATE;

        // 정산된 금액 (settlements 테이블에서 합계)
        const settlementsSnap = await db
          .collection(COLLECTIONS.SETTLEMENTS)
          .where('store_id', '==', storeId)
          .get();
        const settledAmount = settlementsSnap.docs.reduce(
          (sum, doc) => sum + (doc.data().amount || 0), 0
        );
        const unsettledAmount = totalAmount - settledAmount;

        return {
          id: storeId,
          ...store,
          created_at: store.created_at?.toDate?.().toISOString() || store.created_at,
          total_used: totalUsed,
          total_amount: totalAmount,
          settled_amount: settledAmount,
          unsettled_amount: unsettledAmount,
        };
      })
    );

    return NextResponse.json({
      success: true,
      stores: storesWithStats,
    });
  } catch (error) {
    console.error('Get stores error:', error);
    return NextResponse.json(
      { success: false, message: ERROR_MESSAGES.INTERNAL_ERROR },
      { status: 500 }
    );
  }
}

// POST: 가맹점 추가
export async function POST(request: NextRequest) {
  try {
    const isAuthenticated = await verifyAdminToken(request);
    if (!isAuthenticated) {
      return NextResponse.json(
        { success: false, message: ERROR_MESSAGES.UNAUTHORIZED },
        { status: 401 }
      );
    }

    const { name, manager_name, manager_phone } = await request.json();

    if (!name) {
      return NextResponse.json(
        { success: false, message: '가맹점명은 필수입니다.' },
        { status: 400 }
      );
    }

    // 다음 ID 생성 (기존 가맹점 중 가장 큰 ID 찾기)
    const existingStoresSnap = await db
      .collection(COLLECTIONS.STORES)
      .orderBy('__name__', 'desc')
      .limit(1)
      .get();

    let nextId = '01';
    if (!existingStoresSnap.empty) {
      const lastId = parseInt(existingStoresSnap.docs[0].id, 10);
      nextId = String(lastId + 1).padStart(2, '0');
    }

    // 가맹점 추가
    const newStoreData = {
      name,
      manager_name: manager_name || null,
      manager_phone: manager_phone || null,
      is_active: true,
      total_settled: 0,
      created_at: Timestamp.now(),
    };

    await db.collection(COLLECTIONS.STORES).doc(nextId).set(newStoreData);

    return NextResponse.json({
      success: true,
      store: {
        id: nextId,
        ...newStoreData,
        created_at: newStoreData.created_at.toDate().toISOString(),
      },
    });
  } catch (error) {
    console.error('Create store error:', error);
    return NextResponse.json(
      { success: false, message: ERROR_MESSAGES.INTERNAL_ERROR },
      { status: 500 }
    );
  }
}
