import { NextRequest, NextResponse } from 'next/server';
import { db, COLLECTIONS } from '@/lib/firebase';
import { ERROR_MESSAGES } from '@/lib/constants';

// Node.js 런타임 사용
export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 쿠폰 조회
    const couponDoc = await db
      .collection(COLLECTIONS.COUPONS)
      .doc(id)
      .get();

    if (!couponDoc.exists) {
      return NextResponse.json(
        { success: false, message: ERROR_MESSAGES.COUPON_NOT_FOUND },
        { status: 404 }
      );
    }

    const couponData = couponDoc.data();
    const coupon = {
      id: couponDoc.id,
      survey_id: couponData?.survey_id as string | undefined,
      code: couponData?.code as string,
      amount: couponData?.amount as number,
      status: couponData?.status as string,
      issued_at: couponData?.issued_at,
      expires_at: couponData?.expires_at,
      used_at: couponData?.used_at,
      used_store_id: couponData?.used_store_id as string | undefined,
    };

    // 설문 완료 상태 및 경품 응모 여부 확인
    let surveyStageCompleted = 1;
    let raffleEntered = false;

    if (coupon.survey_id) {
      // 설문 조회
      const surveyDoc = await db
        .collection(COLLECTIONS.SURVEYS)
        .doc(coupon.survey_id)
        .get();

      if (surveyDoc.exists) {
        surveyStageCompleted = surveyDoc.data()?.stage_completed || 1;
      }

      // 경품 응모 여부 확인
      const raffleSnapshot = await db
        .collection(COLLECTIONS.RAFFLE_ENTRIES)
        .where('survey_id', '==', coupon.survey_id)
        .limit(1)
        .get();

      raffleEntered = !raffleSnapshot.empty;
    }

    // Timestamp를 Date로 변환
    const responseData = {
      ...coupon,
      survey_stage_completed: surveyStageCompleted,
      raffle_entered: raffleEntered,
      issued_at: coupon.issued_at?.toDate?.() || coupon.issued_at,
      expires_at: coupon.expires_at?.toDate?.() || coupon.expires_at,
      used_at: coupon.used_at?.toDate?.() || coupon.used_at,
    };

    return NextResponse.json({
      success: true,
      coupon: responseData,
    });
  } catch (error) {
    console.error('Get coupon error:', error);
    return NextResponse.json(
      { success: false, message: ERROR_MESSAGES.INTERNAL_ERROR, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
