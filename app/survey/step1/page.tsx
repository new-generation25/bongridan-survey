'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import RadioGroup from '@/components/ui/RadioGroup';
import CheckboxGroup from '@/components/ui/CheckboxGroup';
import Loading from '@/components/ui/Loading';
import { getDeviceId, storage } from '@/lib/utils';
import {
  REGIONS, GIMHAE_DONGS, AGE_GROUPS, VISIT_ACTIVITIES, VISIT_OCCASIONS, VISIT_CHANNELS, BUDGETS, COMPANIONS,
  FREQUENCIES, DURATIONS, SATISFACTIONS, IMPROVEMENTS, OTHER_SPOTS
} from '@/lib/constants';

export default function SurveyStep1Page() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [startTime] = useState(Date.now());
  const [showStep2, setShowStep2] = useState(false);
  const step2Ref = useRef<HTMLDivElement>(null);

  // Step1 데이터
  const [step1Data, setStep1Data] = useState({
    q1_region: '',
    q1_1_dong: '',
    q2_age: '',
    q3_activity: [] as string[],
    q3_1_occasion: '',
    q4_channel: '',
    q5_budget: '',
    q6_companion: '',
  });

  // Step2 데이터
  const [step2Data, setStep2Data] = useState({
    q7_frequency: '',
    q8_duration: '',
    q9_satisfaction: '',
    q10_improvement: [] as string[],
    q11_other_spots: [] as string[],
  });

  const showDongSelect = step1Data.q1_region === '김해시';

  // 전체 문항 수 계산 (Q1-1은 김해시 선택 시에만 포함)
  // Step1: Q1, (Q1-1), Q2, Q3, Q3-1, Q4, Q5, Q6 = 7문항 (김해시: 8문항)
  // Step2: Q7, Q8, Q9, Q10, Q11 = 5문항
  // 총 12문항 (김해시: 13문항)
  const getTotalQuestions = () => {
    const step1Questions = showDongSelect ? 8 : 7; // Q1, (Q1-1), Q2, Q3, Q3-1, Q4, Q5, Q6
    const step2Questions = showStep2 ? 5 : 0; // Q7, Q8, Q9, Q10, Q11
    return step1Questions + step2Questions;
  };

  // 응답한 문항 수 계산
  const getAnsweredQuestions = () => {
    let count = 0;
    // Step1
    if (step1Data.q1_region) count++;
    if (showDongSelect && step1Data.q1_1_dong) count++;
    if (step1Data.q2_age) count++;
    if (step1Data.q3_activity.length > 0) count++;
    if (step1Data.q3_1_occasion) count++;
    if (step1Data.q4_channel) count++;
    if (step1Data.q5_budget) count++;
    if (step1Data.q6_companion) count++;
    // Step2 (표시될 때만)
    if (showStep2) {
      if (step2Data.q7_frequency) count++;
      if (step2Data.q8_duration) count++;
      if (step2Data.q9_satisfaction) count++;
      if (step2Data.q10_improvement.length > 0) count++;
      if (step2Data.q11_other_spots.length > 0) count++;
    }
    return count;
  };

  // 전체 진행률 (응답 문항 수 / 전체 문항 수 * 100)
  const progress = Math.round((getAnsweredQuestions() / getTotalQuestions()) * 100);

  // Step1 필수 항목 확인
  const isStep1Valid = () => {
    const basicValid = step1Data.q1_region && step1Data.q2_age &&
      step1Data.q3_activity.length > 0 && step1Data.q3_1_occasion &&
      step1Data.q4_channel && step1Data.q5_budget && step1Data.q6_companion;

    if (step1Data.q1_region === '김해시') {
      return basicValid && step1Data.q1_1_dong;
    }
    return basicValid;
  };

  // Step2 필수 항목 확인
  const isStep2Valid = () => {
    return step2Data.q7_frequency && step2Data.q8_duration && step2Data.q9_satisfaction &&
      step2Data.q10_improvement.length > 0 && step2Data.q11_other_spots.length > 0;
  };

  // 추가 설문하기 - Step2 표시
  const handleShowStep2 = () => {
    if (!isStep1Valid()) {
      alert('모든 필수 항목을 입력해주세요.');
      return;
    }
    setShowStep2(true);
    // Step2 섹션으로 부드럽게 스크롤
    setTimeout(() => {
      step2Ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  // 설문 완료 (Step1만 제출)
  const handleCompleteStep1Only = async () => {
    if (!isStep1Valid()) {
      alert('모든 필수 항목을 입력해주세요.');
      return;
    }

    setLoading(true);

    try {
      const deviceId = getDeviceId();
      const responseTime = Math.floor((Date.now() - startTime) / 1000);

      const response = await fetch('/api/survey/step1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device_id: deviceId,
          ...step1Data,
          response_time_step1: responseTime,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('API Error:', { status: response.status, data });
        alert(data.message || '오류가 발생했습니다.');
        setLoading(false);
        return;
      }

      // 쿠폰 정보 저장
      storage.set('survey_id', data.survey_id);
      storage.set('coupon_id', data.coupon_id);

      // 쿠폰 페이지로 이동
      router.push(`/coupon/${data.coupon_id}`);
    } catch (error) {
      console.error('Submit error:', error);
      alert('네트워크 오류가 발생했습니다.');
      setLoading(false);
    }
  };

  // 전체 제출 (Step1 + Step2)
  const handleSubmitAll = async () => {
    if (!isStep1Valid()) {
      alert('1단계 설문의 모든 필수 항목을 입력해주세요.');
      return;
    }
    if (!isStep2Valid()) {
      alert('2단계 설문의 모든 필수 항목을 입력해주세요.');
      return;
    }

    setLoading(true);

    try {
      const deviceId = getDeviceId();
      const responseTime = Math.floor((Date.now() - startTime) / 1000);

      // Step1 제출
      const step1Response = await fetch('/api/survey/step1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device_id: deviceId,
          ...step1Data,
          response_time_step1: responseTime,
        }),
      });

      const step1Result = await step1Response.json();

      if (!step1Response.ok) {
        console.error('Step1 API Error:', { status: step1Response.status, data: step1Result });
        alert(step1Result.message || '오류가 발생했습니다.');
        setLoading(false);
        return;
      }

      // 쿠폰 정보 저장
      storage.set('survey_id', step1Result.survey_id);
      storage.set('coupon_id', step1Result.coupon_id);

      // Step2 제출
      const step2Response = await fetch('/api/survey/step2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          survey_id: step1Result.survey_id,
          ...step2Data,
          response_time_step2: Math.floor((Date.now() - startTime) / 1000) - responseTime,
        }),
      });

      const step2Result = await step2Response.json();

      if (!step2Response.ok) {
        console.error('Step2 API Error:', { status: step2Response.status, data: step2Result });
        alert(step2Result.message || '오류가 발생했습니다.');
        setLoading(false);
        return;
      }

      // 쿠폰 페이지로 이동 (2단계 완료 후에도 QR코드 먼저 보여줌)
      router.push(`/coupon/${step1Result.coupon_id}`);
    } catch (error) {
      console.error('Submit error:', error);
      alert('네트워크 오류가 발생했습니다.');
      setLoading(false);
    }
  };

  if (loading) {
    return <Loading fullScreen text="설문을 제출하는 중입니다..." />;
  }

  return (
    <main className="min-h-screen bg-background">
      {/* 상단 고정 진행바 */}
      <div className="sticky top-0 z-50 bg-white shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-textSecondary">설문 진행률</span>
            <span className="text-sm font-bold text-primary">{Math.min(progress, 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-primary h-3 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>
      </div>

      <div className="py-8 px-4">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Step 1 */}
          <Card>
            <h1 className="text-2xl font-bold text-textPrimary mb-2">
              설문조사 1단계
            </h1>
            <p className="text-textSecondary mb-6">
              기본 정보를 입력해주세요
            </p>

            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
                <RadioGroup
                  label="Q1. 거주 지역"
                  name="q1_region"
                  options={REGIONS.map(r => ({ label: r, value: r }))}
                  value={step1Data.q1_region}
                  onChange={(value) => setStep1Data({ ...step1Data, q1_region: value, q1_1_dong: '' })}
                  required
                />
              </div>

              {showDongSelect && (
                <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
                  <RadioGroup
                    label="Q1-1. 김해시 어느 동에 거주하시나요?"
                    name="q1_1_dong"
                    options={GIMHAE_DONGS.map(d => ({ label: d, value: d }))}
                    value={step1Data.q1_1_dong}
                    onChange={(value) => setStep1Data({ ...step1Data, q1_1_dong: value })}
                  />
                </div>
              )}

              <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
                <RadioGroup
                  label="Q2. 연령대"
                  name="q2_age"
                  options={AGE_GROUPS.map(a => ({ label: a, value: a }))}
                  value={step1Data.q2_age}
                  onChange={(value) => setStep1Data({ ...step1Data, q2_age: value })}
                  required
                />
              </div>

              <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
                <CheckboxGroup
                  label="Q3. 오늘 이용 예정 (복수선택 가능)"
                  options={VISIT_ACTIVITIES.map(a => ({ label: a, value: a }))}
                  values={step1Data.q3_activity}
                  onChange={(values) => setStep1Data({ ...step1Data, q3_activity: values })}
                  required
                />
              </div>

              <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
                <RadioGroup
                  label="Q3-1. 방문 계기"
                  name="q3_1_occasion"
                  options={VISIT_OCCASIONS.map(o => ({ label: o, value: o }))}
                  value={step1Data.q3_1_occasion}
                  onChange={(value) => setStep1Data({ ...step1Data, q3_1_occasion: value })}
                  required
                />
              </div>

              <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
                <RadioGroup
                  label="Q4. 봉리단길을 어떻게 알게 되셨나요?"
                  name="q4_channel"
                  options={VISIT_CHANNELS.map(c => ({ label: c, value: c }))}
                  value={step1Data.q4_channel}
                  onChange={(value) => setStep1Data({ ...step1Data, q4_channel: value })}
                  required
                />
              </div>

              <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
                <RadioGroup
                  label="Q5. 오늘 1인 예상 지출 금액"
                  name="q5_budget"
                  options={BUDGETS.map(b => ({ label: b, value: b }))}
                  value={step1Data.q5_budget}
                  onChange={(value) => setStep1Data({ ...step1Data, q5_budget: value })}
                  required
                />
              </div>

              <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
                <RadioGroup
                  label="Q6. 누구와 함께 방문하셨나요?"
                  name="q6_companion"
                  options={COMPANIONS.map(c => ({ label: c, value: c }))}
                  value={step1Data.q6_companion}
                  onChange={(value) => setStep1Data({ ...step1Data, q6_companion: value })}
                  required
                />
              </div>

              {/* Step1만 표시될 때 버튼 */}
              {!showStep2 && (
                <div className="space-y-3 pt-4">
                  <div className="flex gap-3">
                    <Button
                      onClick={handleShowStep2}
                      disabled={!isStep1Valid()}
                      size="lg"
                      className="flex-1"
                    >
                      추가 설문하기
                    </Button>

                    <Button
                      onClick={handleCompleteStep1Only}
                      disabled={!isStep1Valid()}
                      variant="outline"
                      size="lg"
                      className="flex-1"
                    >
                      설문 완료
                    </Button>
                  </div>

                  <p className="text-sm text-center text-textSecondary">
                    추가 설문 시 추첨을 통해 추가 보상을 제공합니다
                  </p>
                </div>
              )}
            </div>
          </Card>

          {/* Step 2 - 추가 설문하기 클릭 시 표시 */}
          {showStep2 && (
            <div ref={step2Ref}>
            <Card>
              <h1 className="text-2xl font-bold text-textPrimary mb-2">
                설문조사 2단계
              </h1>
              <p className="text-textSecondary mb-6">
                방문 경험에 대해 알려주세요
              </p>

              <div className="space-y-6">
                <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
                  <RadioGroup
                    label="Q7. 봉리단길 방문 빈도"
                    name="q7_frequency"
                    options={FREQUENCIES.map(f => ({ label: f, value: f }))}
                    value={step2Data.q7_frequency}
                    onChange={(value) => setStep2Data({ ...step2Data, q7_frequency: value })}
                    required
                  />
                </div>

                <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
                  <RadioGroup
                    label="Q8. 오늘 체류 예상 시간"
                    name="q8_duration"
                    options={DURATIONS.map(d => ({ label: d, value: d }))}
                    value={step2Data.q8_duration}
                    onChange={(value) => setStep2Data({ ...step2Data, q8_duration: value })}
                    required
                  />
                </div>

                <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
                  <RadioGroup
                    label="Q9. 봉리단길 전반적 만족도"
                    name="q9_satisfaction"
                    options={SATISFACTIONS.map(s => ({ label: s, value: s }))}
                    value={step2Data.q9_satisfaction}
                    onChange={(value) => setStep2Data({ ...step2Data, q9_satisfaction: value })}
                    required
                  />
                </div>

                <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
                  <CheckboxGroup
                    label="Q10. 봉리단길에서 아쉬운 점이 있다면? (복수선택 가능)"
                    options={IMPROVEMENTS.map(i => ({ label: i, value: i }))}
                    values={step2Data.q10_improvement}
                    onChange={(values) => setStep2Data({ ...step2Data, q10_improvement: values })}
                    required
                  />
                </div>

                <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
                  <CheckboxGroup
                    label="Q11. 봉리단길 외에 방문하고 싶은 김해 관광지는? (복수선택 가능)"
                    options={OTHER_SPOTS.map(o => ({ label: o, value: o }))}
                    values={step2Data.q11_other_spots}
                    onChange={(values) => setStep2Data({ ...step2Data, q11_other_spots: values })}
                    required
                  />
                </div>

                {/* 제출 버튼만 표시 (이전 버튼 삭제) */}
                <div className="pt-4">
                  <Button
                    onClick={handleSubmitAll}
                    disabled={!isStep1Valid() || !isStep2Valid()}
                    size="lg"
                    fullWidth
                  >
                    제출하기
                  </Button>
                </div>
              </div>
            </Card>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
