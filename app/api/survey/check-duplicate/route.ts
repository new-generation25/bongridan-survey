import { NextRequest, NextResponse } from 'next/server';
import { db, COLLECTIONS, Timestamp } from '@/lib/firebase';
import { ERROR_MESSAGES } from '@/lib/constants';

// Node.js 런타임 사용
export const runtime = 'nodejs';

// 한국 시간 기준 오늘 시작 시간
function getKoreaTodayStart(): Date {
  const now = new Date();
  const koreaOffset = 9 * 60;
  const koreaTime = new Date(now.getTime() + koreaOffset * 60 * 1000);
  koreaTime.setUTCHours(0, 0, 0, 0);
  return new Date(koreaTime.getTime() - koreaOffset * 60 * 1000);
}

export async function POST(request: NextRequest) {
  try {
    const { device_id } = await request.json();

    if (!device_id) {
      return NextResponse.json(
        { success: false, message: ERROR_MESSAGES.INVALID_REQUEST },
        { status: 400 }
      );
    }

    // 오늘 설문 중복 체크
    const todayStart = getKoreaTodayStart();
    const todayTimestamp = Timestamp.fromDate(todayStart);

    const existingSnap = await db
      .collection(COLLECTIONS.SURVEYS)
      .where('device_id', '==', device_id)
      .where('created_at', '>=', todayTimestamp)
      .limit(1)
      .get();

    const isDuplicate = !existingSnap.empty;

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
