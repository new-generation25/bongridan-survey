import { NextRequest, NextResponse } from 'next/server';
import { createApiKey } from '@/lib/apiKey';

// Node.js 런타임 사용
export const runtime = 'nodejs';

/**
 * 봉황메모리즈 API 키 발급용 임시 엔드포인트
 *
 * GET /api/admin/create-api-key?secret=bongridan-seed-2024
 *
 * ⚠️ 한 번만 실행 후 이 파일 삭제!
 */
export async function GET(request: NextRequest) {
  try {
    const secret = request.nextUrl.searchParams.get('secret');
    const expectedSecret = process.env.SEED_SECRET || 'bongridan-seed-2024';

    if (secret !== expectedSecret) {
      return NextResponse.json(
        { success: false, message: 'Invalid secret' },
        { status: 401 }
      );
    }

    // 봉황메모리즈 앱용 API 키 생성
    const result = await createApiKey({
      partnerName: '봉황메모리즈',
      partnerContact: 'bonghwang-memories@app',
      permissions: ['survey', 'coupon', 'device'],
      rateLimitPerHour: 10000,
      expiresInDays: 365, // 1년
    });

    if (!result) {
      return NextResponse.json(
        { success: false, message: 'API 키 생성 실패' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '봉황메모리즈 API 키 발급 완료!',
      api_key: result.key,
      key_info: {
        id: result.keyInfo.id,
        partner_name: result.keyInfo.partner_name,
        permissions: result.keyInfo.permissions,
        rate_limit: result.keyInfo.rate_limit,
        expires_at: result.keyInfo.expires_at,
      },
      next_steps: [
        '1. 위 api_key 값을 안전하게 보관하세요 (다시 확인 불가!)',
        '2. 봉황메모리즈 앱에 이 키를 설정하세요',
        '3. 이 API 파일을 삭제하세요',
      ],
    });
  } catch (error) {
    console.error('Create API key error:', error);
    return NextResponse.json(
      { success: false, message: 'Error', error: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
