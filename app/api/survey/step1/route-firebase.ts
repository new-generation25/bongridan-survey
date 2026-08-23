import { NextRequest, NextResponse } from 'next/server';
import { db, COLLECTIONS, Timestamp, generateCouponCode, generateId } from '@/lib/firebase';
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

// 중복 응답 확인 (3일 이내)
async function checkDuplicateSurvey(deviceId: string): Promise<boolean> {
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  const snapshot = await db
    .collection(COLLECTIONS.SURVEYS)
    .where('device_id', '==', deviceId)
    .where('created_at', '>=', Timestamp.fromDate(threeDaysAgo))
    .limit(1)
    .get();

  return !snapshot.empty;
}

export async function POST(request: NextRequest) {
  try {
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

    // 중복 응답 확인 (3일 이내 동일 기기)
    const isDuplicate = await checkDuplicateSurvey(data.device_id);
    if (isDuplicate) {
      return NextResponse.json(
        { success: false, message: '이전에 참여하였습니다. 이전 응답 후 3일 후에 응답이 가능합니다.' },
        { status: 409 }
      );
    }

    // 설문 ID 생성
    const surveyId = generateId();
    const now = Timestamp.now();

    // 설문 데이터
    const surveyData: Record<string, any> = {
      device_id: data.device_id,
      q1_region: data.q1_region,
      q2_age: data.q2_age,
      q3_activity: data.q3_activity,
      q4_occasion: data.q4_occasion,
      q5_channel: data.q5_channel,
      q6_budget: data.q6_budget,
      q7_companion: data.q7_companion,
      response_time_step1: data.response_time_step1 || null,
      stage_completed: 1,
      created_at: now,
    };

    // 김해시인 경우 동 정보 추가
    if (data.q1_region === '김해시' && data.q1_1_dong) {
      surveyData.q1_1_dong = data.q1_1_dong;
    }

    // 쿠폰 생성
    const couponId = generateId();
    const couponCode = await generateCouponCode();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + COUPON_CONFIG.VALIDITY_HOURS);

    const couponData = {
      code: couponCode,
      survey_id: surveyId,
      amount: COUPON_CONFIG.AMOUNT,
      status: 'issued',
      issued_at: now,
      expires_at: Timestamp.fromDate(expiresAt),
      used_at: null,
      used_store_id: null,
    };

    // 트랜잭션으로 설문과 쿠폰 동시 저장
    await db.runTransaction(async (transaction) => {
      transaction.set(db.collection(COLLECTIONS.SURVEYS).doc(surveyId), surveyData);
      transaction.set(db.collection(COLLECTIONS.COUPONS).doc(couponId), couponData);
    });

    return NextResponse.json({
      success: true,
      survey_id: surveyId,
      coupon_id: couponId,
      coupon_code: couponCode,
    });
  } catch (error) {
    console.error('Step1 survey error:', error);
    return NextResponse.json(
      {
        success: false,
        message: ERROR_MESSAGES.INTERNAL_ERROR,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
