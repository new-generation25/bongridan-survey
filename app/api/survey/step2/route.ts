import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { ERROR_MESSAGES } from '@/lib/constants';
import type { SurveyStep2Data } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const data: SurveyStep2Data = await request.json();

    // 필수 필드 검증
    if (!data.survey_id || !data.q7_frequency || !data.q8_duration || 
        !data.q9_satisfaction || !data.q10_improvement || !data.q11_other_spots) {
      return NextResponse.json(
        { success: false, message: ERROR_MESSAGES.INVALID_REQUEST },
        { status: 400 }
      );
    }

    // 설문 데이터 업데이트
    const { data: survey, error } = await supabaseAdmin
      .from('surveys')
      .update({
        q7_frequency: data.q7_frequency,
        q8_duration: data.q8_duration,
        q9_satisfaction: data.q9_satisfaction,
        q10_improvement: data.q10_improvement,
        q11_other_spots: data.q11_other_spots,
        response_time_step2: data.response_time_step2,
        stage_completed: 2,
      })
      .eq('id', data.survey_id)
      .select()
      .single();

    if (error || !survey) {
      console.error('Survey update error:', error);
      return NextResponse.json(
        { success: false, message: ERROR_MESSAGES.INTERNAL_ERROR },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      survey_id: survey.id,
    });
  } catch (error) {
    console.error('Step2 survey error:', error);
    return NextResponse.json(
      { success: false, message: ERROR_MESSAGES.INTERNAL_ERROR },
      { status: 500 }
    );
  }
}

