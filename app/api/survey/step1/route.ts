import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, supabaseHelpers } from '@/lib/supabase';
import { ERROR_MESSAGES, COUPON_CONFIG } from '@/lib/constants';
import type { SurveyStep1Data } from '@/lib/types';

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
        !data.q3_1_occasion || !data.q4_channel || !data.q5_budget || !data.q6_companion) {
      return NextResponse.json(
        { success: false, message: ERROR_MESSAGES.INVALID_REQUEST },
        { status: 400 }
      );
    }

    // User-Agent로 모바일 여부 확인
    const userAgent = request.headers.get('user-agent') || '';
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);

    // 중복 응답 확인 (모바일에서만 적용, 3일 이내 동일 기기)
    if (isMobile) {
      const isDuplicate = await supabaseHelpers.checkDuplicateSurvey(data.device_id);
      if (isDuplicate) {
        return NextResponse.json(
          { success: false, message: '이전에 참여하였습니다. 이전 응답 후 3일 후에 응답이 가능합니다.' },
          { status: 409 }
        );
      }
    }

    // 설문 데이터 삽입
    const insertData: any = {
      device_id: data.device_id,
      q1_region: data.q1_region,
      q2_age: data.q2_age,
      q3_activity: data.q3_activity,
      q3_1_occasion: data.q3_1_occasion,
      q4_channel: data.q4_channel,
      q5_budget: data.q5_budget,
      q6_companion: data.q6_companion,
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

