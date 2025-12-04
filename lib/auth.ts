// 인증 헬퍼 함수

import { NextRequest } from 'next/server';
import { supabaseAdmin } from './supabase';

// 관리자 토큰 검증
export async function verifyAdminToken(request: NextRequest): Promise<boolean> {
  try {
    // Authorization 헤더에서 토큰 가져오기
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '') || 
                  request.headers.get('x-admin-token') ||
                  request.nextUrl.searchParams.get('token');

    if (!token) {
      return false;
    }

    // 간단한 토큰 검증 (실제로는 JWT 검증 권장)
    // 토큰 형식: base64('admin:timestamp')
    try {
      const decoded = Buffer.from(token, 'base64').toString('utf-8');
      if (!decoded.startsWith('admin:')) {
        return false;
      }
      
      // 토큰이 최근 24시간 이내에 생성되었는지 확인
      const timestamp = parseInt(decoded.split(':')[1]);
      const now = Date.now();
      const tokenAge = now - timestamp;
      const maxAge = 24 * 60 * 60 * 1000; // 24시간

      if (tokenAge > maxAge || tokenAge < 0) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  } catch {
    return false;
  }
}

// 관리자 비밀번호 확인
export async function verifyAdminPassword(password: string): Promise<boolean> {
  try {
    const { data: setting, error } = await supabaseAdmin
      .from('settings')
      .select('value')
      .eq('key', 'admin_password')
      .maybeSingle();

    if (error || !setting) {
      return false;
    }

    return password === setting.value;
  } catch {
    return false;
  }
}

