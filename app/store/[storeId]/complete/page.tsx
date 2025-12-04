'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { formatCurrency } from '@/lib/utils';

export default function StoreCompletePage({ params }: { params: Promise<{ storeId: string }> }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const amount = parseInt(searchParams.get('amount') || '500');
  const [storeId, setStoreId] = useState('');

  useEffect(() => {
    const loadParams = async () => {
      const resolvedParams = await params;
      setStoreId(resolvedParams.storeId);
    };
    loadParams();
  }, [params]);

  return (
    <main className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <div className="text-center space-y-6 py-8">
            <div className="text-8xl">✅</div>
            
            <div className="space-y-3">
              <h1 className="text-3xl font-bold text-success">
                쿠폰 사용 완료!
              </h1>
              <p className="text-lg text-textSecondary">
                할인이 정상적으로 적용되었습니다
              </p>
            </div>

            <div className="bg-success bg-opacity-10 rounded-xl p-8">
              <p className="text-textSecondary mb-2">할인 금액</p>
              <p className="text-5xl font-bold text-success">
                {formatCurrency(amount)}
              </p>
            </div>

            <div className="space-y-3 pt-4">
              <Button
                onClick={() => router.push(`/store/${storeId}`)}
                fullWidth
                size="lg"
              >
                다음 쿠폰 스캔하기
              </Button>
              
              <Button
                onClick={() => router.push(`/store/${storeId}`)}
                variant="ghost"
                fullWidth
              >
                처음으로
              </Button>
            </div>

            <div className="text-sm text-textSecondary pt-6 border-t border-border">
              <p>고객님께 감사 인사를 전해주세요! 😊</p>
            </div>
          </div>
        </Card>
      </div>
    </main>
  );
}

