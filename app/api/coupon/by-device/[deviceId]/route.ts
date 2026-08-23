import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { ERROR_MESSAGES } from '@/lib/constants';

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
    const { data: surveys, error: surveyError } = await supabaseAdmin
      .from('surveys')
      .select('id')
      .eq('device_id', deviceId);

    if (surveyError) {
      console.error('Get surveys error:', surveyError);
      return NextResponse.json(
        { success: false, message: ERROR_MESSAGES.INTERNAL_ERROR },
        { status: 500 }
      );
    }

    if (!surveys || surveys.length === 0) {
      return NextResponse.json({
        success: true,
        coupons: [],
        total: 0,
        message: 'No surveys found for this device'
      });
    }

    const surveyIds = surveys.map(s => s.id);

    // 쿠폰 조회 쿼리 빌드
    let query = supabaseAdmin
      .from('coupons')
      .select('*', { count: 'exact' })
      .in('survey_id', surveyIds)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // 상태 필터
    if (status === 'active') {
      query = query.eq('status', 'active');
    } else if (status === 'used') {
      query = query.eq('status', 'used');
    } else if (status === 'expired') {
      query = query.eq('status', 'expired');
    }

    const { data: coupons, error: couponError, count } = await query;

    if (couponError) {
      console.error('Get coupons error:', couponError);
      return NextResponse.json(
        { success: false, message: ERROR_MESSAGES.INTERNAL_ERROR },
        { status: 500 }
      );
    }

    // 쿠폰 데이터 가공 (민감 정보 제외)
    const safeCoupons = (coupons || []).map(coupon => ({
      id: coupon.id,
      code: coupon.code,
      status: coupon.status,
      discount_amount: coupon.discount_amount,
      created_at: coupon.created_at,
      expires_at: coupon.expires_at,
      used_at: coupon.used_at,
      used_store_id: coupon.used_store_id,
      // QR 데이터 생성 (쿠폰 ID 기반)
      qr_data: `bongridan://coupon/${coupon.id}`,
    }));

    // 사용된 가맹점 정보 조회
    const usedStoreIds = safeCoupons
      .filter(c => c.used_store_id)
      .map(c => c.used_store_id);

    let storesMap: Record<string, string> = {};
    if (usedStoreIds.length > 0) {
      const { data: stores } = await supabaseAdmin
        .from('stores')
        .select('id, name')
        .in('id', usedStoreIds);

      storesMap = (stores || []).reduce((acc, s) => {
        acc[s.id] = s.name;
        return acc;
      }, {} as Record<string, string>);
    }

    // 가맹점 이름 추가
    const enrichedCoupons = safeCoupons.map(coupon => ({
      ...coupon,
      used_store_name: coupon.used_store_id ? storesMap[coupon.used_store_id] || null : null,
    }));

    return NextResponse.json({
      success: true,
      coupons: enrichedCoupons,
      total: count || 0,
      pagination: {
        limit,
        offset,
        has_more: (count || 0) > offset + limit,
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
