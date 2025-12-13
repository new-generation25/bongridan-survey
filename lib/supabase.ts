import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || 'placeholder-service-key';

// 클라이언트 사이드용 (제한된 권한)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 서버 사이드용 (관리자 권한)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'x-client-info': 'bongridan-survey'
    }
  }
});

// Supabase 헬퍼 함수들
export const supabaseHelpers = {
  // 설문 중복 확인 (서버 사이드용, 한국 시간 기준)
  async checkDuplicateSurvey(deviceId: string): Promise<boolean> {
    try {
      // 한국 시간 기준 오늘 시작 시간
      const koreaTime = new Date();
      const koreaToday = new Date(koreaTime.getTime() + (9 * 60 * 60 * 1000));
      koreaToday.setUTCHours(0, 0, 0, 0);

      // 인덱스를 활용한 최적화된 쿼리
      const { data, error } = await supabaseAdmin
        .from('surveys')
        .select('id', { count: 'exact', head: false })
        .eq('device_id', deviceId)
        .gte('created_at', koreaToday.toISOString())
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Check duplicate error:', error);
        // 에러를 throw하지 않고 false 반환
        return false;
      }

      return !!data;
    } catch (error) {
      console.error('Check duplicate exception:', error);
      return false;
    }
  },

  // 쿠폰 코드 생성 (6자리 순차 번호)
  async generateCouponCode(): Promise<string> {
    try {
      // 마지막 쿠폰 코드 조회
      const { data: lastCoupon, error } = await supabaseAdmin
        .from('coupons')
        .select('code')
        .order('code', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Get last coupon code error:', error);
        // 에러 발생 시 000001부터 시작
        return '000001';
      }

      if (!lastCoupon || !lastCoupon.code) {
        // 첫 번째 쿠폰
        return '000001';
      }

      // 마지막 코드 + 1
      const lastCode = parseInt(lastCoupon.code, 10);
      const nextCode = lastCode + 1;

      // 6자리 형식으로 변환 (000001, 000002, ...)
      return nextCode.toString().padStart(6, '0');
    } catch (error) {
      console.error('Generate coupon code error:', error);
      // 에러 발생 시 000001부터 시작
      return '000001';
    }
  },

  // 쿠폰 만료 시간 계산 (한국 시간 기준)
  calculateExpiryDate(hours: number = 24): string {
    // 현재 시간을 UTC로 가져온 후, 한국 시간 기준으로 계산
    const now = new Date();
    // 한국 시간(UTC+9)으로 변환하여 계산
    const koreaTime = new Date(now.getTime() + (9 * 60 * 60 * 1000));
    // 만료 시간 계산 (한국 시간 기준)
    const expiryDate = new Date(koreaTime.getTime() + (hours * 60 * 60 * 1000));
    // UTC로 변환하여 반환 (Supabase는 UTC로 저장)
    return expiryDate.toISOString();
  },

  // 쿠폰 상태 확인 (서버 사이드용)
  async validateCoupon(code: string): Promise<{
    valid: boolean;
    message?: string;
    coupon?: unknown;
  }> {
    const { data: coupon, error } = await supabaseAdmin
      .from('coupons')
      .select('*')
      .eq('code', code)
      .maybeSingle();

    if (error || !coupon) {
      return { valid: false, message: '유효하지 않은 쿠폰입니다' };
    }

    if (coupon.status === 'used') {
      return { valid: false, message: '이미 사용된 쿠폰입니다' };
    }

    // 한국 시간 기준으로 만료 시간 비교
    const now = new Date();
    const koreaNow = new Date(now.getTime() + (9 * 60 * 60 * 1000));
    const expiresAt = new Date(coupon.expires_at);
    
    if (expiresAt < koreaNow) {
      return { valid: false, message: '쿠폰이 만료되었습니다 (24시간 초과)' };
    }

    return { valid: true, coupon };
  }
};

