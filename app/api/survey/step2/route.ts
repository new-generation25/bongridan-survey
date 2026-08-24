import { NextRequest, NextResponse } from 'next/server';
import { db, COLLECTIONS, Timestamp } from '@/lib/firebase';
import { validateApiKeyFromDB } from '@/lib/apiKey';
import {
  ERROR_MESSAGES,
  FREQUENCIES,
  DURATIONS,
  SATISFACTIONS,
  IMPROVEMENTS,
  OTHER_SPOTS
} from '@/lib/constants';
import type { SurveyStep2Data } from '@/lib/types';

// Node.js 런타임 사용
export const runtime = 'nodejs';

// API 키 검증 (모든 요청, localhost 제외)
async function checkApiKey(request: NextRequest): Promise<boolean> {
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');

  // localhost 개발 환경은 통과
  if (origin?.includes('localhost') || host?.includes('localhost')) {
    return true;
  }

  // 같은 도메인 (브라우저 직접 접근)은 통과
  if (origin?.includes('bongridan-survey')) {
    return true;
  }

  // 그 외 모든 요청 (서버-서버 포함)은 API 키 필수
  const apiKey = request.headers.get('x-api-key');
  if (!apiKey) return false;

  const keyInfo = await validateApiKeyFromDB(apiKey);
  return keyInfo !== null && keyInfo.permissions.includes('survey');
}

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
    // API 키 검증
    const isValidKey = await checkApiKey(request);
    if (!isValidKey) {
      return NextResponse.json(
        { success: false, message: 'Invalid or missing API key', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

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

    // 설문 조회 및 소유권 검증
    const surveyDoc = await db
      .collection(COLLECTIONS.SURVEYS)
      .doc(data.survey_id)
      .get();

    if (!surveyDoc.exists) {
      return NextResponse.json(
        { success: false, message: '설문을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    const existingSurvey = surveyDoc.data();

    if (existingSurvey?.device_id !== data.device_id) {
      return NextResponse.json(
        { success: false, message: '권한이 없습니다.' },
        { status: 403 }
      );
    }

    if (existingSurvey?.stage_completed >= 2) {
      return NextResponse.json(
        { success: false, message: '이미 완료된 설문입니다.' },
        { status: 400 }
      );
    }

    // 설문 데이터 업데이트
    await db
      .collection(COLLECTIONS.SURVEYS)
      .doc(data.survey_id)
      .update({
        q8_frequency: data.q8_frequency,
        q9_duration: data.q9_duration,
        q10_satisfaction: data.q10_satisfaction,
        q11_improvement: data.q11_improvement,
        q12_other_spots: data.q12_other_spots,
        response_time_step2: data.response_time_step2 || null,
        stage_completed: 2,
        updated_at: Timestamp.now(),
      });

    return NextResponse.json({
      success: true,
      survey_id: data.survey_id,
    });
  } catch (error) {
    console.error('Step2 survey error:', error);
    return NextResponse.json(
      { success: false, message: ERROR_MESSAGES.INTERNAL_ERROR },
      { status: 500 }
    );
  }
}
