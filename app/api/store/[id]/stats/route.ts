import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { ERROR_MESSAGES } from '@/lib/constants';

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
    const { data: store, error: storeError } = await supabaseAdmin
      .from('stores')
      .select('name')
      .eq('id', id)
      .maybeSingle();

    if (storeError || !store) {
      return NextResponse.json(
        { success: false, message: ERROR_MESSAGES.STORE_NOT_FOUND },
        { status: 404 }
      );
    }

    // 오늘 통계
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { count: todayCount } = await supabaseAdmin
      .from('coupons')
      .select('*', { count: 'exact', head: true })
      .eq('used_store_id', id)
      .eq('status', 'used')
      .gte('used_at', today.toISOString());

    const { data: todayCoupons } = await supabaseAdmin
      .from('coupons')
      .select('amount')
      .eq('used_store_id', id)
      .eq('status', 'used')
      .gte('used_at', today.toISOString());

    const todayAmount = todayCoupons?.reduce((sum, c) => sum + (c.amount || 500), 0) || 0;

    // 전체 통계
    const { count: totalCount } = await supabaseAdmin
      .from('coupons')
      .select('*', { count: 'exact', head: true })
      .eq('used_store_id', id)
      .eq('status', 'used');

    const { data: totalCoupons } = await supabaseAdmin
      .from('coupons')
      .select('amount')
      .eq('used_store_id', id)
      .eq('status', 'used');

    const totalAmount = totalCoupons?.reduce((sum, c) => sum + (c.amount || 500), 0) || 0;

    return NextResponse.json({
      success: true,
      store_name: store.name,
      today_count: todayCount || 0,
      today_amount: todayAmount,
      total_count: totalCount || 0,
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

