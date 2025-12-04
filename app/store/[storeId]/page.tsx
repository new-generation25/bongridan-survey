'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Html5Qrcode } from 'html5-qrcode';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Loading from '@/components/ui/Loading';

export default function StoreScanPage({ params }: { params: Promise<{ storeId: string }> }) {
  const router = useRouter();
  const [storeName, setStoreName] = useState('');
  const [storeId, setStoreId] = useState('');
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');
  const qrCodeRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    // 스토어 정보 가져오기
    const fetchStore = async () => {
      try {
        const resolvedParams = await params;
        setStoreId(resolvedParams.storeId);
        const response = await fetch('/api/stores');
        const data = await response.json();
        
        if (data.success && data.stores) {
          const store = data.stores.find((s: { id: string; name: string }) => s.id === resolvedParams.storeId);
          if (store) {
            setStoreName(store.name);
          } else {
            alert('존재하지 않는 가맹점입니다.');
            router.push('/');
          }
        }
      } catch (error) {
        console.error('Fetch store error:', error);
      }
    };

    fetchStore();
  }, [params, router]);

  const handleCouponValidation = useCallback(async (code: string) => {
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

      if (!response.ok) {
        setError(data.message || '쿠폰 사용에 실패했습니다.');
        setScanning(false);
        return;
      }

      // 사용 완료 페이지로 이동
      router.push(`/store/${storeId}/complete?amount=${data.total_amount}`);
    } catch (error) {
      console.error('Coupon validation error:', error);
      setError('네트워크 오류가 발생했습니다.');
      setScanning(false);
    }
  }, [storeId, router]);

  const handleCouponValidationById = useCallback(async (couponId: string) => {
    try {
      // 먼저 쿠폰 정보 조회 (상점용 파라미터 추가)
      const validateResponse = await fetch(`/api/coupon/validate?id=${couponId}&store=${storeId}`);
      const validateData = await validateResponse.json();

      if (!validateResponse.ok || !validateData.valid) {
        setError(validateData.message || '유효하지 않은 쿠폰입니다.');
        setScanning(false);
        return;
      }

      // 쿠폰 사용 처리
      const response = await fetch('/api/coupon/use', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: validateData.coupon.code,
          store_id: storeId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || '쿠폰 사용에 실패했습니다.');
        setScanning(false);
        return;
      }

      // 사용 완료 페이지로 이동
      router.push(`/store/${storeId}/complete?amount=${data.total_amount}`);
    } catch (error) {
      console.error('Coupon validation error:', error);
      setError('네트워크 오류가 발생했습니다.');
      setScanning(false);
    }
  }, [storeId, router]);

  useEffect(() => {
    // storeId가 설정되면 자동으로 스캔 시작
    if (storeId && storeName && !scanning) {
      setScanning(true);
      return;
    }

    if (!scanning || !storeId || !storeName) return;

    let scanner: Html5Qrcode | null = null;

    // 스캐너 초기화 및 카메라 시작
    const startScanning = async () => {
      try {
        scanner = new Html5Qrcode('qr-reader');
        qrCodeRef.current = scanner;

        // 전면 카메라 찾기
        const devices = await Html5Qrcode.getCameras();
        let cameraId: string | null = null;
        
        // 전면 카메라 찾기 (facingMode: 'user')
        for (const device of devices) {
          if (device.label.toLowerCase().includes('front') || 
              device.label.toLowerCase().includes('user') ||
              device.label.toLowerCase().includes('전면')) {
            cameraId = device.id;
            break;
          }
        }
        
        // 전면 카메라를 찾지 못한 경우 첫 번째 카메라 사용
        if (!cameraId && devices.length > 0) {
          cameraId = devices[0].id;
        }

        if (!cameraId) {
          throw new Error('사용 가능한 카메라를 찾을 수 없습니다.');
        }

        // 카메라 시작 (설정 화면 없이 바로 시작)
        await scanner.start(
          cameraId,
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
            videoConstraints: {
              facingMode: 'user', // 전면 카메라
            },
          },
          async (decodedText) => {
            // QR 코드 스캔 성공
            if (scanner) {
              await scanner.stop().catch(console.error);
            }
            setScanning(false);
            
            // URL 형식인지 확인 (https://도메인/api/coupon/validate?id=xxx)
            let couponId: string | null = null;
            if (decodedText.includes('/api/coupon/validate?id=')) {
              try {
                // 절대 URL인 경우
                if (decodedText.startsWith('http://') || decodedText.startsWith('https://')) {
                  const url = new URL(decodedText);
                  couponId = url.searchParams.get('id');
                } else {
                  // 상대 URL인 경우
                  const url = new URL(decodedText, window.location.origin);
                  couponId = url.searchParams.get('id');
                }
              } catch (e) {
                // URL 파싱 실패 시 숫자 코드로 처리
                await handleCouponValidation(decodedText);
                return;
              }
            } else {
              // 숫자 코드인 경우 (기존 방식 호환)
              await handleCouponValidation(decodedText);
              return;
            }
            
            if (couponId) {
              await handleCouponValidationById(couponId);
            } else {
              setError('유효하지 않은 QR 코드입니다.');
              setScanning(false);
            }
          },
          (error) => {
            // 스캔 실패 (무시 - 계속 스캔 시도)
            // console.log('Scan error:', error);
          }
        );
      } catch (error) {
        console.error('Scanner initialization error:', error);
        setError('QR 스캐너를 시작할 수 없습니다. 카메라 권한을 확인해주세요.');
        setScanning(false);
      }
    };

    startScanning();

    return () => {
      if (scanner) {
        scanner.stop().catch(console.error);
        scanner.clear().catch(console.error);
      }
    };
  }, [scanning, storeId, storeName, router, handleCouponValidation, handleCouponValidationById]);


  const handleStartScan = () => {
    setError('');
    setScanning(true);
  };

  const handleStopScan = () => {
    setScanning(false);
  };

  if (!storeName) {
    return <Loading fullScreen />;
  }

  return (
    <main className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <div className="text-center space-y-4 mb-6">
            <h1 className="text-2xl font-bold text-textPrimary">
              {storeName}
            </h1>
            <p className="text-textSecondary">
              고객의 쿠폰 QR 코드를 스캔해주세요
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-error rounded-lg p-4 mb-6">
              <p className="text-error font-medium">⚠️ {error}</p>
            </div>
          )}

          {!scanning && (
            <div className="space-y-4">
              <Button onClick={handleStartScan} fullWidth size="lg">
                📷 QR 코드 스캔 시작
              </Button>
              
              <Button
                onClick={() => router.push(`/store/${storeId}/manual`)}
                variant="outline"
                fullWidth
              >
                숫자 코드로 입력하기
              </Button>
            </div>
          )}

          {scanning && (
            <div className="space-y-4">
              <div id="qr-reader" className="w-full"></div>
              
              <Button
                onClick={handleStopScan}
                variant="outline"
                fullWidth
              >
                스캔 중지
              </Button>
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-border text-sm text-textSecondary space-y-2">
            <p className="font-semibold text-textPrimary">
              💡 사용 안내
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>고객의 쿠폰 QR 코드를 카메라에 비춰주세요</li>
              <li>QR 스캔이 안 되면 숫자 코드를 직접 입력하세요</li>
              <li>쿠폰당 500원 할인이 적용됩니다</li>
              <li>사용된 쿠폰은 재사용할 수 없습니다</li>
            </ul>
          </div>
        </Card>
      </div>
    </main>
  );
}

