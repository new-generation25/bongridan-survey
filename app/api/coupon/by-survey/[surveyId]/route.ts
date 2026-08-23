import { NextRequest, NextResponse } from 'next/server';
import { db, COLLECTIONS } from '@/lib/firebase';
import { ERROR_MESSAGES } from '@/lib/constants';

// Node.js 런타임 사용
export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ surveyId: string }> }
) {
  try {
    const resolvedParams = await params;
    const surveyId = resolvedParams.surveyId;

    if (!surveyId) {
      return NextResponse.json(
        { success: false, message: ERROR_MESSAGES.INVALID_REQUEST },
        { status: 400 }
      );
    }

    // survey_id로 쿠폰 조회
    const couponSnap = await db
      .collection(COLLECTIONS.COUPONS)
      .where('survey_id', '==', surveyId)
      .limit(1)
      .get();

    if (couponSnap.empty) {
      return NextResponse.json(
        { success: false, message: ERROR_MESSAGES.COUPON_NOT_FOUND },
        { status: 404 }
      );
    }

    const couponDoc = couponSnap.docs[0];
    const couponData = couponDoc.data();

    return NextResponse.json({
      success: true,
      coupon: {
        id: couponDoc.id,
        ...couponData,
        issued_at: couponData.issued_at?.toDate?.().toISOString() || couponData.issued_at,
        expires_at: couponData.expires_at?.toDate?.().toISOString() || couponData.expires_at,
        used_at: couponData.used_at?.toDate?.().toISOString() || null,
      },
    });
  } catch (error) {
    console.error('Get coupon by survey error:', error);
    return NextResponse.json(
      { success: false, message: ERROR_MESSAGES.INTERNAL_ERROR },
      { status: 500 }
    );
  }
}
