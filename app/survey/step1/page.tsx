'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import RadioGroup from '@/components/ui/RadioGroup';
import CheckboxGroup from '@/components/ui/CheckboxGroup';
import Loading from '@/components/ui/Loading';
import { getDeviceId, storage } from '@/lib/utils';
import { REGIONS, GIMHAE_DONGS, AGE_GROUPS, VISIT_PURPOSES, VISIT_CHANNELS, BUDGETS, COMPANIONS } from '@/lib/constants';

export default function SurveyStep1Page() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [startTime] = useState(Date.now());
  const [formData, setFormData] = useState({
    q1_region: '',
    q1_1_dong: '',
    q2_age: '',
    q3_purpose: [] as string[],
    q4_channel: '',
    q5_budget: '',
    q6_companion: '',
  });

  const showDongSelect = formData.q1_region === '김해시';

  // 진행률 계산 (각 문항 10%씩, 최대 60% - 1단계 6문항)
  const calculateProgress = () => {
    let progress = 0;
    if (formData.q1_region) progress += 10;
    if (showDongSelect && formData.q1_1_dong) progress += 10; // 김해시 선택 시 추가
    if (formData.q2_age) progress += 10;
    if (formData.q3_purpose.length > 0) progress += 10;
    if (formData.q4_channel) progress += 10;
    if (formData.q5_budget) progress += 10;
    if (formData.q6_companion) progress += 10;
    return progress;
  };

  const progress = calculateProgress();

  // 모든 필수 항목이 입력되었는지 확인
  const isFormValid = () => {
    const basicValid = formData.q1_region && formData.q2_age &&
      formData.q3_purpose.length > 0 && formData.q4_channel &&
      formData.q5_budget && formData.q6_companion;

    if (formData.q1_region === '김해시') {
      return basicValid && formData.q1_1_dong;
    }
    return basicValid;
  };

  // 설문 제출 공통 함수
  const submitSurvey = async (destination: 'step2' | 'coupon') => {
    if (!isFormValid()) {
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
          ...formData,
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

      // 목적지에 따라 이동
      if (destination === 'step2') {
        router.push('/survey/step2');
      } else {
        router.push(`/coupon/${data.coupon_id}`);
      }
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
            <span className="text-sm font-bold text-primary">{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-primary h-3 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      <div className="py-8 px-4">
        <div className="max-w-2xl mx-auto space-y-6">
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
                  value={formData.q1_region}
                  onChange={(value) => setFormData({ ...formData, q1_region: value, q1_1_dong: '' })}
                  required
                />
              </div>

              {showDongSelect && (
                <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
                  <RadioGroup
                    label="Q1-1. 김해시 어느 동에 거주하시나요?"
                    name="q1_1_dong"
                    options={GIMHAE_DONGS.map(d => ({ label: d, value: d }))}
                    value={formData.q1_1_dong}
                    onChange={(value) => setFormData({ ...formData, q1_1_dong: value })}
                  />
                </div>
              )}

              <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
                <RadioGroup
                  label="Q2. 연령대"
                  name="q2_age"
                  options={AGE_GROUPS.map(a => ({ label: a, value: a }))}
                  value={formData.q2_age}
                  onChange={(value) => setFormData({ ...formData, q2_age: value })}
                  required
                />
              </div>

              <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
                <CheckboxGroup
                  label="Q3. 오늘 봉리단길 방문 목적 (복수선택 가능)"
                  options={VISIT_PURPOSES.map(p => ({ label: p, value: p }))}
                  values={formData.q3_purpose}
                  onChange={(values) => setFormData({ ...formData, q3_purpose: values })}
                  required
                />
              </div>

              <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
                <RadioGroup
                  label="Q4. 봉리단길을 어떻게 알게 되셨나요?"
                  name="q4_channel"
                  options={VISIT_CHANNELS.map(c => ({ label: c, value: c }))}
                  value={formData.q4_channel}
                  onChange={(value) => setFormData({ ...formData, q4_channel: value })}
                  required
                />
              </div>

              <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
                <RadioGroup
                  label="Q5. 오늘 1인 예상 지출 금액"
                  name="q5_budget"
                  options={BUDGETS.map(b => ({ label: b, value: b }))}
                  value={formData.q5_budget}
                  onChange={(value) => setFormData({ ...formData, q5_budget: value })}
                  required
                />
              </div>

              <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
                <RadioGroup
                  label="Q6. 누구와 함께 방문하셨나요?"
                  name="q6_companion"
                  options={COMPANIONS.map(c => ({ label: c, value: c }))}
                  value={formData.q6_companion}
                  onChange={(value) => setFormData({ ...formData, q6_companion: value })}
                  required
                />
              </div>

              {/* 두 개의 버튼 나란히 */}
              <div className="space-y-3 pt-4">
                <div className="flex gap-3">
                  {/* 추가 설문하기 버튼 (강조) */}
                  <Button
                    onClick={() => submitSurvey('step2')}
                    disabled={!isFormValid()}
                    size="lg"
                    className="flex-1"
                  >
                    추가 설문하기
                  </Button>

                  {/* 설문 완료하기 버튼 (덜 강조) */}
                  <Button
                    onClick={() => submitSurvey('coupon')}
                    disabled={!isFormValid()}
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
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
}
