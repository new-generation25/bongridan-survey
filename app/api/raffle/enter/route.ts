import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, supabaseHelpers } from '@/lib/supabase';
import { ERROR_MESSAGES } from '@/lib/constants';

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
    const isDuplicate = await supabaseHelpers.checkDuplicateRaffleEntry(phone);
    if (isDuplicate) {
      return NextResponse.json(
        { success: false, message: '경품 응모는 한번만 참여할 수 있습니다.' },
        { status: 409 }
      );
    }

    // 추첨 응모 삽입
    const { data: entry, error } = await supabaseAdmin
      .from('raffle_entries')
      .insert({
        survey_id,
        name,
        phone,
        agreed_privacy,
      })
      .select()
      .single();

    if (error || !entry) {
      console.error('Raffle entry error:', error);
      return NextResponse.json(
        { success: false, message: ERROR_MESSAGES.INTERNAL_ERROR },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      entry_id: entry.id,
    });
  } catch (error) {
    console.error('Raffle entry error:', error);
    return NextResponse.json(
      { success: false, message: ERROR_MESSAGES.INTERNAL_ERROR },
      { status: 500 }
    );
  }
}

