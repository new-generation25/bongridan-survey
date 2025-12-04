import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { ERROR_MESSAGES } from '@/lib/constants';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data: coupon, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !coupon) {
      return NextResponse.json(
        { success: false, message: ERROR_MESSAGES.COUPON_NOT_FOUND },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      coupon,
    });
  } catch (error) {
    console.error('Get coupon error:', error);
    return NextResponse.json(
      { success: false, message: ERROR_MESSAGES.INTERNAL_ERROR },
      { status: 500 }
    );
  }
}

