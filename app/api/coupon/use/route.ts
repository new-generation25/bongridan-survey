import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, supabaseHelpers } from '@/lib/supabase';
import { ERROR_MESSAGES } from '@/lib/constants';

export async function POST(request: NextRequest) {
  try {
    const { code, store_id } = await request.json();

    if (!code || !store_id) {
      return NextResponse.json(
        { success: false, message: ERROR_MESSAGES.INVALID_REQUEST },
        { status: 400 }
      );
    }

    // 쿠폰 유효성 검증
    const validation = await supabaseHelpers.validateCoupon(code);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, message: validation.message },
        { status: 400 }
      );
    }

    // 쿠폰 사용 처리
    const { data: coupon, error: couponError } = await supabaseAdmin
      .from('coupons')
      .update({
        status: 'used',
        used_at: new Date().toISOString(),
        used_store_id: store_id,
      })
      .eq('code', code)
      .select()
      .single();

    if (couponError || !coupon) {
      console.error('Coupon use error:', couponError);
      return NextResponse.json(
        { success: false, message: ERROR_MESSAGES.INTERNAL_ERROR },
        { status: 500 }
      );
    }

    // 가맹점 통계 조회
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { count: todayCount } = await supabaseAdmin
      .from('coupons')
      .select('*', { count: 'exact', head: true })
      .eq('used_store_id', store_id)
      .eq('status', 'used')
      .gte('used_at', today.toISOString());

    const { count: totalCount } = await supabaseAdmin
      .from('coupons')
      .select('*', { count: 'exact', head: true })
      .eq('used_store_id', store_id)
      .eq('status', 'used');

    return NextResponse.json({
      success: true,
      total_amount: coupon.amount,
      used_count: totalCount || 0,
      store_stats: {
        today_count: todayCount || 0,
        today_amount: (todayCount || 0) * coupon.amount,
        total_count: totalCount || 0,
        total_amount: (totalCount || 0) * coupon.amount,
      },
    });
  } catch (error) {
    console.error('Use coupon error:', error);
    return NextResponse.json(
      { success: false, message: ERROR_MESSAGES.INTERNAL_ERROR },
      { status: 500 }
    );
  }
}

