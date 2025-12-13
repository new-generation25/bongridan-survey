import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { ERROR_MESSAGES } from '@/lib/constants';
import { verifyAdminToken } from '@/lib/auth';
import { getKoreaTodayStartISO } from '@/lib/utils';

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

    // 가맹점 목록 조회
    const { data: stores, error: storesError } = await supabaseAdmin
      .from('stores')
      .select('*')
      .order('name');

    if (storesError) {
      console.error('Get stores error:', storesError);
      return NextResponse.json(
        { success: false, message: ERROR_MESSAGES.INTERNAL_ERROR },
        { status: 500 }
      );
    }

    // 각 가맹점별 통계 조회
    const storesWithStats = await Promise.all(
      (stores || []).map(async (store) => {
        // 전체 사용 통계
        const { count: totalUsed } = await supabaseAdmin
          .from('coupons')
          .select('*', { count: 'exact', head: true })
          .eq('used_store_id', store.id)
          .eq('status', 'used');

        const { data: totalCoupons } = await supabaseAdmin
          .from('coupons')
          .select('amount')
          .eq('used_store_id', store.id)
          .eq('status', 'used');

        const totalAmount = totalCoupons?.reduce((sum, c) => sum + (c.amount || 500), 0) || 0;

        // 정산된 금액 (settlements 테이블에서 합계)
        const { data: settlements } = await supabaseAdmin
          .from('settlements')
          .select('amount')
          .eq('store_id', store.id);

        const settledAmount = settlements?.reduce((sum, s) => sum + s.amount, 0) || 0;
        const unsettledAmount = totalAmount - settledAmount;

        return {
          ...store,
          total_used: totalUsed || 0,
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
    const { data: existingStores } = await supabaseAdmin
      .from('stores')
      .select('id')
      .order('id', { ascending: false })
      .limit(1);

    let nextId = '01';
    if (existingStores && existingStores.length > 0) {
      const lastId = parseInt(existingStores[0].id, 10);
      nextId = String(lastId + 1).padStart(2, '0');
    }

    // 가맹점 추가
    const { data: newStore, error } = await supabaseAdmin
      .from('stores')
      .insert({
        id: nextId,
        name,
        manager_name: manager_name || null,
        manager_phone: manager_phone || null,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Create store error:', error);
      return NextResponse.json(
        { success: false, message: ERROR_MESSAGES.INTERNAL_ERROR },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      store: newStore,
    });
  } catch (error) {
    console.error('Create store error:', error);
    return NextResponse.json(
      { success: false, message: ERROR_MESSAGES.INTERNAL_ERROR },
      { status: 500 }
    );
  }
}

