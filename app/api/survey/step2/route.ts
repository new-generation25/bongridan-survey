import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import {
  ERROR_MESSAGES,
  FREQUENCIES,
  DURATIONS,
  SATISFACTIONS,
  IMPROVEMENTS,
  OTHER_SPOTS
} from '@/lib/constants';
import type { SurveyStep2Data } from '@/lib/types';

// Step2 데이터에 device_id 추가
interface SurveyStep2RequestData extends SurveyStep2Data {
  device_id: string;
}

// 허용 옵션 검증 함수
function validateStep2Options(data: SurveyStep2Data): string | null {
  if (!FREQUENCIES.includes(data.q8_frequency as typeof FREQUENCIES[number])) {
    return '유효하지 않은 방문빈도입니다.';
  }
  if (!DURATIONS.includes(data.q9_duration as typeof DURATIONS[number])) {
    return '유효하지 않은 체류시간입니다.';
  }
  if (!SATISFACTIONS.includes(data.q10_satisfaction as typeof SATISFACTIONS[number])) {
    return '유효하지 않은 만족도입니다.';
  }
  if (!Array.isArray(data.q11_improvement) || data.q11_improvement.length === 0 ||
      !data.q11_improvement.every(i => IMPROVEMENTS.includes(i as typeof IMPROVEMENTS[number]))) {
    return '유효하지 않은 개선사항입니다.';
  }
  if (!Array.isArray(data.q12_other_spots) || data.q12_other_spots.length === 0 ||
      !data.q12_other_spots.every(s => OTHER_SPOTS.includes(s as typeof OTHER_SPOTS[number]))) {
    return '유효하지 않은 다른 관광지입니다.';
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const data: SurveyStep2RequestData = await request.json();

    // 필수 필드 검증 (device_id 추가)
    if (!data.survey_id || !data.device_id || !data.q8_frequency || !data.q9_duration ||
        !data.q10_satisfaction || !data.q11_improvement || !data.q12_other_spots) {
      return NextResponse.json(
        { success: false, message: ERROR_MESSAGES.INVALID_REQUEST },
        { status: 400 }
      );
    }

    // 허용 옵션 검증
    const validationError = validateStep2Options(data);
    if (validationError) {
      return NextResponse.json(
        { success: false, message: validationError },
        { status: 400 }
      );
    }

    // 설문 소유권 검증 (device_id 매칭)
    const { data: existingSurvey, error: checkError } = await supabaseAdmin
      .from('surveys')
      .select('device_id, stage_completed')
      .eq('id', data.survey_id)
      .single();

    if (checkError || !existingSurvey) {
      return NextResponse.json(
        { success: false, message: '설문을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    if (existingSurvey.device_id !== data.device_id) {
      return NextResponse.json(
        { success: false, message: '권한이 없습니다.' },
        { status: 403 }
      );
    }

    if (existingSurvey.stage_completed >= 2) {
      return NextResponse.json(
        { success: false, message: '이미 완료된 설문입니다.' },
        { status: 400 }
      );
    }

    // 설문 데이터 업데이트
    const { data: survey, error } = await supabaseAdmin
      .from('surveys')
      .update({
        q8_frequency: data.q8_frequency,
        q9_duration: data.q9_duration,
        q10_satisfaction: data.q10_satisfaction,
        q11_improvement: data.q11_improvement,
        q12_other_spots: data.q12_other_spots,
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

