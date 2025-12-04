'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Loading from '@/components/ui/Loading';
import { storage } from '@/lib/utils';

export default function CompletePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [couponId, setCouponId] = useState<string | null>(null);

  useEffect(() => {
    const loadCouponId = async () => {
      try {
        // 먼저 localStorage에서 쿠폰 ID 확인
        let id = localStorage.getItem('last_coupon_id') || storage.get<string>('coupon_id');
        
        // 쿠폰 ID가 없으면 survey_id로 쿠폰 조회
        if (!id) {
          const surveyId = storage.get<string>('survey_id');
          if (surveyId) {
            const response = await fetch(`/api/coupon/by-survey/${surveyId}`);
            const data = await response.json();
            if (data.success && data.coupon && data.coupon.id) {
              id = data.coupon.id;
              if (id) {
                localStorage.setItem('last_coupon_id', id);
              }
            }
          }
        }
        
        setCouponId(id);
      } catch (error) {
        console.error('Load coupon ID error:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCouponId();
  }, []);

  if (loading) {
    return <Loading fullScreen text="쿠폰 정보를 불러오는 중입니다..." />;
  }

  return (
    <main className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <div className="text-center space-y-6 py-8">
            <div className="text-8xl">✅</div>
            
            <div className="space-y-3">
              <h1 className="text-3xl font-bold text-textPrimary">
                설문 참여 완료!
              </h1>
              <p className="text-lg text-textSecondary">
                소중한 의견 감사합니다
              </p>
            </div>

            <div className="bg-primary bg-opacity-10 rounded-xl p-6 space-y-2">
              <p className="text-primary font-semibold text-lg">
                🎫 할인 쿠폰이 발급되었습니다
              </p>
              <p className="text-textSecondary">
                가맹점에서 쿠폰을 사용해 보세요!
              </p>
            </div>

            <div className="space-y-3 pt-4">
              <Button
                onClick={() => {
                  if (couponId) {
                    router.push(`/coupon/${couponId}`);
                  } else {
                    alert('쿠폰 정보를 찾을 수 없습니다.');
                    router.push('/');
                  }
                }}
                fullWidth
                size="lg"
                disabled={!couponId}
              >
                내 쿠폰 보기
              </Button>
              
              <Button
                onClick={() => router.push('/stores')}
                variant="outline"
                fullWidth
              >
                가맹점 목록 보기
              </Button>
              
              <Button
                onClick={() => router.push('/')}
                variant="ghost"
                fullWidth
              >
                처음으로
              </Button>
            </div>

            <div className="text-sm text-textSecondary pt-6 border-t border-border">
              <p>봉리단길을 방문해 주셔서 감사합니다! 😊</p>
            </div>
          </div>
        </Card>
      </div>
    </main>
  );
}

