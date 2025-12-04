import { NextRequest, NextResponse } from 'next/server';
import { supabaseHelpers } from '@/lib/supabase';
import { ERROR_MESSAGES } from '@/lib/constants';

export async function POST(request: NextRequest) {
  try {
    const { device_id } = await request.json();

    if (!device_id) {
      return NextResponse.json(
        { success: false, message: ERROR_MESSAGES.INVALID_REQUEST },
        { status: 400 }
      );
    }

    const isDuplicate = await supabaseHelpers.checkDuplicateSurvey(device_id);

    return NextResponse.json({
      success: true,
      is_duplicate: isDuplicate,
      message: isDuplicate ? ERROR_MESSAGES.DUPLICATE_RESPONSE : undefined,
    });
  } catch (error) {
    console.error('Check duplicate error:', error);
    return NextResponse.json(
      { success: false, message: ERROR_MESSAGES.INTERNAL_ERROR },
      { status: 500 }
    );
  }
}

