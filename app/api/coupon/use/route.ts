import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, supabaseHelpers } from '@/lib/supabase';
import { ERROR_MESSAGES } from '@/lib/constants';
import { getKoreaTodayStartISO } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    const { code, store_id } = await request.json();

    if (!code || !store_id) {
      return NextResponse.json(
        { success: false, message: ERROR_MESSAGES.INVALID_REQUEST },
        { status: 400 }
      );
    }

    // 쿠폰 사용 처리 (원자적 업데이트: status가 'issued'인 경우에만 업데이트)
    const { data: coupon, error: couponError } = await supabaseAdmin
      .from('coupons')
      .update({
        status: 'used',
        used_at: new Date().toISOString(),
        used_store_id: store_id,
      })
      .eq('code', code)
      .eq('status', 'issued') // 이미 사용된 쿠폰은 업데이트되지 않음
      .select()
      .single();

    if (couponError || !coupon) {
      // 쿠폰이 없거나 이미 사용된 경우
      if (couponError?.code === 'PGRST116' || !coupon) {
        // 쿠폰 상태 확인
        const { data: existingCoupon } = await supabaseAdmin
          .from('coupons')
          .select('status')
          .eq('code', code)
          .maybeSingle();
        
        console.log('[DEBUG API] Coupon status check:', {code,couponErrorCode:couponError?.code,existingCouponStatus:existingCoupon?.status});
        
        if (existingCoupon?.status === 'used') {
          console.log('[DEBUG API] Returning already used error:', {code});
          return NextResponse.json(
            { success: false, message: '이미 사용된 쿠폰입니다' },
            { status: 400 }
          );
        }
        
        return NextResponse.json(
          { success: false, message: ERROR_MESSAGES.COUPON_NOT_FOUND },
          { status: 404 }
        );
      }
      
      console.error('Coupon use error:', couponError);
      return NextResponse.json(
        { success: false, message: ERROR_MESSAGES.INTERNAL_ERROR },
        { status: 500 }
      );
    }

    // 가맹점 통계 조회 (한국 시간 기준)
    const todayISO = getKoreaTodayStartISO();

    const { count: todayCount } = await supabaseAdmin
      .from('coupons')
      .select('*', { count: 'exact', head: true })
      .eq('used_store_id', store_id)
      .eq('status', 'used')
      .gte('used_at', todayISO);

    const { count: totalCount } = await supabaseAdmin
      .from('coupons')
      .select('*', { count: 'exact', head: true })
      .eq('used_store_id', store_id)
      .eq('status', 'used');

    console.log('[DEBUG API] Returning success response:', {code,success:true});
    
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

