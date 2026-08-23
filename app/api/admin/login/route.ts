import { NextRequest, NextResponse } from 'next/server';
import { ERROR_MESSAGES } from '@/lib/constants';
import { verifyAdminPassword, generateAdminToken } from '@/lib/auth';

// Node.js 런타임 사용 (bcrypt 호환성)
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    // 환경 변수 확인
    if (!process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_KEY === 'placeholder-service-key') {
      console.error('SUPABASE_SERVICE_KEY is not set');
      return NextResponse.json(
        {
          success: false,
          message: '서버 설정 오류가 발생했습니다. 관리자에게 문의하세요.',
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

    // bcrypt를 사용한 비밀번호 검증
    const isValid = await verifyAdminPassword(password);

    if (!isValid) {
      return NextResponse.json(
        { success: false, message: '비밀번호가 올바르지 않습니다' },
        { status: 401 }
      );
    }

    // JWT 토큰 생성
    const token = await generateAdminToken();

    return NextResponse.json({
      success: true,
      token,
    });
  } catch (error) {
    console.error('Admin login error:', error);
    return NextResponse.json(
      {
        success: false,
        message: ERROR_MESSAGES.INTERNAL_ERROR,
      },
      { status: 500 }
    );
  }
}
