import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { ERROR_MESSAGES } from '@/lib/constants';
import { verifyAdminToken } from '@/lib/auth';

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
    const { data: store, error: storeError } = await supabaseAdmin
      .from('stores')
      .select('*')
      .eq('id', id)
      .single();

    if (storeError || !store) {
      return NextResponse.json(
        { success: false, message: '가맹점을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 통계 조회
    const { count: totalUsed } = await supabaseAdmin
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

    const { data: settlements } = await supabaseAdmin
      .from('settlements')
      .select('amount')
      .eq('store_id', id);

    const settledAmount = settlements?.reduce((sum, s) => sum + s.amount, 0) || 0;
    const unsettledAmount = totalAmount - settledAmount;

    return NextResponse.json({
      success: true,
      store: {
        ...store,
        total_used: totalUsed || 0,
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

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (manager_name !== undefined) updateData.manager_name = manager_name || null;
    if (manager_phone !== undefined) updateData.manager_phone = manager_phone || null;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { error } = await supabaseAdmin
      .from('stores')
      .update(updateData)
      .eq('id', id);

    if (error) {
      console.error('Update store error:', error);
      return NextResponse.json(
        { success: false, message: ERROR_MESSAGES.INTERNAL_ERROR },
        { status: 500 }
      );
    }

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

