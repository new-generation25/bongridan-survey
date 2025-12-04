import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { ERROR_MESSAGES } from '@/lib/constants';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data: coupon, error } = await supabaseAdmin
      .from('coupons')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !coupon) {
      console.error('Get coupon error:', error);
      return NextResponse.json(
        { success: false, message: ERROR_MESSAGES.COUPON_NOT_FOUND },
        { status: 404 }
      );
    }

    // 설문 완료 상태 확인
    let surveyStageCompleted = 1;
    if (coupon.survey_id) {
      const { data: survey } = await supabaseAdmin
        .from('surveys')
        .select('stage_completed')
        .eq('id', coupon.survey_id)
        .maybeSingle();
      
      surveyStageCompleted = survey?.stage_completed || 1;
    }

    return NextResponse.json({
      success: true,
      coupon: {
        ...coupon,
        survey_stage_completed: surveyStageCompleted,
      },
    });
  } catch (error) {
    console.error('Get coupon error:', error);
    return NextResponse.json(
      { success: false, message: ERROR_MESSAGES.INTERNAL_ERROR, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

