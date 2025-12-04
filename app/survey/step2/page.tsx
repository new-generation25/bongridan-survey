'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import RadioGroup from '@/components/ui/RadioGroup';
import CheckboxGroup from '@/components/ui/CheckboxGroup';
import ProgressBar from '@/components/ui/ProgressBar';
import Loading from '@/components/ui/Loading';
import { storage } from '@/lib/utils';
import { FREQUENCIES, DURATIONS, SATISFACTIONS, IMPROVEMENTS, OTHER_SPOTS } from '@/lib/constants';

export default function SurveyStep2Page() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [startTime] = useState(Date.now());
  const [formData, setFormData] = useState({
    q7_frequency: '',
    q8_duration: '',
    q9_satisfaction: '',
    q10_improvement: [] as string[],
    q11_other_spots: [] as string[],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.q7_frequency || !formData.q8_duration || !formData.q9_satisfaction ||
        formData.q10_improvement.length === 0 || formData.q11_other_spots.length === 0) {
      alert('모든 필수 항목을 입력해주세요.');
      return;
    }

    setLoading(true);

    try {
      const surveyId = storage.get<string>('survey_id');
      
      if (!surveyId) {
        alert('설문 정보를 찾을 수 없습니다. 1단계부터 다시 시작해주세요.');
        router.push('/survey/step1');
        return;
      }

      const responseTime = Math.floor((Date.now() - startTime) / 1000);

      const response = await fetch('/api/survey/step2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          survey_id: surveyId,
          ...formData,
          response_time_step2: responseTime,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || '오류가 발생했습니다.');
        setLoading(false);
        return;
      }

      // 추첨 페이지로 이동
      router.push('/raffle');
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
    <main className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <ProgressBar currentStep={2} totalSteps={2} />
        
        <Card>
          <h1 className="text-2xl font-bold text-textPrimary mb-2">
            설문조사 2단계
          </h1>
          <p className="text-textSecondary mb-6">
            방문 경험에 대해 알려주세요
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
              <RadioGroup
                label="Q7. 봉리단길 방문 빈도"
                name="q7_frequency"
                options={FREQUENCIES.map(f => ({ label: f, value: f }))}
                value={formData.q7_frequency}
                onChange={(value) => setFormData({ ...formData, q7_frequency: value })}
                required
              />
            </div>

            <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
              <RadioGroup
                label="Q8. 오늘 체류 예상 시간"
                name="q8_duration"
                options={DURATIONS.map(d => ({ label: d, value: d }))}
                value={formData.q8_duration}
                onChange={(value) => setFormData({ ...formData, q8_duration: value })}
                required
              />
            </div>

            <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
              <RadioGroup
                label="Q9. 봉리단길 전반적 만족도"
                name="q9_satisfaction"
                options={SATISFACTIONS.map(s => ({ label: s, value: s }))}
                value={formData.q9_satisfaction}
                onChange={(value) => setFormData({ ...formData, q9_satisfaction: value })}
                required
              />
            </div>

            <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
              <CheckboxGroup
                label="Q10. 봉리단길에서 아쉬운 점이 있다면? (복수선택 가능)"
                options={IMPROVEMENTS.map(i => ({ label: i, value: i }))}
                values={formData.q10_improvement}
                onChange={(values) => setFormData({ ...formData, q10_improvement: values })}
                required
              />
            </div>

            <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
              <CheckboxGroup
                label="Q11. 봉리단길 외에 방문하고 싶은 김해 관광지는? (복수선택 가능)"
                options={OTHER_SPOTS.map(o => ({ label: o, value: o }))}
                values={formData.q11_other_spots}
                onChange={(values) => setFormData({ ...formData, q11_other_spots: values })}
                required
              />
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                fullWidth
              >
                이전
              </Button>
              <Button type="submit" fullWidth size="lg">
                제출하기
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </main>
  );
}

