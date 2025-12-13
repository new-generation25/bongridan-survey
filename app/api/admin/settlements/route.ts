import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { ERROR_MESSAGES } from '@/lib/constants';
import { verifyAdminToken } from '@/lib/auth';

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

    // 정산 이력 조회 (가맹점 정보 포함)
    const { data: settlements, error } = await supabaseAdmin
      .from('settlements')
      .select(`
        *,
        stores (
          id,
          name
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Get settlements error:', error);
      return NextResponse.json(
        { success: false, message: ERROR_MESSAGES.INTERNAL_ERROR },
        { status: 500 }
      );
    }

    // 가맹점별 미정산 현황 계산
    const { data: allStores } = await supabaseAdmin
      .from('stores')
      .select('id, name');

    const storesWithUnsettled = await Promise.all(
      (allStores || []).map(async (store) => {
        // 전체 사용 금액
        const { data: coupons } = await supabaseAdmin
          .from('coupons')
          .select('amount')
          .eq('used_store_id', store.id)
          .eq('status', 'used');

        const totalAmount = coupons?.reduce((sum, c) => sum + (c.amount || 500), 0) || 0;

        // 정산된 금액
        const { data: storeSettlements } = await supabaseAdmin
          .from('settlements')
          .select('amount')
          .eq('store_id', store.id);

        const settledAmount = storeSettlements?.reduce((sum, s) => sum + s.amount, 0) || 0;
        const unsettledAmount = totalAmount - settledAmount;

        return {
          store_id: store.id,
          store_name: store.name,
          total_amount: totalAmount,
          settled_amount: settledAmount,
          unsettled_amount: unsettledAmount,
        };
      })
    );

    return NextResponse.json({
      success: true,
      settlements: settlements || [],
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
    const { data: store } = await supabaseAdmin
      .from('stores')
      .select('id')
      .eq('id', store_id)
      .single();

    if (!store) {
      return NextResponse.json(
        { success: false, message: '가맹점을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 정산 기록 추가
    const { data: settlement, error } = await supabaseAdmin
      .from('settlements')
      .insert({
        store_id,
        amount,
        note: note || null,
        settled_by: 'admin', // 실제로는 토큰에서 관리자 정보 가져오기
      })
      .select()
      .single();

    if (error) {
      console.error('Create settlement error:', error);
      return NextResponse.json(
        { success: false, message: ERROR_MESSAGES.INTERNAL_ERROR },
        { status: 500 }
      );
    }

    // 가맹점의 total_settled 업데이트
    const { data: existingSettlements } = await supabaseAdmin
      .from('settlements')
      .select('amount')
      .eq('store_id', store_id);

    const totalSettled = existingSettlements?.reduce((sum, s) => sum + s.amount, 0) || 0;

    await supabaseAdmin
      .from('stores')
      .update({ total_settled: totalSettled })
      .eq('id', store_id);

    // 미정산 금액 계산
    const { data: coupons } = await supabaseAdmin
      .from('coupons')
      .select('amount')
      .eq('used_store_id', store_id)
      .eq('status', 'used');

    const totalAmount = coupons?.reduce((sum, c) => sum + (c.amount || 500), 0) || 0;
    const unsettledAmount = totalAmount - totalSettled;

    return NextResponse.json({
      success: true,
      settlement,
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

