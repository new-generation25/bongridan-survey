'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Loading from '@/components/ui/Loading';
import type { Store } from '@/lib/types';

export default function StoresPage() {
  const router = useRouter();
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStores = async () => {
      try {
        const response = await fetch('/api/stores');
        const data = await response.json();

        if (data.success && data.stores) {
          setStores(data.stores);
        }
      } catch (error) {
        console.error('Fetch stores error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStores();
  }, []);

  if (loading) {
    return <Loading fullScreen text="가맹점 목록을 불러오는 중입니다..." />;
  }

  return (
    <main className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-textPrimary mb-2">
              쿠폰 사용 가능 가맹점
            </h1>
            <p className="text-textSecondary">
              총 {stores.length}개 가맹점에서 쿠폰을 사용할 수 있습니다
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {stores.map((store) => (
              <div
                key={store.id}
                className="border border-border rounded-lg p-4 text-center hover:border-primary hover:bg-blue-50 transition-colors"
              >
                <p className="font-semibold text-textPrimary">
                  {store.name}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-8 pt-6 border-t border-border">
            <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm text-textSecondary">
              <p className="font-semibold text-textPrimary">
                💡 이용 안내
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li>쿠폰은 발급 후 24시간 이내에 사용 가능합니다</li>
                <li>위 가맹점에서만 사용 가능합니다</li>
                <li>가맹점당 1회만 사용 가능합니다</li>
                <li>다른 할인과 중복 사용이 제한될 수 있습니다</li>
              </ul>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <Button
              onClick={() => {
                const couponId = localStorage.getItem('last_coupon_id');
                if (couponId) {
                  router.push(`/coupon/${JSON.parse(couponId)}`);
                } else {
                  router.push('/');
                }
              }}
              fullWidth
            >
              내 쿠폰 보기
            </Button>
            
            <Button
              onClick={() => router.push('/')}
              variant="outline"
              fullWidth
            >
              처음으로
            </Button>
          </div>
        </Card>
      </div>
    </main>
  );
}

