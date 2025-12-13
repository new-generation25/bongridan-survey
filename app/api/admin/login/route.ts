import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { ERROR_MESSAGES } from '@/lib/constants';

// Node.js 런타임 사용 (Edge Runtime 대신)
export const runtime = 'nodejs';

// Base64 인코딩 헬퍼 함수
function encodeBase64(str: string): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(str).toString('base64');
  }
  // 브라우저 환경에서는 btoa 사용
  if (typeof btoa !== 'undefined') {
    return btoa(str);
  }
  // 폴백: 수동 인코딩
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  let i = 0;
  while (i < str.length) {
    const a = str.charCodeAt(i++);
    const b = i < str.length ? str.charCodeAt(i++) : 0;
    const c = i < str.length ? str.charCodeAt(i++) : 0;
    const bitmap = (a << 16) | (b << 8) | c;
    result += chars.charAt((bitmap >> 18) & 63);
    result += chars.charAt((bitmap >> 12) & 63);
    result += i - 2 < str.length ? chars.charAt((bitmap >> 6) & 63) : '=';
    result += i - 1 < str.length ? chars.charAt(bitmap & 63) : '=';
  }
  return result;
}

export async function POST(request: NextRequest) {
  try {
    // 환경 변수 확인
    if (!process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_KEY === 'placeholder-service-key') {
      console.error('SUPABASE_SERVICE_KEY is not set');
      return NextResponse.json(
        { 
          success: false, 
          message: '서버 설정 오류가 발생했습니다. 관리자에게 문의하세요.',
          error: 'SUPABASE_SERVICE_KEY not configured'
        },
        { status: 500 }
      );
    }

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

    if (error) {
      console.error('Get admin password error:', error);
      return NextResponse.json(
        { 
          success: false, 
          message: '데이터베이스 연결 오류가 발생했습니다.',
          error: error.message || 'Database connection error'
        },
        { status: 500 }
      );
    }

    if (!setting || !setting.value) {
      console.error('Admin password setting not found');
      return NextResponse.json(
        { 
          success: false, 
          message: '관리자 비밀번호 설정을 찾을 수 없습니다.',
          error: 'Admin password setting not found'
        },
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
    const tokenData = `admin:${Date.now()}`;
    const token = encodeBase64(tokenData);

    return NextResponse.json({
      success: true,
      token,
    });
  } catch (error) {
    console.error('Admin login error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { 
        success: false, 
        message: ERROR_MESSAGES.INTERNAL_ERROR,
        error: errorMessage
      },
      { status: 500 }
    );
  }
}

