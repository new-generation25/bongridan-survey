import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, supabaseHelpers } from '@/lib/supabase';
import {
  ERROR_MESSAGES,
  COUPON_CONFIG,
  REGIONS,
  GIMHAE_DONGS,
  AGE_GROUPS,
  VISIT_ACTIVITIES,
  VISIT_OCCASIONS,
  VISIT_CHANNELS,
  BUDGETS,
  COMPANIONS
} from '@/lib/constants';
import type { SurveyStep1Data } from '@/lib/types';

// 허용 옵션 검증 함수
function validateOptions(data: SurveyStep1Data): string | null {
  if (!REGIONS.includes(data.q1_region as typeof REGIONS[number])) {
    return '유효하지 않은 지역입니다.';
  }
  if (data.q1_region === '김해시' && data.q1_1_dong &&
      !GIMHAE_DONGS.includes(data.q1_1_dong as typeof GIMHAE_DONGS[number])) {
    return '유효하지 않은 동 정보입니다.';
  }
  if (!AGE_GROUPS.includes(data.q2_age as typeof AGE_GROUPS[number])) {
    return '유효하지 않은 연령대입니다.';
  }
  if (!Array.isArray(data.q3_activity) || data.q3_activity.length === 0 ||
      !data.q3_activity.every(a => VISIT_ACTIVITIES.includes(a as typeof VISIT_ACTIVITIES[number]))) {
    return '유효하지 않은 이용예정 활동입니다.';
  }
  if (!VISIT_OCCASIONS.includes(data.q4_occasion as typeof VISIT_OCCASIONS[number])) {
    return '유효하지 않은 방문계기입니다.';
  }
  if (!VISIT_CHANNELS.includes(data.q5_channel as typeof VISIT_CHANNELS[number])) {
    return '유효하지 않은 방문경로입니다.';
  }
  if (!BUDGETS.includes(data.q6_budget as typeof BUDGETS[number])) {
    return '유효하지 않은 예산입니다.';
  }
  if (!COMPANIONS.includes(data.q7_companion as typeof COMPANIONS[number])) {
    return '유효하지 않은 동행자입니다.';
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    // 환경 변수 확인
    if (!process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_KEY === 'placeholder-service-key') {
      console.error('SUPABASE_SERVICE_KEY is not set');
      return NextResponse.json(
        { 
          success: false, 
          message: '서버 설정 오류가 발생했습니다. 관리자에게 문의하세요.',
          error: 'SUPABASE_SERVICE_KEY not configured'
        },
        { status: 500 }
      );
    }

    const data: SurveyStep1Data = await request.json();

    // 필수 필드 검증
    if (!data.device_id || !data.q1_region || !data.q2_age || !data.q3_activity ||
        !data.q4_occasion || !data.q5_channel || !data.q6_budget || !data.q7_companion) {
      return NextResponse.json(
        { success: false, message: ERROR_MESSAGES.INVALID_REQUEST },
        { status: 400 }
      );
    }

    // 허용 옵션 검증
    const validationError = validateOptions(data);
    if (validationError) {
      return NextResponse.json(
        { success: false, message: validationError },
        { status: 400 }
      );
    }

    // 중복 응답 확인 (모든 기기에서 적용, 3일 이내 동일 기기)
    const isDuplicate = await supabaseHelpers.checkDuplicateSurvey(data.device_id);
    if (isDuplicate) {
      return NextResponse.json(
        { success: false, message: '이전에 참여하였습니다. 이전 응답 후 3일 후에 응답이 가능합니다.' },
        { status: 409 }
      );
    }

    // 설문 데이터 삽입
    const insertData: any = {
      device_id: data.device_id,
      q1_region: data.q1_region,
      q2_age: data.q2_age,
      q3_activity: data.q3_activity,
      q4_occasion: data.q4_occasion,
      q5_channel: data.q5_channel,
      q6_budget: data.q6_budget,
      q7_companion: data.q7_companion,
      response_time_step1: data.response_time_step1,
      stage_completed: 1,
    };

    // 김해시가 아닌 경우 q1_1_dong은 null로 설정
    if (data.q1_region === '김해시' && data.q1_1_dong) {
      insertData.q1_1_dong = data.q1_1_dong;
    }

    const { data: survey, error: surveyError } = await supabaseAdmin
      .from('surveys')
      .insert(insertData)
      .select()
      .single();

    if (surveyError || !survey) {
      console.error('Survey insert error:', surveyError);
      return NextResponse.json(
        { 
          success: false, 
          message: ERROR_MESSAGES.INTERNAL_ERROR,
          error: surveyError?.message || 'Unknown error',
          details: surveyError
        },
        { status: 500 }
      );
    }

    // 쿠폰 생성
    const couponCode = await supabaseHelpers.generateCouponCode();
    const expiresAt = supabaseHelpers.calculateExpiryDate(COUPON_CONFIG.VALIDITY_HOURS);

    const { data: coupon, error: couponError } = await supabaseAdmin
      .from('coupons')
      .insert({
        code: couponCode,
        survey_id: survey.id,
        amount: COUPON_CONFIG.AMOUNT,
        expires_at: expiresAt,
        status: 'issued',
      })
      .select()
      .single();

    if (couponError || !coupon) {
      console.error('Coupon insert error:', couponError);
      return NextResponse.json(
        { 
          success: false, 
          message: ERROR_MESSAGES.INTERNAL_ERROR,
          error: couponError?.message || 'Unknown error',
          details: couponError
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      survey_id: survey.id,
      coupon_id: coupon.id,
      coupon_code: couponCode,
    });
  } catch (error) {
    console.error('Step1 survey error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: ERROR_MESSAGES.INTERNAL_ERROR,
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error
      },
      { status: 500 }
    );
  }
}

