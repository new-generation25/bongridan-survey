import { NextRequest, NextResponse } from 'next/server';
import { db, COLLECTIONS } from '@/lib/firebase';
import { ERROR_MESSAGES, COUPON_CONFIG } from '@/lib/constants';
import { verifyAdminToken } from '@/lib/auth';

// Node.js 런타임 사용
export const runtime = 'nodejs';

// GET: 가맹점 상세 정보 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const isAuthenticated = await verifyAdminToken(request);
    if (!isAuthenticated) {
      return NextResponse.json(
        { success: false, message: ERROR_MESSAGES.UNAUTHORIZED },
        { status: 401 }
      );
    }

    const { id } = await params;

    // 가맹점 정보 조회
    const storeDoc = await db
      .collection(COLLECTIONS.STORES)
      .doc(id)
      .get();

    if (!storeDoc.exists) {
      return NextResponse.json(
        { success: false, message: '가맹점을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    const store = storeDoc.data();

    // 통계 조회
    const usedCouponsSnap = await db
      .collection(COLLECTIONS.COUPONS)
      .where('used_store_id', '==', id)
      .where('status', '==', 'used')
      .get();
    const totalUsed = usedCouponsSnap.size;

    // 정산 금액은 쿠폰 사용 건수 × 700원으로 계산
    const totalAmount = totalUsed * COUPON_CONFIG.SETTLEMENT_RATE;

    const settlementsSnap = await db
      .collection(COLLECTIONS.SETTLEMENTS)
      .where('store_id', '==', id)
      .get();
    const settledAmount = settlementsSnap.docs.reduce(
      (sum, doc) => sum + (doc.data().amount || 0), 0
    );
    const unsettledAmount = totalAmount - settledAmount;

    return NextResponse.json({
      success: true,
      store: {
        id: storeDoc.id,
        ...store,
        created_at: store?.created_at?.toDate?.().toISOString() || store?.created_at,
        total_used: totalUsed,
        total_amount: totalAmount,
        settled_amount: settledAmount,
        unsettled_amount: unsettledAmount,
      },
    });
  } catch (error) {
    console.error('Get store detail error:', error);
    return NextResponse.json(
      { success: false, message: ERROR_MESSAGES.INTERNAL_ERROR },
      { status: 500 }
    );
  }
}

// PUT: 가맹점 정보 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const isAuthenticated = await verifyAdminToken(request);
    if (!isAuthenticated) {
      return NextResponse.json(
        { success: false, message: ERROR_MESSAGES.UNAUTHORIZED },
        { status: 401 }
      );
    }

    const { id } = await params;
    const { name, manager_name, manager_phone, is_active } = await request.json();

    // 가맹점 존재 확인
    const storeDoc = await db
      .collection(COLLECTIONS.STORES)
      .doc(id)
      .get();

    if (!storeDoc.exists) {
      return NextResponse.json(
        { success: false, message: '가맹점을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (manager_name !== undefined) updateData.manager_name = manager_name || null;
    if (manager_phone !== undefined) updateData.manager_phone = manager_phone || null;
    if (is_active !== undefined) updateData.is_active = is_active;

    await db
      .collection(COLLECTIONS.STORES)
      .doc(id)
      .update(updateData);

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('Update store error:', error);
    return NextResponse.json(
      { success: false, message: ERROR_MESSAGES.INTERNAL_ERROR },
      { status: 500 }
    );
  }
}
