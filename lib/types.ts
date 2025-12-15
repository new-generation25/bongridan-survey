// 데이터베이스 타입 정의

export interface Survey {
  id: string;
  created_at: string;
  device_id: string;
  
  // 1단계 필수 문항
  q1_region: string;
  q1_1_dong?: string;
  q2_age: string;
  q3_activity: string[];
  q4_occasion: string;
  q5_channel: string;
  q6_budget: string;
  q7_companion: string;

  // 2단계 추가 문항
  q8_frequency?: string;
  q9_duration?: string;
  q10_satisfaction?: string;
  q11_improvement?: string[];
  q12_other_spots?: string[];
  
  // 메타 정보
  stage_completed: number;
  response_time_step1?: number;
  response_time_step2?: number;
}

export interface Coupon {
  id: string;
  code: string;
  survey_id: string;
  status: 'issued' | 'used' | 'expired';
  amount: number;
  issued_at: string;
  expires_at: string;
  used_at?: string;
  used_store_id?: string;
  survey_stage_completed?: number; // 설문 완료 단계 (1: 1단계만, 2: 2단계까지 완료)
}

export interface Store {
  id: string;
  created_at: string;
  name: string;
  manager_name?: string;
  manager_phone?: string;
  is_active: boolean;
  total_settled: number;
}

export interface Settlement {
  id: string;
  created_at: string;
  store_id: string;
  amount: number;
  note?: string;
  settled_by?: string;
}

export interface RaffleEntry {
  id: string;
  created_at: string;
  survey_id: string;
  name: string;
  phone: string;
  agreed_privacy: boolean;
}

export interface Settings {
  id: string;
  key: string;
  value: string;
  updated_at: string;
}

// API 응답 타입
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// 설문 제출 데이터 타입
export interface SurveyStep1Data {
  device_id: string;
  q1_region: string;
  q1_1_dong?: string;
  q2_age: string;
  q3_activity: string[];
  q4_occasion: string;
  q5_channel: string;
  q6_budget: string;
  q7_companion: string;
  response_time_step1: number;
}

export interface SurveyStep2Data {
  survey_id: string;
  q8_frequency: string;
  q9_duration: string;
  q10_satisfaction: string;
  q11_improvement: string[];
  q12_other_spots: string[];
  response_time_step2: number;
}

// 가맹점 통계 타입
export interface StoreStats {
  today_count: number;
  today_amount: number;
  total_count: number;
  total_amount: number;
  settled_amount: number;
  unsettled_amount: number;
}

// 대시보드 데이터 타입
export interface DashboardData {
  today: {
    surveys: number;
    coupons_issued: number;
    coupons_used: number;
    amount_used: number;
  };
  total: {
    surveys: number;
    surveys_step2: number;
    coupons_issued: number;
    coupons_used: number;
    amount_used: number;
    raffle_entries: number;
  };
  budget: {
    total: number;
    used: number;
    remaining: number;
    usage_rate: number;
  };
  by_region: Array<{
    region: string;
    count: number;
    percentage: number;
  }>;
  by_date: Array<{
    date: string;
    surveys: number;
    coupons_used: number;
  }>;
}

