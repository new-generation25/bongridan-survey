'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import QRCode from 'qrcode';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Loading from '@/components/ui/Loading';
import { formatCurrency, formatDate, storage } from '@/lib/utils';
import type { Coupon } from '@/lib/types';

export default function CouponPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [couponId, setCouponId] = useState('');

  useEffect(() => {
    const fetchCoupon = async () => {
      try {
        const resolvedParams = await params;
        setCouponId(resolvedParams.id);
        const response = await fetch(`/api/coupon/${resolvedParams.id}`);
        const data = await response.json();

        if (data.success && data.coupon) {
          setCoupon(data.coupon);
          
          // QR 코드 생성
          const qrUrl = await QRCode.toDataURL(data.coupon.code, {
            width: 300,
            margin: 2,
          });
          setQrCodeUrl(qrUrl);
          
          // 쿠폰 ID 저장
          storage.set('last_coupon_id', resolvedParams.id);
        } else {
          alert('쿠폰을 찾을 수 없습니다.');
          router.push('/');
        }
      } catch (error) {
        console.error('Fetch coupon error:', error);
        alert('쿠폰을 불러오는 중 오류가 발생했습니다.');
        router.push('/');
      } finally {
        setLoading(false);
      }
    };

    fetchCoupon();
  }, [params, router]);

  if (loading) {
    return <Loading fullScreen text="쿠폰을 불러오는 중입니다..." />;
  }

  if (!coupon) {
    return null;
  }

  const isExpired = new Date(coupon.expires_at) < new Date();
  const isUsed = coupon.status === 'used';

  return (
    <main className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <div className="text-center space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-primary mb-2">
                🎉 쿠폰 발급 완료!
              </h1>
              <p className="text-textSecondary">
                설문에 참여해 주셔서 감사합니다
              </p>
            </div>

            {/* 쿠폰 금액 */}
            <div className="bg-primary bg-opacity-10 rounded-xl p-8">
              <p className="text-lg text-textSecondary mb-2">할인 금액</p>
              <p className="text-5xl font-bold text-primary">
                {formatCurrency(coupon.amount)}
              </p>
            </div>

            {/* QR 코드 */}
            <div className="space-y-3">
              <div className="bg-white p-6 rounded-xl inline-block">
                {qrCodeUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={qrCodeUrl} alt="QR Code" className="w-64 h-64" />
                )}
              </div>
              <p className="text-sm text-textSecondary">
                가맹점에서 이 QR 코드를 보여주세요
              </p>
            </div>

            {/* 쿠폰 코드 */}
            <div className="space-y-2">
              <p className="text-sm text-textSecondary">숫자 코드</p>
              <p className="text-3xl font-mono font-bold text-textPrimary tracking-wider">
                {coupon.code}
              </p>
              <p className="text-xs text-textSecondary">
                QR 스캔이 안 될 경우 이 번호를 알려주세요
              </p>
            </div>

            {/* 상태 표시 */}
            {isUsed && (
              <div className="bg-gray-100 rounded-lg p-4">
                <p className="text-textSecondary">
                  ✓ 이미 사용된 쿠폰입니다
                </p>
                <p className="text-sm text-textSecondary mt-1">
                  사용일시: {formatDate(coupon.used_at!, 'datetime')}
                </p>
              </div>
            )}

            {!isUsed && isExpired && (
              <div className="bg-red-50 rounded-lg p-4">
                <p className="text-error">
                  ⚠️ 쿠폰이 만료되었습니다
                </p>
              </div>
            )}

            {!isUsed && !isExpired && (
              <div className="bg-green-50 rounded-lg p-4">
                <p className="text-success">
                  유효기간: {formatDate(coupon.expires_at, 'datetime')}까지
                </p>
              </div>
            )}

            {/* 버튼들 */}
            <div className="space-y-3 pt-4">
              <Button
                onClick={() => router.push('/survey/step2')}
                fullWidth
                size="lg"
              >
                2단계 설문 계속하기
              </Button>
              
              <Button
                onClick={() => router.push('/stores')}
                variant="outline"
                fullWidth
              >
                가맹점 목록 보기
              </Button>
            </div>

            {/* 주의사항 */}
            <div className="text-left bg-gray-50 rounded-lg p-4 space-y-2 text-sm text-textSecondary">
              <p className="font-semibold text-textPrimary">⚠️ 주의사항</p>
              <ul className="list-disc list-inside space-y-1">
                <li>쿠폰은 발급 후 24시간 이내에 사용 가능합니다</li>
                <li>가맹점 1곳에서 1회만 사용 가능합니다</li>
                <li>다른 할인과 중복 사용 불가할 수 있습니다</li>
                <li>현금으로 교환되지 않습니다</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </main>
  );
}

