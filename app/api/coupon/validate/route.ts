import { NextRequest, NextResponse } from 'next/server';
import { db, COLLECTIONS, Timestamp } from '@/lib/firebase';
import { ERROR_MESSAGES, COUPON_CONFIG } from '@/lib/constants';

// Node.js 런타임 사용
export const runtime = 'nodejs';

// 쿠폰 유효성 검증 헬퍼
async function validateCoupon(code: string): Promise<{
  valid: boolean;
  message?: string;
  coupon?: {
    id: string;
    code: string;
    amount: number;
    status: string;
    issued_at: string;
    expires_at: string;
    used_at?: string | null;
  };
}> {
  // 쿠폰 코드로 조회
  const couponSnap = await db
    .collection(COLLECTIONS.COUPONS)
    .where('code', '==', code)
    .limit(1)
    .get();

  if (couponSnap.empty) {
    return { valid: false, message: ERROR_MESSAGES.COUPON_NOT_FOUND };
  }

  const couponDoc = couponSnap.docs[0];
  const coupon = couponDoc.data();

  // 이미 사용된 쿠폰인지 확인
  if (coupon.status === 'used') {
    return { valid: false, message: ERROR_MESSAGES.COUPON_USED };
  }

  // 만료 확인
  const expiresAt = coupon.expires_at?.toDate?.() || new Date(coupon.expires_at);
  if (expiresAt < new Date()) {
    return { valid: false, message: ERROR_MESSAGES.COUPON_EXPIRED };
  }

  return {
    valid: true,
    coupon: {
      id: couponDoc.id,
      code: coupon.code,
      amount: coupon.amount || COUPON_CONFIG.AMOUNT,
      status: coupon.status,
      issued_at: coupon.issued_at?.toDate?.().toISOString() || coupon.issued_at,
      expires_at: expiresAt.toISOString(),
      used_at: coupon.used_at?.toDate?.().toISOString() || null,
    },
  };
}

// GET: URL로 접근 시 (QR 코드 스캔)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const couponId = searchParams.get('id');
    const storeId = searchParams.get('store');

    if (!couponId) {
      return NextResponse.redirect(new URL('/coupon/qr-info', request.url));
    }

    const referer = request.headers.get('referer') || '';
    const isStoreApp = storeId !== null || referer.includes('/store/');

    // 쿠폰 ID로 쿠폰 정보 조회
    const couponDoc = await db
      .collection(COLLECTIONS.COUPONS)
      .doc(couponId)
      .get();

    if (!couponDoc.exists) {
      if (isStoreApp && storeId) {
        return NextResponse.json({
          success: false,
          valid: false,
          message: '쿠폰을 찾을 수 없습니다',
        }, { status: 404 });
      }
      return NextResponse.redirect(new URL('/coupon/qr-info', request.url));
    }

    const coupon = couponDoc.data();
    const validation = await validateCoupon(coupon?.code);

    if (!validation.valid) {
      if (isStoreApp && storeId) {
        return NextResponse.json({
          success: false,
          valid: false,
          message: validation.message || '유효하지 않은 쿠폰입니다',
        }, { status: 400 });
      }
      return NextResponse.redirect(new URL('/coupon/qr-info', request.url));
    }

    if (isStoreApp && storeId) {
      return NextResponse.json({
        success: true,
        valid: true,
        coupon: validation.coupon,
      });
    }

    return NextResponse.redirect(new URL('/coupon/qr-info', request.url));
  } catch (error) {
    console.error('Validate coupon error:', error);
    const referer = request.headers.get('referer') || '';
    const storeId = request.nextUrl.searchParams.get('store');
    const isStoreApp = storeId !== null || referer.includes('/store/');

    if (isStoreApp && storeId) {
      return NextResponse.json({
        success: false,
        valid: false,
        message: ERROR_MESSAGES.INTERNAL_ERROR,
      }, { status: 500 });
    }
    return NextResponse.redirect(new URL('/coupon/qr-info', request.url));
  }
}

// POST: 코드로 검증 (숫자 코드 수동 입력)
export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();

    if (!code) {
      return NextResponse.json(
        { success: false, message: ERROR_MESSAGES.INVALID_REQUEST },
        { status: 400 }
      );
    }

    const validation = await validateCoupon(code);

    if (!validation.valid) {
      return NextResponse.json(
        { success: false, message: validation.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      valid: true,
      coupon: validation.coupon,
    });
  } catch (error) {
    console.error('Validate coupon error:', error);
    return NextResponse.json(
      { success: false, message: ERROR_MESSAGES.INTERNAL_ERROR },
      { status: 500 }
    );
  }
}
