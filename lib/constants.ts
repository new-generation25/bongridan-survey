// 상수 정의

// 지역 옵션 (Q1)
export const REGIONS = [
  '김해시',
  '부산시',
  '양산시',
  '창원시',
  '경남 기타 지역',
  '그 외 지역'
] as const;

// 김해시 동 옵션 (Q1-1, 김해시 선택 시만 표시)
export const GIMHAE_DONGS = [
  '봉황동',
  '내외동',
  '삼계동',
  '장유동',
  '기타'
] as const;

// 연령대 옵션 (Q2)
export const AGE_GROUPS = [
  '10대',
  '20대 초반 (20~24세)',
  '20대 후반 (25~29세)',
  '30대 초반 (30~34세)',
  '30대 후반 (35~39세)',
  '40대',
  '50대 이상'
] as const;

// 이용 예정 장소/활동 옵션 (Q3, 복수 선택)
export const VISIT_ACTIVITIES = [
  '카페/디저트',
  '식사',
  '쇼핑/구경',
  '사진 촬영',
  '산책/여가',
  '기타'
] as const;

// 방문 계기 옵션 (Q3-1, 단일 선택)
export const VISIT_OCCASIONS = [
  '일상적인 외출/휴식',
  '특별한 날 (생일, 기념일 등)',
  '관광/여행 중',
  '업무/미팅',
  '우연히 지나가다',
  '기타'
] as const;

// 방문 경로 옵션 (Q4)
export const VISIT_CHANNELS = [
  'SNS (인스타그램, 유튜브 등)',
  '지인 추천',
  '검색/블로그 (네이버, 구글 등)',
  'TV/언론 보도',
  '우연히 지나가다',
  '기타'
] as const;

// 예산 옵션 (Q5)
export const BUDGETS = [
  '1만원 미만',
  '1~2만원',
  '2~3만원',
  '3~5만원',
  '5만원 이상'
] as const;

// 동행 옵션 (Q6)
export const COMPANIONS = [
  '혼자',
  '친구',
  '연인',
  '가족',
  '직장 동료',
  '기타'
] as const;

// 방문 빈도 옵션 (Q7)
export const FREQUENCIES = [
  '처음 방문',
  '연 1~2회',
  '월 1~2회',
  '주 1회 이상'
] as const;

// 체류 시간 옵션 (Q8)
export const DURATIONS = [
  '1시간 미만',
  '1~2시간',
  '3~4시간',
  '1박'
] as const;

// 만족도 옵션 (Q9)
export const SATISFACTIONS = [
  '매우 만족',
  '만족',
  '보통',
  '불만족',
  '매우 불만족'
] as const;

// 개선사항 옵션 (Q10, 복수 선택)
export const IMPROVEMENTS = [
  '주차 불편',
  '가게 종류 부족',
  '볼거리 부족',
  '안내/정보 부족',
  '가격이 비쌈',
  '특별히 없음',
  '기타'
] as const;

// 다른 관광지 옵션 (Q11, 복수 선택)
export const OTHER_SPOTS = [
  '수로왕릉/대성동고분군',
  '김해한옥체험관',
  '봉황대/국립김해박물관',
  '가야테마파크',
  '장유/율하 카페거리',
  '롯데프리미엄아울렛 등 쇼핑시설',
  '잘 모르겠음',
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

