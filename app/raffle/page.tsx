'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Loading from '@/components/ui/Loading';
import { storage } from '@/lib/utils';

export default function RafflePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    agreed_privacy: false,
  });

  // 전화번호 유효성 검사 (한국 휴대폰 번호)
  const validatePhone = (phone: string): boolean => {
    // 숫자만 추출
    const numbers = phone.replace(/[^0-9]/g, '');
    // 010, 011, 016, 017, 018, 019로 시작하는 10-11자리
    const phoneRegex = /^01[0-9]{8,9}$/;
    return phoneRegex.test(numbers);
  };

  // 전화번호 포맷팅 (010-1234-5678 형식)
  const formatPhone = (value: string): string => {
    const numbers = value.replace(/[^0-9]/g, '');
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 7) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setFormData({ ...formData, phone: formatted });

    if (formatted && !validatePhone(formatted)) {
      setPhoneError('올바른 휴대폰 번호를 입력해주세요 (예: 010-1234-5678)');
    } else {
      setPhoneError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.phone) {
      alert('이름과 전화번호를 입력해주세요.');
      return;
    }

    if (!validatePhone(formData.phone)) {
      alert('올바른 휴대폰 번호를 입력해주세요.');
      return;
    }

    if (!formData.agreed_privacy) {
      alert('개인정보 수집에 동의해주세요.');
      return;
    }

    setLoading(true);

    try {
      const surveyId = storage.get<string>('survey_id');

      if (!surveyId) {
        alert('설문 정보를 찾을 수 없습니다.');
        router.push('/');
        return;
      }

      const response = await fetch('/api/raffle/enter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          survey_id: surveyId,
          ...formData,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || '오류가 발생했습니다.');
        setLoading(false);
        return;
      }

      router.push('/complete');
    } catch (error) {
      console.error('Submit error:', error);
      alert('네트워크 오류가 발생했습니다.');
      setLoading(false);
    }
  };

  if (loading) {
    return <Loading fullScreen text="추첨 응모 중입니다..." />;
  }

  return (
    <main className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <div className="text-center space-y-4 mb-8">
            <div className="text-6xl">🎁</div>
            <h1 className="text-2xl font-bold text-textPrimary">
              경품 추첨 응모
            </h1>
            <p className="text-textSecondary">
              응모하시면 2만원 상품권을 드립니다!
            </p>
            <div className="bg-primary bg-opacity-10 rounded-lg p-4">
              <p className="text-primary font-semibold">
                추첨을 통해 개별 연락드립니다
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              label="이름"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="홍길동"
              required
            />

            <div>
              <Input
                label="전화번호"
                type="tel"
                value={formData.phone}
                onChange={handlePhoneChange}
                placeholder="010-1234-5678"
                required
              />
              {phoneError && (
                <p className="mt-1 text-sm text-red-500">{phoneError}</p>
              )}
            </div>

            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.agreed_privacy}
                  onChange={(e) => setFormData({ ...formData, agreed_privacy: e.target.checked })}
                  className="w-5 h-5 text-primary rounded focus:ring-primary mt-0.5"
                  required
                />
                <div className="text-sm text-textSecondary">
                  <p className="font-medium text-textPrimary mb-1">
                    개인정보 수집 및 이용 동의 (필수)
                  </p>
                  <p>
                    수집 항목: 이름, 전화번호<br />
                    수집 목적: 경품 당첨 시 연락<br />
                    보유 기간: 추첨 종료 후 1개월<br />
                    거부 권리: 동의를 거부할 수 있으며, 거부 시 추첨에 참여할 수 없습니다.
                  </p>
                </div>
              </label>
            </div>

            <div className="space-y-3">
              <Button type="submit" fullWidth size="lg">
                추첨 응모하기
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </main>
  );
}

