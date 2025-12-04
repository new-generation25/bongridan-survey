import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
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

