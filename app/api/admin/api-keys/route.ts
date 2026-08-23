import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '@/lib/auth';
import { createApiKey, listApiKeys, revokeApiKey } from '@/lib/apiKey';
import { ERROR_MESSAGES } from '@/lib/constants';

// Node.js 런타임 사용 (crypto 호환성)
export const runtime = 'nodejs';

// GET: API 키 목록 조회
export async function GET(request: NextRequest) {
  try {
    const isAuthenticated = await verifyAdminToken(request);
    if (!isAuthenticated) {
      return NextResponse.json(
        { success: false, message: ERROR_MESSAGES.UNAUTHORIZED },
        { status: 401 }
      );
    }

    const apiKeys = await listApiKeys();

    // 보안: key_hash는 응답에서 제외
    const safeKeys = apiKeys.map(({ key_hash, ...rest }) => rest);

    return NextResponse.json({
      success: true,
      api_keys: safeKeys,
    });
  } catch (error) {
    console.error('List API keys error:', error);
    return NextResponse.json(
      { success: false, message: ERROR_MESSAGES.INTERNAL_ERROR },
      { status: 500 }
    );
  }
}

// POST: 새 API 키 발급
export async function POST(request: NextRequest) {
  try {
    const isAuthenticated = await verifyAdminToken(request);
    if (!isAuthenticated) {
      return NextResponse.json(
        { success: false, message: ERROR_MESSAGES.UNAUTHORIZED },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { partner_name, partner_contact, permissions, rate_limit, expires_in_days } = body;

    if (!partner_name || !partner_contact) {
      return NextResponse.json(
        { success: false, message: '파트너명과 연락처는 필수입니다.' },
        { status: 400 }
      );
    }

    const result = await createApiKey({
      partnerName: partner_name,
      partnerContact: partner_contact,
      permissions: permissions,
      rateLimitPerHour: rate_limit,
      expiresInDays: expires_in_days,
    });

    if (!result) {
      return NextResponse.json(
        { success: false, message: 'API 키 생성에 실패했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'API 키가 발급되었습니다. 이 키는 다시 확인할 수 없으니 안전하게 보관하세요.',
      api_key: result.key, // ⚠️ 이 키는 한 번만 보여줌!
      key_info: {
        id: result.keyInfo.id,
        partner_name: result.keyInfo.partner_name,
        permissions: result.keyInfo.permissions,
        rate_limit: result.keyInfo.rate_limit,
        expires_at: result.keyInfo.expires_at,
        created_at: result.keyInfo.created_at,
      },
    });
  } catch (error) {
    console.error('Create API key error:', error);
    return NextResponse.json(
      { success: false, message: ERROR_MESSAGES.INTERNAL_ERROR },
      { status: 500 }
    );
  }
}

// DELETE: API 키 비활성화
export async function DELETE(request: NextRequest) {
  try {
    const isAuthenticated = await verifyAdminToken(request);
    if (!isAuthenticated) {
      return NextResponse.json(
        { success: false, message: ERROR_MESSAGES.UNAUTHORIZED },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const keyId = searchParams.get('id');

    if (!keyId) {
      return NextResponse.json(
        { success: false, message: 'API 키 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    const success = await revokeApiKey(keyId);

    if (!success) {
      return NextResponse.json(
        { success: false, message: 'API 키 비활성화에 실패했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'API 키가 비활성화되었습니다.',
    });
  } catch (error) {
    console.error('Revoke API key error:', error);
    return NextResponse.json(
      { success: false, message: ERROR_MESSAGES.INTERNAL_ERROR },
      { status: 500 }
    );
  }
}
