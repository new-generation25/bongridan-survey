// 상수 정의

// 지역 옵션
export const REGIONS = [
  '중구',
  '동구',
  '서구',
  '남구',
  '북구',
  '울산',
  '경남',
  '경북',
  '기타'
] as const;

// 중구 동 옵션
export const JUNG_GU_DONGS = [
  '대흥동',
  '문화동',
  '은행선화동',
  '목동',
  '중촌동',
  '대사동',
  '부사동',
  '용두동',
  '오류동',
  '산성동',
  '석교동',
  '유천동',
  '기타'
] as const;

// 연령대 옵션
export const AGE_GROUPS = [
  '10대',
  '20대',
  '30대',
  '40대',
  '50대',
  '60대 이상'
] as const;

// 방문 목적 옵션
export const VISIT_PURPOSES = [
  '식사',
  '카페',
  '술/유흥',
  '쇼핑',
  '산책',
  '문화생활',
  '업무',
  '기타'
] as const;

// 방문 경로 옵션
export const VISIT_CHANNELS = [
  'SNS (인스타그램, 페이스북 등)',
  '지인 추천',
  '인터넷 검색',
  'TV/미디어',
  '우연히 발견',
  '기타'
] as const;

// 예산 옵션
export const BUDGETS = [
  '1만원 미만',
  '1만원~2만원',
  '2만원~3만원',
  '3만원~5만원',
  '5만원 이상'
] as const;

// 동행 옵션
export const COMPANIONS = [
  '혼자',
  '친구',
  '가족',
  '연인',
  '동료',
  '기타'
] as const;

// 방문 빈도 옵션
export const FREQUENCIES = [
  '처음',
  '월 1회',
  '월 2-3회',
  '주 1회 이상',
  '거의 매일'
] as const;

// 체류 시간 옵션
export const DURATIONS = [
  '30분 미만',
  '30분~1시간',
  '1시간~2시간',
  '2시간~3시간',
  '3시간 이상'
] as const;

// 만족도 옵션
export const SATISFACTIONS = [
  '매우 불만족',
  '불만족',
  '보통',
  '만족',
  '매우 만족'
] as const;

// 개선사항 옵션
export const IMPROVEMENTS = [
  '주차 공간',
  '화장실',
  '안내 표지판',
  '쉼터/벤치',
  '청결',
  '조명',
  'Wi-Fi',
  '없음',
  '기타'
] as const;

// 다른 관광지 옵션
export const OTHER_SPOTS = [
  '성심당',
  '으네골목',
  '중앙시장',
  '뿌리공원',
  '대전역',
  '한밭수목원',
  '엑스포시민광장',
  '없음',
  '기타'
] as const;

// 에러 메시지
export const ERROR_MESSAGES = {
  DUPLICATE_RESPONSE: '오늘 이미 참여하셨습니다. 내일 다시 참여해주세요!',
  COUPON_EXPIRED: '쿠폰이 만료되었습니다 (24시간 초과)',
  COUPON_USED: '이미 사용된 쿠폰입니다',
  COUPON_NOT_FOUND: '유효하지 않은 쿠폰입니다',
  STORE_NOT_FOUND: '존재하지 않는 가맹점입니다',
  NETWORK_ERROR: '연결이 불안정합니다. 다시 시도해주세요',
  INTERNAL_ERROR: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요',
  INVALID_REQUEST: '잘못된 요청입니다',
  UNAUTHORIZED: '권한이 없습니다'
} as const;

// 쿠폰 설정
export const COUPON_CONFIG = {
  AMOUNT: parseInt(process.env.NEXT_PUBLIC_COUPON_AMOUNT || '500'),
  VALIDITY_HOURS: parseInt(process.env.NEXT_PUBLIC_COUPON_VALIDITY_HOURS || '24')
} as const;

