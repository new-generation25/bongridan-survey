import { NextRequest, NextResponse } from 'next/server';
import { supabaseHelpers } from '@/lib/supabase';
import { ERROR_MESSAGES } from '@/lib/constants';

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

