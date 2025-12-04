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
  }
});

// Supabase 헬퍼 함수들
export const supabaseHelpers = {
  // 설문 중복 확인 (서버 사이드용)
  async checkDuplicateSurvey(deviceId: string): Promise<boolean> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data, error } = await supabaseAdmin
        .from('surveys')
        .select('id')
        .eq('device_id', deviceId)
        .gte('created_at', today.toISOString())
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

  // 쿠폰 코드 생성 (6자리 숫자)
  generateCouponCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  },

  // 쿠폰 만료 시간 계산
  calculateExpiryDate(hours: number = 24): string {
    const expiryDate = new Date();
    expiryDate.setHours(expiryDate.getHours() + hours);
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

    if (new Date(coupon.expires_at) < new Date()) {
      return { valid: false, message: '쿠폰이 만료되었습니다 (24시간 초과)' };
    }

    return { valid: true, coupon };
  }
};

