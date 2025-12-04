import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { ERROR_MESSAGES } from '@/lib/constants';

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();

    if (!password) {
      return NextResponse.json(
        { success: false, message: ERROR_MESSAGES.INVALID_REQUEST },
        { status: 400 }
      );
    }

    // 설정에서 관리자 비밀번호 가져오기
    const { data: setting, error } = await supabaseAdmin
      .from('settings')
      .select('value')
      .eq('key', 'admin_password')
      .single();

    if (error || !setting) {
      console.error('Get admin password error:', error);
      return NextResponse.json(
        { success: false, message: ERROR_MESSAGES.INTERNAL_ERROR },
        { status: 500 }
      );
    }

    if (password !== setting.value) {
      return NextResponse.json(
        { success: false, message: '비밀번호가 올바르지 않습니다' },
        { status: 401 }
      );
    }

    // 간단한 토큰 생성 (실제로는 JWT 사용 권장)
    const token = Buffer.from(`admin:${Date.now()}`).toString('base64');

    return NextResponse.json({
      success: true,
      token,
    });
  } catch (error) {
    console.error('Admin login error:', error);
    return NextResponse.json(
      { success: false, message: ERROR_MESSAGES.INTERNAL_ERROR },
      { status: 500 }
    );
  }
}

