import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    // 설정에서 관리자 비밀번호 가져오기
    const { data: setting, error } = await supabaseAdmin
      .from('settings')
      .select('value')
      .eq('key', 'admin_password')
      .single();

    if (error || !setting) {
      console.error('Get admin password error:', error);
      return NextResponse.json(
        { success: false, message: '비밀번호를 가져올 수 없습니다.' },
        { status: 500 }
      );
    }

    const isDefaultPassword = setting.value === 'change_this_password_in_production';
    const passwordLength = setting.value.length;

    return NextResponse.json({
      success: true,
      isDefaultPassword,
      passwordLength,
      status: isDefaultPassword 
        ? '⚠️ 초기 비밀번호입니다. 변경이 필요합니다.' 
        : '✅ 비밀번호가 변경되었습니다.',
      hint: isDefaultPassword 
        ? null 
        : `비밀번호 길이: ${passwordLength}자 (앞 3자리: ${setting.value.substring(0, 3)}***)`,
    });
  } catch (error) {
    console.error('Check password error:', error);
    return NextResponse.json(
      { success: false, message: '확인 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}



