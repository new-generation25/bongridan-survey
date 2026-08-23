import { NextRequest, NextResponse } from 'next/server';
import { db, COLLECTIONS, Timestamp, generateId } from '@/lib/firebase';
import { ERROR_MESSAGES } from '@/lib/constants';

// Node.js 런타임 사용
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const { survey_id, name, phone, agreed_privacy } = await request.json();

    // 필수 필드 검증
    if (!survey_id || !name || !phone || !agreed_privacy) {
      return NextResponse.json(
        { success: false, message: ERROR_MESSAGES.INVALID_REQUEST },
        { status: 400 }
      );
    }

    // 전화번호 유효성 검사 (한국 휴대폰 번호)
    const phoneNumbers = phone.replace(/[^0-9]/g, '');
    const phoneRegex = /^01[0-9]{8,9}$/;
    if (!phoneRegex.test(phoneNumbers)) {
      return NextResponse.json(
        { success: false, message: '올바른 휴대폰 번호를 입력해주세요.' },
        { status: 400 }
      );
    }

    // 중복 응모 확인 (전화번호 기준)
    const existingSnap = await db
      .collection(COLLECTIONS.RAFFLE_ENTRIES)
      .where('phone', '==', phone)
      .limit(1)
      .get();

    if (!existingSnap.empty) {
      return NextResponse.json(
        { success: false, message: '경품 응모는 한번만 참여할 수 있습니다.' },
        { status: 409 }
      );
    }

    // 추첨 응모 삽입
    const entryId = generateId();
    const now = Timestamp.now();

    const entryData = {
      survey_id,
      name,
      phone,
      agreed_privacy,
      created_at: now,
    };

    await db.collection(COLLECTIONS.RAFFLE_ENTRIES).doc(entryId).set(entryData);

    return NextResponse.json({
      success: true,
      entry_id: entryId,
    });
  } catch (error) {
    console.error('Raffle entry error:', error);
    return NextResponse.json(
      { success: false, message: ERROR_MESSAGES.INTERNAL_ERROR },
      { status: 500 }
    );
  }
}
