import { NextRequest, NextResponse } from 'next/server';
import { db, COLLECTIONS, Timestamp, generateId } from '@/lib/firebase';
import { ERROR_MESSAGES, COUPON_CONFIG } from '@/lib/constants';
import { verifyAdminToken } from '@/lib/auth';

// Node.js 런타임 사용
export const runtime = 'nodejs';

// GET: 정산 이력 조회
export async function GET(request: NextRequest) {
  try {
    const isAuthenticated = await verifyAdminToken(request);
    if (!isAuthenticated) {
      return NextResponse.json(
        { success: false, message: ERROR_MESSAGES.UNAUTHORIZED },
        { status: 401 }
      );
    }

    // 정산 이력 조회
    const settlementsSnap = await db
      .collection(COLLECTIONS.SETTLEMENTS)
      .orderBy('created_at', 'desc')
      .get();

    const settlements = await Promise.all(
      settlementsSnap.docs.map(async (doc) => {
        const data = doc.data();
        // 가맹점 정보 조회
        let storeName = null;
        if (data.store_id) {
          const storeDoc = await db
            .collection(COLLECTIONS.STORES)
            .doc(data.store_id)
            .get();
          storeName = storeDoc.data()?.name || null;
        }
        return {
          id: doc.id,
          ...data,
          created_at: data.created_at?.toDate?.().toISOString() || data.created_at,
          stores: storeName ? { id: data.store_id, name: storeName } : null,
        };
      })
    );

    // 가맹점별 미정산 현황 계산
    const storesSnap = await db.collection(COLLECTIONS.STORES).get();

    const storesWithUnsettled = await Promise.all(
      storesSnap.docs.map(async (storeDoc) => {
        const store = storeDoc.data();
        const storeId = storeDoc.id;

        // 전체 사용 건수 조회
        const usedCouponsSnap = await db
          .collection(COLLECTIONS.COUPONS)
          .where('used_store_id', '==', storeId)
          .where('status', '==', 'used')
          .get();
        const usedCount = usedCouponsSnap.size;

        // 정산 금액 계산
        const totalAmount = usedCount * COUPON_CONFIG.SETTLEMENT_RATE;

        // 정산된 금액
        const storeSettlementsSnap = await db
          .collection(COLLECTIONS.SETTLEMENTS)
          .where('store_id', '==', storeId)
          .get();
        const settledAmount = storeSettlementsSnap.docs.reduce(
          (sum, doc) => sum + (doc.data().amount || 0), 0
        );
        const unsettledAmount = totalAmount - settledAmount;

        return {
          store_id: storeId,
          store_name: store.name,
          used_count: usedCount,
          total_amount: totalAmount,
          settled_amount: settledAmount,
          unsettled_amount: unsettledAmount,
        };
      })
    );

    return NextResponse.json({
      success: true,
      settlements,
      stores_unsettled: storesWithUnsettled.filter((s) => s.unsettled_amount > 0),
    });
  } catch (error) {
    console.error('Get settlements error:', error);
    return NextResponse.json(
      { success: false, message: ERROR_MESSAGES.INTERNAL_ERROR },
      { status: 500 }
    );
  }
}

// POST: 정산 입력
export async function POST(request: NextRequest) {
  try {
    const isAuthenticated = await verifyAdminToken(request);
    if (!isAuthenticated) {
      return NextResponse.json(
        { success: false, message: ERROR_MESSAGES.UNAUTHORIZED },
        { status: 401 }
      );
    }

    const { store_id, amount, note } = await request.json();

    if (!store_id || !amount) {
      return NextResponse.json(
        { success: false, message: '가맹점 ID와 정산 금액은 필수입니다.' },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { success: false, message: '정산 금액은 0보다 커야 합니다.' },
        { status: 400 }
      );
    }

    // 가맹점 존재 확인
    const storeDoc = await db
      .collection(COLLECTIONS.STORES)
      .doc(store_id)
      .get();

    if (!storeDoc.exists) {
      return NextResponse.json(
        { success: false, message: '가맹점을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 정산 기록 추가
    const settlementId = generateId();
    const now = Timestamp.now();

    const settlementData = {
      store_id,
      amount,
      note: note || null,
      settled_by: 'admin',
      created_at: now,
    };

    await db.collection(COLLECTIONS.SETTLEMENTS).doc(settlementId).set(settlementData);

    // 가맹점의 total_settled 업데이트
    const storeSettlementsSnap = await db
      .collection(COLLECTIONS.SETTLEMENTS)
      .where('store_id', '==', store_id)
      .get();
    const totalSettled = storeSettlementsSnap.docs.reduce(
      (sum, doc) => sum + (doc.data().amount || 0), 0
    );

    await db
      .collection(COLLECTIONS.STORES)
      .doc(store_id)
      .update({ total_settled: totalSettled });

    // 미정산 금액 계산
    const usedCouponsSnap = await db
      .collection(COLLECTIONS.COUPONS)
      .where('used_store_id', '==', store_id)
      .where('status', '==', 'used')
      .get();
    const usedCount = usedCouponsSnap.size;
    const totalAmount = usedCount * COUPON_CONFIG.SETTLEMENT_RATE;
    const unsettledAmount = totalAmount - totalSettled;

    return NextResponse.json({
      success: true,
      settlement: {
        id: settlementId,
        ...settlementData,
        created_at: now.toDate().toISOString(),
      },
      store_unsettled_amount: unsettledAmount,
    });
  } catch (error) {
    console.error('Create settlement error:', error);
    return NextResponse.json(
      { success: false, message: ERROR_MESSAGES.INTERNAL_ERROR },
      { status: 500 }
    );
  }
}
