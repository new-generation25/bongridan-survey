'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import RadioGroup from '@/components/ui/RadioGroup';
import CheckboxGroup from '@/components/ui/CheckboxGroup';
import ProgressBar from '@/components/ui/ProgressBar';
import Loading from '@/components/ui/Loading';
import { getDeviceId, storage } from '@/lib/utils';
import { REGIONS, GIMHAE_DONGS, AGE_GROUPS, VISIT_PURPOSES, VISIT_CHANNELS, BUDGETS, COMPANIONS } from '@/lib/constants';

export default function SurveyStep1Page() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showChoice, setShowChoice] = useState(false);
  const [couponId, setCouponId] = useState('');
  const [surveyId, setSurveyId] = useState('');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 기본 필수 항목 확인
    if (!formData.q1_region || !formData.q2_age || formData.q3_purpose.length === 0 ||
        !formData.q4_channel || !formData.q5_budget || !formData.q6_companion) {
      alert('모든 필수 항목을 입력해주세요.');
      return;
    }

    // 김해시 선택 시 Q1-1 필수 확인
    if (formData.q1_region === '김해시' && !formData.q1_1_dong) {
      alert('김해시 동을 선택해주세요.');
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
        console.error('API Error:', {
          status: response.status,
          statusText: response.statusText,
          data: data
        });
        const errorMessage = data.message || data.error || '오류가 발생했습니다.';
        alert(errorMessage);
        setLoading(false);
        return;
      }

      // 쿠폰 정보 저장
      storage.set('survey_id', data.survey_id);
      storage.set('coupon_id', data.coupon_id);

      // 상태 저장 후 선택 화면 표시
      setCouponId(data.coupon_id);
      setSurveyId(data.survey_id);
      setLoading(false);
      setShowChoice(true);
    } catch (error) {
      console.error('Submit error:', error);
      alert('네트워크 오류가 발생했습니다.');
      setLoading(false);
    }
  };

  // 중복 응답 확인 (테스트용으로 임시 비활성화)
  // useEffect(() => {
  //   const checkDuplicate = async () => {
  //     const deviceId = getDeviceId();
  //     const response = await fetch('/api/survey/check-duplicate', {
  //       method: 'POST',
  //       headers: { 'Content-Type': 'application/json' },
  //       body: JSON.stringify({ device_id: deviceId }),
  //     });
  //     const data = await response.json();
  //     if (data.is_duplicate) {
  //       alert(data.message);
  //       router.push('/');
  //     }
  //   };
  //   checkDuplicate();
  // }, [router]);

  if (loading) {
    return <Loading fullScreen text="설문을 제출하는 중입니다..." />;
  }

  // 1단계 완료 후 선택 화면
  if (showChoice) {
    return (
      <main className="min-h-screen bg-background py-8 px-4">
        <div className="max-w-2xl mx-auto space-y-6">
          <Card>
            <div className="text-center space-y-6">
              <div className="text-5xl">🎉</div>
              <h1 className="text-2xl font-bold text-textPrimary">
                1단계 설문 완료!
              </h1>
              <p className="text-textSecondary">
                500원 할인 쿠폰이 발급되었습니다.
              </p>

              <div className="space-y-4 pt-4">
                {/* 추가 설문하기 버튼 (강조) */}
                <div>
                  <Button
                    onClick={() => router.push('/survey/step2')}
                    fullWidth
                    size="lg"
                    className="bg-primary hover:bg-blue-600"
                  >
                    🎁 추가 설문하기
                  </Button>
                  <p className="text-sm text-textSecondary mt-2">
                    몇 개 문항에 더 응답하면 추첨을 통해 추가 보상을 제공합니다.
                  </p>
                </div>

                {/* 설문 완료하기 버튼 (덜 강조) */}
                <div className="pt-2">
                  <Button
                    onClick={() => router.push(`/coupon/${couponId}`)}
                    variant="outline"
                    fullWidth
                    size="lg"
                  >
                    설문 완료하기
                  </Button>
                  <p className="text-sm text-gray-400 mt-2">
                    바로 쿠폰을 확인합니다.
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <ProgressBar currentStep={1} totalSteps={2} />
        
        <Card>
          <h1 className="text-2xl font-bold text-textPrimary mb-2">
            설문조사 1단계
          </h1>
          <p className="text-textSecondary mb-6">
            기본 정보를 입력해주세요
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
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

            <Button type="submit" fullWidth size="lg">
              다음 단계로
            </Button>
          </form>
        </Card>
      </div>
    </main>
  );
}

