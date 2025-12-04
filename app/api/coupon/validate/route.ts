import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, supabaseHelpers } from '@/lib/supabase';
import { ERROR_MESSAGES } from '@/lib/constants';

// GET: URL로 접근 시 (QR 코드 스캔)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const couponId = searchParams.get('id');
    const storeId = searchParams.get('store'); // 상점용 파라미터

    if (!couponId) {
      // 쿠폰 ID가 없으면 안내 페이지로 리다이렉트
      return NextResponse.redirect(new URL('/coupon/qr-info', request.url));
    }

    // 쿠폰 ID로 쿠폰 정보 조회
    const { data: coupon, error } = await supabaseAdmin
      .from('coupons')
      .select('*')
      .eq('id', couponId)
      .maybeSingle();

    if (error || !coupon) {
      // 쿠폰을 찾을 수 없으면 안내 페이지로 리다이렉트
      return NextResponse.redirect(new URL('/coupon/qr-info', request.url));
    }

    // 쿠폰 유효성 검증
    const validation = await supabaseHelpers.validateCoupon(coupon.code);

    if (!validation.valid) {
      // 유효하지 않은 쿠폰이면 안내 페이지로 리다이렉트
      return NextResponse.redirect(new URL('/coupon/qr-info', request.url));
    }

    // 상점용 앱에서 스캔한 경우 (store 파라미터가 있거나 Referer가 /store/로 시작)
    const referer = request.headers.get('referer') || '';
    const isStoreApp = storeId !== null || referer.includes('/store/');

    if (isStoreApp && storeId) {
      // 상점용 앱: JSON 응답 반환 (상점 앱에서 처리)
      return NextResponse.json({
        success: true,
        valid: true,
        coupon: validation.coupon,
      });
    }

    // 일반 사용자가 스캔한 경우: 안내 페이지로 리다이렉트
    return NextResponse.redirect(new URL('/coupon/qr-info', request.url));
  } catch (error) {
    console.error('Validate coupon error:', error);
    // 오류 발생 시 안내 페이지로 리다이렉트
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

    const validation = await supabaseHelpers.validateCoupon(code);

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

