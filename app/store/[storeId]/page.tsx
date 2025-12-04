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
  const [totalAmount, setTotalAmount] = useState(0);
  const [scanCount, setScanCount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const scannedCouponsRef = useRef<Set<string>>(new Set());
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
    // 중복 스캔 체크
    if (scannedCouponsRef.current.has(code)) {
      setError('이미 적립된 쿠폰입니다.');
      return false;
    }

    setIsProcessing(true);
    
    try {
      // 스캔 성공 피드백 (찰칵 효과) - 안전하게 처리
      try {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioContextClass) {
          const audioContext = new AudioContextClass();
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          oscillator.frequency.value = 800;
          oscillator.type = 'sine';
          
          gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
          
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.1);
        }
      } catch (audioError) {
        // 오디오 에러는 무시하고 계속 진행
        console.log('Audio feedback error:', audioError);
      }

      // 처리 딜레이 (500ms)
      await new Promise(resolve => setTimeout(resolve, 500));

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
        // 이미 사용된 쿠폰인 경우
        if (data.message?.includes('이미 사용') || data.message?.includes('사용된')) {
          scannedCouponsRef.current.add(code);
          setError('이미 적립된 쿠폰입니다.');
        } else {
          setError(data.message || '쿠폰 사용에 실패했습니다.');
        }
        setIsProcessing(false);
        return false;
      }

      // 성공 시 스캔된 쿠폰에 추가
      scannedCouponsRef.current.add(code);

      // 누적 금액 업데이트 (카메라 유지)
      setTotalAmount((prev) => prev + (data.total_amount || 500));
      setScanCount((prev) => prev + 1);
      setError(''); // 성공 시 에러 메시지 제거
      setIsProcessing(false);
      return true;
    } catch (error) {
      console.error('Coupon validation error:', error);
      setError('네트워크 오류가 발생했습니다.');
      setIsProcessing(false);
      return false;
    }
  }, [storeId]);

  const handleCouponValidationById = useCallback(async (couponId: string) => {
    // 중복 스캔 체크
    if (scannedCouponsRef.current.has(couponId)) {
      setError('이미 적립된 쿠폰입니다.');
      return false;
    }

    setIsProcessing(true);

    try {
      // 먼저 쿠폰 정보 조회 (상점용 파라미터 추가)
      const validateResponse = await fetch(`/api/coupon/validate?id=${couponId}&store=${storeId}`);
      const validateData = await validateResponse.json();

      if (!validateResponse.ok || !validateData.valid) {
        setError(validateData.message || '유효하지 않은 쿠폰입니다.');
        setIsProcessing(false);
        return false;
      }

      // 스캔 성공 피드백 (찰칵 효과) - 안전하게 처리
      try {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioContextClass) {
          const audioContext = new AudioContextClass();
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          oscillator.frequency.value = 800;
          oscillator.type = 'sine';
          
          gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
          
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.1);
        }
      } catch (audioError) {
        // 오디오 에러는 무시하고 계속 진행
        console.log('Audio feedback error:', audioError);
      }

      // 처리 딜레이 (500ms)
      await new Promise(resolve => setTimeout(resolve, 500));

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
        // 이미 사용된 쿠폰인 경우
        if (data.message?.includes('이미 사용') || data.message?.includes('사용된')) {
          scannedCouponsRef.current.add(couponId);
          setError('이미 적립된 쿠폰입니다.');
        } else {
          setError(data.message || '쿠폰 사용에 실패했습니다.');
        }
        setIsProcessing(false);
        return false;
      }

      // 성공 시 스캔된 쿠폰에 추가
      scannedCouponsRef.current.add(couponId);

      // 누적 금액 업데이트 (카메라 유지)
      setTotalAmount((prev) => prev + (data.total_amount || 500));
      setScanCount((prev) => prev + 1);
      setError(''); // 성공 시 에러 메시지 제거
      setIsProcessing(false);
      return true;
    } catch (error) {
      console.error('Coupon validation error:', error);
      setError('네트워크 오류가 발생했습니다.');
      setIsProcessing(false);
      return false;
    }
  }, [storeId]);

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

        // 후면 카메라 찾기
        const devices = await Html5Qrcode.getCameras();
        let cameraId: string | null = null;
        
        // 후면 카메라 찾기 (facingMode: 'environment')
        for (const device of devices) {
          if (device.label.toLowerCase().includes('back') || 
              device.label.toLowerCase().includes('rear') ||
              device.label.toLowerCase().includes('environment') ||
              device.label.toLowerCase().includes('후면')) {
            cameraId = device.id;
            break;
          }
        }
        
        // 후면 카메라를 찾지 못한 경우 마지막 카메라 사용 (보통 후면이 마지막)
        if (!cameraId && devices.length > 0) {
          cameraId = devices[devices.length - 1].id;
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
              facingMode: 'environment', // 후면 카메라
            },
          },
          async (decodedText) => {
            try {
              // 처리 중이면 무시 (중복 스캔 방지)
              if (isProcessing) {
                return;
              }

              // QR 코드 스캔 성공 - 카메라는 계속 유지
              // 스캐너를 멈추지 않고 계속 스캔 가능하도록 유지
              
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
              }
            } catch (error) {
              console.error('QR scan callback error:', error);
              setError('QR 코드 처리 중 오류가 발생했습니다.');
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
        scanner.clear();
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
              <p className="text-error font-medium text-center">⚠️ {error}</p>
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
              {/* 처리 중 표시 */}
              {isProcessing && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                  <p className="text-blue-700 font-medium">적립 처리 중...</p>
                </div>
              )}

              <div id="qr-reader" className="w-full"></div>
              
              {/* 누적 금액 표시 */}
              {(totalAmount > 0 || scanCount > 0) && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <p className="text-sm text-green-700 mb-1">적립 완료</p>
                  <p className="text-2xl font-bold text-green-800">
                    쿠폰 금액: {totalAmount.toLocaleString()}원
                  </p>
                  {scanCount > 0 && (
                    <p className="text-xs text-green-600 mt-1">
                      ({scanCount}개 쿠폰 사용)
                    </p>
                  )}
                </div>
              )}
              
              <Button
                onClick={handleStopScan}
                variant="outline"
                fullWidth
              >
                {totalAmount > 0 ? '적립 완료' : '스캔 중지'}
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

