'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

export default function ManualInputPage({ params }: { params: Promise<{ storeId: string }> }) {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [storeId, setStoreId] = useState('');

  useEffect(() => {
    const loadParams = async () => {
      const resolvedParams = await params;
      setStoreId(resolvedParams.storeId);
    };
    loadParams();
  }, [params]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!code || code.length !== 6) {
      setError('6자리 숫자 코드를 입력해주세요.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/coupon/use', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          store_id: storeId,
        }),
      });

      const data = await response.json();

      // 성공 응답 확인 (response.ok와 data.success 모두 확인)
      if (!response.ok || data.success !== true) {
        setError(data?.message || '쿠폰 사용에 실패했습니다.');
        setLoading(false);
        return;
      }

      // 사용 완료 페이지로 이동
      router.push(`/store/${storeId}/complete?amount=${data.total_amount}`);
    } catch (error) {
      console.error('Coupon validation error:', error);
      setError('네트워크 오류가 발생했습니다.');
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <div className="text-center space-y-4 mb-6">
            <h1 className="text-2xl font-bold text-textPrimary">
              숫자 코드 입력
            </h1>
            <p className="text-textSecondary">
              고객의 쿠폰 번호를 입력해주세요
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              label="쿠폰 번호 (6자리)"
              type="text"
              value={code}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                setCode(value);
                setError('');
              }}
              placeholder="123456"
              error={error}
              helperText="숫자 6자리를 입력하세요"
              required
              maxLength={6}
              className="text-center text-2xl tracking-wider font-mono"
            />

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                fullWidth
              >
                뒤로
              </Button>
              <Button
                type="submit"
                disabled={loading || code.length !== 6}
                fullWidth
                size="lg"
              >
                {loading ? '확인 중...' : '쿠폰 사용하기'}
              </Button>
            </div>
          </form>

          <div className="mt-8 pt-6 border-t border-border text-sm text-textSecondary">
            <p className="font-semibold text-textPrimary mb-2">
              💡 참고사항
            </p>
            <p>
              고객 화면에 표시된 6자리 숫자 코드를 정확히 입력해주세요.
            </p>
          </div>
        </Card>
      </div>
    </main>
  );
}

