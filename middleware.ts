import { NextRequest, NextResponse } from 'next/server';

// 허용된 오리진 목록
const ALLOWED_ORIGINS = [
  'https://bonghwang-memories.vercel.app',
  'https://bonghwang-memories.com',
  'http://localhost:3000',
  'http://localhost:3001',
  process.env.ALLOWED_ORIGIN,
].filter(Boolean) as string[];

// API 키 검증이 필요한 경로
const API_KEY_REQUIRED_PATHS = [
  '/api/survey/step1',
  '/api/survey/step2',
  '/api/coupon/by-device',
];

// API 키 검증이 면제되는 경로 (내부 사용)
const API_KEY_EXEMPT_PATHS = [
  '/api/admin',
  '/api/coupon/use',
  '/api/coupon/validate',
  '/api/stores',
];

// 유효한 API 키 목록 (실제로는 DB에서 관리)
function getValidApiKeys(): string[] {
  const keys = process.env.PARTNER_API_KEYS || '';
  return keys.split(',').filter(Boolean);
}

// API 키 검증 (미들웨어는 1차 방어선, 라우트에서 DB 검증이 최종)
function validateApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get('x-api-key');

  if (!apiKey) {
    return false;
  }

  // brg_ 프리픽스 확인 (DB 발급 키 형식)
  if (!apiKey.startsWith('brg_')) {
    return false;
  }

  // 환경변수 키가 있으면 1차 검증 (없으면 라우트에서 DB 검증)
  const validKeys = getValidApiKeys();
  if (validKeys.length > 0) {
    return validKeys.includes(apiKey);
  }

  // 환경변수 없으면 형식만 확인하고 통과 (라우트에서 DB 검증)
  return true;
}

// 경로가 API 키 검증이 필요한지 확인
function requiresApiKey(pathname: string): boolean {
  // 면제 경로 체크
  if (API_KEY_EXEMPT_PATHS.some(path => pathname.startsWith(path))) {
    return false;
  }

  // API 키 필요 경로 체크
  return API_KEY_REQUIRED_PATHS.some(path => pathname.startsWith(path));
}

// CORS 헤더 추가
function addCorsHeaders(response: NextResponse, origin: string | null): NextResponse {
  // origin이 허용 목록에 있거나 와일드카드인 경우
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin)
    ? origin
    : ALLOWED_ORIGINS[0];

  response.headers.set('Access-Control-Allow-Origin', allowedOrigin);
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key, X-Admin-Token');
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Max-Age', '86400');

  return response;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const origin = request.headers.get('origin');

  // API 경로만 처리
  if (!pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  // OPTIONS 요청 (CORS preflight)
  if (request.method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 200 });
    return addCorsHeaders(response, origin);
  }

  // API 키 검증이 필요한 경로 (Origin 유무와 관계없이 모든 요청 검증)
  if (requiresApiKey(pathname)) {
    // localhost 개발 환경은 통과
    const isLocalhost = origin?.includes('localhost') ||
                        request.headers.get('host')?.includes('localhost');

    if (!isLocalhost && !validateApiKey(request)) {
      const response = NextResponse.json(
        {
          success: false,
          message: 'Invalid or missing API key',
          code: 'UNAUTHORIZED'
        },
        { status: 401 }
      );
      return addCorsHeaders(response, origin);
    }
  }

  // 일반 요청 처리
  const response = NextResponse.next();
  return addCorsHeaders(response, origin);
}

export const config = {
  matcher: '/api/:path*',
};
