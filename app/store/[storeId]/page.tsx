'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Html5Qrcode } from 'html5-qrcode';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Loading from '@/components/ui/Loading';
import { COUPON_CONFIG } from '@/lib/constants';

// 비디오 스트림에서 프레임을 캡처하여 File 객체로 변환하는 헬퍼 함수
const captureFrameAsFile = (videoElement: HTMLVideoElement): Promise<File> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      reject(new Error('Canvas context not available'));
      return;
    }
    ctx.drawImage(videoElement, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Failed to capture frame'));
        return;
      }
      const file = new File([blob], 'capture.jpg', { type: 'image/jpeg' });
      resolve(file);
    }, 'image/jpeg', 0.95);
  });
};

export default function StoreScanPage({ params }: { params: Promise<{ storeId: string }> }) {
  const router = useRouter();
  const [storeName, setStoreName] = useState('');
  const [storeId, setStoreId] = useState('');
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');
  const [totalAmount, setTotalAmount] = useState(0);
  const [scanCount, setScanCount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [debugLogs, setDebugLogs] = useState<Array<{time: string, message: string, data: unknown}>>([]);
  const [showSuccessFlash, setShowSuccessFlash] = useState(false);
  const [flashAmount, setFlashAmount] = useState(0);
  const [cameraPaused, setCameraPaused] = useState(false);
  const [pendingCoupons, setPendingCoupons] = useState<Array<{couponId: string, timestamp: number}>>([]); // 촬영한 QR 코드 목록 (아직 적립하지 않은 것들)
  const [storeStats, setStoreStats] = useState<{
    today_count: number;
    today_amount: number;
    total_count: number;
    total_amount: number;
  } | null>(null);
  const scannedCouponsRef = useRef<Set<string>>(new Set());
  const processingCouponsRef = useRef<Set<string>>(new Set()); // 처리 중인 쿠폰 ID 추적
  const pendingCouponsRef = useRef<Array<{couponId: string, timestamp: number}>>([]); // 촬영한 QR 코드 목록 (ref로 관리)
  const qrCodeRef = useRef<Html5Qrcode | null>(null);
  const errorTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastScanTimeRef = useRef<number>(0); // 마지막 QR 코드 인식 시간 (밀리초)
  const handleCouponValidationByIdRef = useRef<((couponId: string) => Promise<boolean>) | null>(null);
  const isMountedRef = useRef<boolean>(true); // 컴포넌트 마운트 상태 추적
  const isCleaningUpRef = useRef<boolean>(false); // 스캐너 정리 중 여부

  // 통계 조회 함수
  const fetchStoreStats = useCallback(async (storeIdValue: string) => {
    try {
      const response = await fetch(`/api/store/${storeIdValue}/stats`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setStoreStats({
            today_count: data.today_count || 0,
            today_amount: data.today_amount || 0,
            total_count: data.total_count || 0,
            total_amount: data.total_amount || 0,
          });
        }
      }
    } catch (error) {
      console.error('Fetch stats error:', error);
    }
  }, []);

  useEffect(() => {
    // 스토어 정보 가져오기
    const fetchStore = async () => {
      try {
        const resolvedParams = await params;
        const storeIdValue = resolvedParams.storeId;
        setStoreId(storeIdValue);
        const response = await fetch('/api/stores');
        const data = await response.json();
        
        if (data.success && data.stores) {
          const store = data.stores.find((s: { id: string; name: string }) => s.id === storeIdValue);
          if (store) {
            setStoreName(store.name);
            // 스토어 정보 로드 후 통계 조회
            fetchStoreStats(storeIdValue);
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
  }, [params, router, fetchStoreStats]);

  // 디버그 로그 추가 함수
  const addDebugLog = useCallback((message: string, data: unknown) => {
    const logEntry = {
      time: new Date().toLocaleTimeString('ko-KR'),
      message,
      data
    };
    setDebugLogs(prev => [...prev.slice(-9), logEntry]); // 최근 10개만 유지
    console.log(`[DEBUG] ${message}:`, data);
  }, []);

  // 에러 상태 변화 추적 (프로덕션 환경에서도 작동) - error만 추적하여 중복 방지
  const prevErrorRef = useRef<string>('');
  useEffect(() => {
    // error가 실제로 변경되었을 때만 로그 추가 (중복 방지)
    if (error && error !== prevErrorRef.current) {
      prevErrorRef.current = error;
      const logData = {
        errorMessage: error,
        hasErrorTimeout: !!errorTimeoutRef.current,
        scannedSetSize: scannedCouponsRef.current.size,
        scannedCodes: Array.from(scannedCouponsRef.current),
        totalAmount,
        scanCount,
        isProcessing,
        timestamp: new Date().toISOString()
      };
      
      addDebugLog('Error state changed', logData);
    } else if (!error && prevErrorRef.current) {
      prevErrorRef.current = '';
    }
  }, [error, addDebugLog, totalAmount, scanCount, isProcessing]);

  // 쿠폰 검증 함수 (코드 기반)
  const handleCouponValidation = useCallback(async (code: string) => {
    addDebugLog('handleCouponValidation entry', {
      code,
      hasCode: scannedCouponsRef.current.has(code),
      scannedSetSize: scannedCouponsRef.current.size,
      scannedCodes: Array.from(scannedCouponsRef.current)
    });

    // 중복 스캔 체크
    if (scannedCouponsRef.current.has(code)) {
      addDebugLog('Duplicate scan detected', {code,scannedCodes:Array.from(scannedCouponsRef.current)});
      setError('이미 적립된 쿠폰입니다.');
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
      errorTimeoutRef.current = setTimeout(() => {
        addDebugLog('Error timeout callback executed (duplicate)', {code});
        setError('');
      }, 3000);
      return false;
    }

    setIsProcessing(true);
    // 이전 에러 메시지와 타임아웃 정리
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
      errorTimeoutRef.current = null;
    }
    setError(''); // 처리 시작 시 에러 메시지 제거

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

      addDebugLog('API response received', {responseOk:response.ok,responseStatus:response.status,dataSuccess:data?.success,dataMessage:data?.message,code});
      
      // 성공 응답 확인 (response.ok와 data.success 모두 확인)
      if (response.ok && data.success === true) {
        addDebugLog('Success response branch', {code,currentError:error,beforeSetError:true,hasErrorTimeout:!!errorTimeoutRef.current});
        
        // 성공 시 즉시 에러 메시지와 타임아웃 제거 (가장 먼저 처리)
        // 에러 타임아웃을 먼저 제거 (중요!)
        if (errorTimeoutRef.current) {
          clearTimeout(errorTimeoutRef.current);
          errorTimeoutRef.current = null;
          addDebugLog('Cleared error timeout on success', {code});
        }
        // 에러 메시지가 있으면 즉시 제거
        if (error) {
          addDebugLog('Clearing error on success', {code,previousError:error});
          setError('');
        }
        
        // 성공 시 스캔된 쿠폰에 추가 (중복 방지)
        scannedCouponsRef.current.add(code);
        addDebugLog('Coupon added to scanned set', {code,scannedSetSize:scannedCouponsRef.current.size,scannedCodes:Array.from(scannedCouponsRef.current)});
      } else {
        addDebugLog('Error response branch', {responseOk:response.ok,responseStatus:response.status,dataSuccess:data?.success,errorMessage:data?.message,code});
        // 실패 응답 처리
        const errorMessage = data?.message || '쿠폰 사용에 실패했습니다.';
        
        // 이미 사용된 쿠폰인 경우 - 스캔된 쿠폰 목록에 추가하여 중복 방지
        if (errorMessage.includes('이미 사용') || errorMessage.includes('사용된') || errorMessage.includes('이미 적립')) {
          addDebugLog('Already used coupon error', {code,errorMessage});
          scannedCouponsRef.current.add(code);
          setError('이미 적립된 쿠폰입니다.');
          // 에러 메시지 자동 제거 (3초 후)
          if (errorTimeoutRef.current) {
            clearTimeout(errorTimeoutRef.current);
          }
          errorTimeoutRef.current = setTimeout(() => {
            addDebugLog('Error timeout callback executed (API error)', {code});
            setError('');
          }, 3000);
        } else if (errorMessage.includes('유효하지 않은')) {
          setError('유효하지 않은 쿠폰입니다.');
          if (errorTimeoutRef.current) {
            clearTimeout(errorTimeoutRef.current);
          }
          errorTimeoutRef.current = setTimeout(() => setError(''), 3000);
        } else if (errorMessage.includes('만료')) {
          setError('쿠폰이 만료되었습니다.');
          if (errorTimeoutRef.current) {
            clearTimeout(errorTimeoutRef.current);
          }
          errorTimeoutRef.current = setTimeout(() => setError(''), 3000);
        } else {
          setError(errorMessage);
          if (errorTimeoutRef.current) {
            clearTimeout(errorTimeoutRef.current);
          }
          errorTimeoutRef.current = setTimeout(() => setError(''), 3000);
        }
        setIsProcessing(false);
        // 카메라는 유지 (setScanning 호출하지 않음)
        return false;
      }

      // 성공 처리 계속 진행

      addDebugLog('After success check, before amount update', {code,currentError:error,hasErrorTimeout:!!errorTimeoutRef.current});
      
      // 성공 시 에러 메시지와 타임아웃 확실히 제거 (즉시, 다시 한 번 확인)
      if (errorTimeoutRef.current) {
        addDebugLog('Clearing error timeout before amount update', {code});
        clearTimeout(errorTimeoutRef.current);
        errorTimeoutRef.current = null;
      }
      // 에러 메시지가 있으면 제거 (함수형 업데이트 사용하여 클로저 문제 방지)
      setError((currentError) => {
        if (currentError) {
          addDebugLog('Clearing error before amount update', {code,previousError:currentError});
          return '';
        }
        return currentError;
      });

      // 누적 금액 업데이트 (카메라 유지)
      // API의 total_amount는 단일 쿠폰 금액이므로 500원 사용
      const addedAmount = COUPON_CONFIG.AMOUNT;
      
      // 카메라 일시 정지 (검정 화면 표시)
      setCameraPaused(true);
      // 카메라 스트림을 일시적으로 숨기기 위해 오버레이 표시
      
      // 누적 금액 업데이트 (함수형 업데이트로 최신 값 사용)
      setTotalAmount((prev) => prev + addedAmount);
      setScanCount((prev) => prev + 1);
      
      // 통계 업데이트 (에러가 발생해도 에러 메시지 표시하지 않음)
      if (storeId) {
        fetchStoreStats(storeId).catch((statsError) => {
          // 통계 조회 실패는 무시 (에러 메시지 표시하지 않음)
          console.error('Fetch stats error:', statsError);
        });
      }
      
      // 성공 플래시 효과 (검정색 깜박임 + 500원 적립 효과)
      setFlashAmount(addedAmount);
      setShowSuccessFlash(true);
      
      // 1초 후 카메라 재개
      setTimeout(() => {
        setShowSuccessFlash(false);
        setFlashAmount(0);
        setCameraPaused(false);
        // 에러 타임아웃이 설정되어 있으면 제거 (에러 메시지는 설정하지 않음)
        if (errorTimeoutRef.current) {
          addDebugLog('Clearing error timeout after flash', {code});
          clearTimeout(errorTimeoutRef.current);
          errorTimeoutRef.current = null;
        }
        // 에러 메시지도 확인하여 제거 (함수형 업데이트 사용하여 클로저 문제 방지)
        setError((currentError) => {
          if (currentError) {
            addDebugLog('Clearing error after flash (functional update)', {code,previousError:currentError});
            return '';
          }
          return currentError;
        });
      }, 1000);
      
      setIsProcessing(false);
      return true;
    } catch (error) {
      console.error('Coupon validation error:', error);
      // 에러 타입에 따라 다른 메시지 표시
      if (error instanceof TypeError && error.message.includes('fetch')) {
        setError('네트워크 연결을 확인해주세요.');
      } else if (error instanceof Error) {
        setError(`오류: ${error.message}`);
      } else {
        setError('쿠폰 처리 중 오류가 발생했습니다.');
      }
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
      errorTimeoutRef.current = setTimeout(() => setError(''), 3000);
      setIsProcessing(false);
      // 카메라는 유지 (setScanning 호출하지 않음)
      return false;
    }
  }, [storeId, fetchStoreStats, error, addDebugLog]);

  const handleCouponValidationById = useCallback(async (couponId: string) => {
    
    // 중복 스캔 체크 (이미 처리 완료된 쿠폰)
    if (scannedCouponsRef.current.has(couponId)) {
      if (isMountedRef.current) {
        setError('이미 적립된 쿠폰입니다.');
        // 에러 메시지 자동 제거 (3초 후)
        if (errorTimeoutRef.current) {
          clearTimeout(errorTimeoutRef.current);
        }
        errorTimeoutRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            setError('');
          }
        }, 3000);
      }
      return false;
    }

    // 처리 중인 쿠폰 체크 (동시 요청 차단)
    if (processingCouponsRef.current.has(couponId)) {
      // 이미 처리 중인 쿠폰이므로 무시 (에러 메시지 표시하지 않음)
      return false;
    }

    // 처리 시작: 처리 중인 쿠폰 목록에 추가 (동시 요청 차단)
    processingCouponsRef.current.add(couponId);

    setIsProcessing(true);
    // 이전 에러 메시지와 타임아웃 정리
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
      errorTimeoutRef.current = null;
    }
    setError(''); // 처리 시작 시 에러 메시지 제거

    try {
      // 먼저 쿠폰 정보 조회 (상점용 파라미터 추가)
      const validateResponse = await fetch(`/api/coupon/validate?id=${couponId}&store=${storeId}`);
      
      // 응답이 JSON인지 확인
      let validateData;
      try {
        const text = await validateResponse.text();
        console.log('Validate API 응답 상태:', validateResponse.status, validateResponse.statusText);
        console.log('Validate API 응답 내용:', text.substring(0, 200));
        
        if (!text) {
          throw new Error('응답이 비어있습니다');
        }
        
        // HTML 응답인지 확인 (리다이렉트 등)
        if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
          console.error('HTML 응답 받음:', text.substring(0, 200));
          setError('서버 오류가 발생했습니다. (HTML 응답)');
          if (errorTimeoutRef.current) {
            clearTimeout(errorTimeoutRef.current);
          }
          errorTimeoutRef.current = setTimeout(() => setError(''), 3000);
          setIsProcessing(false);
          processingCouponsRef.current.delete(couponId); // 처리 중인 쿠폰 제거
          // 카메라는 유지 (setScanning 호출하지 않음)
          return false;
        }
        
        validateData = JSON.parse(text);
      } catch (parseError) {
        console.error('JSON 파싱 오류:', parseError);
        console.error('응답 상태:', validateResponse.status);
        setError(`서버 응답 오류가 발생했습니다. (상태: ${validateResponse.status})`);
        if (errorTimeoutRef.current) {
          clearTimeout(errorTimeoutRef.current);
        }
        errorTimeoutRef.current = setTimeout(() => setError(''), 3000);
        setIsProcessing(false);
        processingCouponsRef.current.delete(couponId); // 처리 중인 쿠폰 제거
        // 카메라는 유지 (setScanning 호출하지 않음)
        return false;
      }

      if (!validateResponse.ok || !validateData.valid) {
        const errorMessage = validateData.message || '유효하지 않은 쿠폰입니다.';
        // validate 실패 시 즉시 에러 메시지 설정 및 반환 (use API 호출하지 않음)
        if (errorMessage.includes('이미 사용') || errorMessage.includes('사용된')) {
          scannedCouponsRef.current.add(couponId);
          setError('이미 적립된 쿠폰입니다.');
        } else {
          setError(errorMessage);
        }
        if (errorTimeoutRef.current) {
          clearTimeout(errorTimeoutRef.current);
        }
        errorTimeoutRef.current = setTimeout(() => setError(''), 3000);
        setIsProcessing(false);
        processingCouponsRef.current.delete(couponId); // 처리 중인 쿠폰 제거
        // 카메라는 유지 (setScanning 호출하지 않음)
        return false;
      }

      // validate 성공 시 에러 메시지 즉시 제거 (use API 호출 전)
      // 이전에 설정된 모든 에러 메시지와 타임아웃을 확실히 제거
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
        errorTimeoutRef.current = null;
      }
      setError(''); // 에러 메시지 즉시 제거

      // 처리 딜레이 (500ms) - 이 시간 동안 에러 메시지가 나타나지 않도록
      // 딜레이 중에도 에러 메시지가 설정되지 않도록 보장
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 딜레이 후에도 에러 메시지가 없는지 다시 확인
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
        errorTimeoutRef.current = null;
      }
      setError(''); // 딜레이 후에도 에러 메시지 제거

      // use API 호출 직전에 에러 메시지와 타임아웃을 다시 한 번 확실히 제거
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
        errorTimeoutRef.current = null;
      }
      setError(''); // use API 호출 직전 에러 메시지 제거

      // 쿠폰 사용 처리
      const response = await fetch('/api/coupon/use', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: validateData.coupon.code,
          store_id: storeId,
        }),
      });

      // 응답이 JSON인지 확인
      let data;
      try {
        const text = await response.text();
        console.log('Coupon Use API 응답 상태 (by ID):', response.status, response.statusText);
        console.log('Coupon Use API 응답 내용 (by ID):', text.substring(0, 200));
        
        if (!text) {
          throw new Error('응답이 비어있습니다');
        }
        
        // HTML 응답인지 확인 (리다이렉트 등)
        if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
          console.error('HTML 응답 받음 (by ID):', text.substring(0, 200));
          setError('서버 오류가 발생했습니다. (HTML 응답)');
          if (errorTimeoutRef.current) {
            clearTimeout(errorTimeoutRef.current);
          }
          errorTimeoutRef.current = setTimeout(() => setError(''), 3000);
          setIsProcessing(false);
          processingCouponsRef.current.delete(couponId); // 처리 중인 쿠폰 제거
          // 카메라는 유지 (setScanning 호출하지 않음)
          return false;
        }
        
        data = JSON.parse(text);
      } catch (parseError) {
        console.error('JSON 파싱 오류 (by ID):', parseError);
        console.error('응답 상태:', response.status);
        console.error('응답 헤더:', Object.fromEntries(response.headers.entries()));
        setError(`서버 응답 오류가 발생했습니다. (상태: ${response.status})`);
        if (errorTimeoutRef.current) {
          clearTimeout(errorTimeoutRef.current);
        }
        errorTimeoutRef.current = setTimeout(() => setError(''), 3000);
        setIsProcessing(false);
        processingCouponsRef.current.delete(couponId); // 처리 중인 쿠폰 제거
        // 카메라는 유지 (setScanning 호출하지 않음)
        return false;
      }

      // 성공 응답 확인 (response.ok와 data.success 모두 확인)
      if (response.ok && data.success === true) {
        // 성공 시 즉시 에러 메시지 제거 (가장 먼저 처리)
        if (errorTimeoutRef.current) {
          clearTimeout(errorTimeoutRef.current);
          errorTimeoutRef.current = null;
        }
        setError(''); // 성공 시 에러 메시지 즉시 제거
        
        // 성공 시 스캔된 쿠폰에 추가 (중복 방지)
        scannedCouponsRef.current.add(couponId);
      } else {
        // 실패 응답 처리
        const errorMessage = data?.message || '쿠폰 사용에 실패했습니다.';
        
        // 이미 사용된 쿠폰인 경우 - 스캔된 쿠폰 목록에 추가하여 중복 방지
        if (errorMessage.includes('이미 사용') || errorMessage.includes('사용된') || errorMessage.includes('이미 적립')) {
          scannedCouponsRef.current.add(couponId);
          setError('이미 적립된 쿠폰입니다.');
          // 에러 메시지 자동 제거 (3초 후)
          if (errorTimeoutRef.current) {
            clearTimeout(errorTimeoutRef.current);
          }
          errorTimeoutRef.current = setTimeout(() => setError(''), 3000);
        } else if (errorMessage.includes('유효하지 않은')) {
          setError('유효하지 않은 쿠폰입니다.');
          if (errorTimeoutRef.current) {
            clearTimeout(errorTimeoutRef.current);
          }
          errorTimeoutRef.current = setTimeout(() => setError(''), 3000);
        } else if (errorMessage.includes('만료')) {
          setError('쿠폰이 만료되었습니다.');
          if (errorTimeoutRef.current) {
            clearTimeout(errorTimeoutRef.current);
          }
          errorTimeoutRef.current = setTimeout(() => setError(''), 3000);
        } else {
          setError(errorMessage);
          if (errorTimeoutRef.current) {
            clearTimeout(errorTimeoutRef.current);
          }
          errorTimeoutRef.current = setTimeout(() => setError(''), 3000);
        }
        setIsProcessing(false);
        processingCouponsRef.current.delete(couponId); // 처리 중인 쿠폰 제거
        // 카메라는 유지 (setScanning 호출하지 않음)
        return false;
      }

      // 성공 처리 계속 진행

      // 성공 시 에러 메시지와 타임아웃 확실히 제거 (즉시, 여러 번 확인)
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
        errorTimeoutRef.current = null;
      }
      setError(''); // 성공 시 에러 메시지 즉시 제거

      // 누적 금액 업데이트 (카메라 유지)
      // API의 total_amount는 단일 쿠폰 금액이므로 500원 사용
      const addedAmount = COUPON_CONFIG.AMOUNT;
      
      // 누적 금액 업데이트 (함수형 업데이트로 최신 값 사용)
      setTotalAmount((prev) => prev + addedAmount);
      setScanCount((prev) => prev + 1);
      
      // 성공 플래시 효과 (검정색 깜박임 + 500원 적립 효과)
      setFlashAmount(addedAmount);
      setShowSuccessFlash(true);
      setCameraPaused(true);
      
      // 1초 후 카메라 재개
      setTimeout(() => {
        setShowSuccessFlash(false);
        setFlashAmount(0);
        setCameraPaused(false);
      }, 1000);
      
      setIsProcessing(false);
      processingCouponsRef.current.delete(couponId); // 처리 중인 쿠폰 제거 (성공)
      return true;
    } catch (error) {
      console.error('Coupon validation error:', error);
      // 에러 타입에 따라 다른 메시지 표시
      if (error instanceof TypeError && error.message.includes('fetch')) {
        setError('네트워크 연결을 확인해주세요.');
      } else if (error instanceof Error) {
        setError(`오류: ${error.message}`);
      } else {
        setError('쿠폰 처리 중 오류가 발생했습니다.');
      }
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
      errorTimeoutRef.current = setTimeout(() => setError(''), 3000);
      setIsProcessing(false);
      processingCouponsRef.current.delete(couponId); // 처리 중인 쿠폰 제거 (에러)
      // 카메라는 유지 (setScanning 호출하지 않음)
      return false;
    }
  }, [storeId]);

  // handleCouponValidationById를 ref에 저장하여 항상 최신 버전 참조
  useEffect(() => {
    handleCouponValidationByIdRef.current = handleCouponValidationById;
  }, [handleCouponValidationById]);

  // 컴포넌트 마운트/언마운트 관리
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // 카메라 스트림 시작 (자동 스캔, 1초에 1번씩만 인식)
  useEffect(() => {
    // storeId와 storeName이 설정되면 자동으로 스캔 시작
    if (storeId && storeName && !scanning) {
      setScanning(true);
      return;
    }

    if (!scanning || !storeId || !storeName) return;

    let scanner: Html5Qrcode | null = null;

    const startScanning = async () => {
      try {
        // 이전 스캐너가 정리 중이면 대기
        if (isCleaningUpRef.current) {
          console.log('Waiting for previous scanner cleanup...');
          await new Promise<void>((resolve) => {
            const checkCleanup = () => {
              if (!isCleaningUpRef.current) {
                resolve();
              } else {
                setTimeout(checkCleanup, 100);
              }
            };
            checkCleanup();
          });
        }

        // 이미 스캐너가 존재하면 먼저 정리
        if (qrCodeRef.current) {
          console.log('Previous scanner exists, cleaning up first...');
          try {
            await qrCodeRef.current.stop();
          } catch (e) {
            console.log('Stop existing scanner:', e);
          }
          try {
            qrCodeRef.current.clear();
          } catch (e) {
            console.log('Clear existing scanner:', e);
          }
          qrCodeRef.current = null;
        }

        // 컴포넌트가 언마운트되었으면 중단
        if (!isMountedRef.current) {
          return;
        }

        // DOM 엘리먼트가 존재하는지 확인
        const qrReaderElement = document.getElementById('qr-reader');
        if (!qrReaderElement) {
          console.error('qr-reader element not found in DOM');
          if (isMountedRef.current) {
            setError('QR 스캐너를 초기화할 수 없습니다. 페이지를 새로고침해주세요.');
            setScanning(false);
          }
          return;
        }

        // DOM 요소 내부 초기화 (이전 스캐너의 잔재 제거)
        qrReaderElement.innerHTML = '';

        scanner = new Html5Qrcode('qr-reader');
        qrCodeRef.current = scanner;

        // 후면 카메라 찾기
        let devices;
        try {
          devices = await Html5Qrcode.getCameras();
        } catch (cameraError) {
          console.error('Get cameras error:', cameraError);
          if (isMountedRef.current) {
            setError('카메라에 접근할 수 없습니다. 카메라 권한을 확인해주세요.');
            setScanning(false);
          }
          return;
        }
        let cameraId: string | null = null;
        
        for (const device of devices) {
          if (device.label.toLowerCase().includes('back') || 
              device.label.toLowerCase().includes('rear') ||
              device.label.toLowerCase().includes('environment') ||
              device.label.toLowerCase().includes('후면')) {
            cameraId = device.id;
            break;
          }
        }
        
        if (!cameraId && devices.length > 0) {
          cameraId = devices[devices.length - 1].id;
        }

        if (!cameraId) {
          throw new Error('사용 가능한 카메라를 찾을 수 없습니다.');
        }

        // 카메라 시작 (fps: 1로 설정하여 초당 1프레임으로 제한)
        await scanner.start(
          cameraId,
          {
            fps: 1, // 초당 1프레임으로 제한
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
            videoConstraints: {
              facingMode: 'environment', // 후면 카메라
            },
          },
          async (decodedText) => {
            try {
              const now = Date.now();
              const timeSinceLastScan = now - lastScanTimeRef.current;

              // 마지막 인식 후 1초가 지나지 않았으면 무시
              if (timeSinceLastScan < 1000) {
                return; // 디버그 로그 없이 무시
              }

              // 마지막 인식 시간은 적립 성공 후에 업데이트됨 (handleCouponValidationById 내부에서)
              // 여기서는 업데이트하지 않음

              // URL 형식인지 확인
              let couponId: string | null = null;
              if (decodedText.includes('/api/coupon/validate?id=')) {
                try {
                  if (decodedText.startsWith('http://') || decodedText.startsWith('https://')) {
                    const url = new URL(decodedText);
                    couponId = url.searchParams.get('id');
                  } else {
                    const url = new URL(decodedText, window.location.origin);
                    couponId = url.searchParams.get('id');
                  }
                } catch (e) {
                  setError('QR 코드 형식이 올바르지 않습니다.');
                  if (errorTimeoutRef.current) {
                    clearTimeout(errorTimeoutRef.current);
                  }
                  errorTimeoutRef.current = setTimeout(() => setError(''), 3000);
                  return;
                }
              } else {
                setError('숫자 코드는 수동 입력을 사용해주세요.');
                if (errorTimeoutRef.current) {
                  clearTimeout(errorTimeoutRef.current);
                }
                errorTimeoutRef.current = setTimeout(() => setError(''), 3000);
                return;
              }

              if (couponId) {
                // 이미 처리 중이거나 처리 완료된 쿠폰인지 확인
                if (processingCouponsRef.current.has(couponId) || scannedCouponsRef.current.has(couponId)) {
                  setError('이미 사용한 쿠폰입니다.');
                  if (errorTimeoutRef.current) {
                    clearTimeout(errorTimeoutRef.current);
                  }
                  errorTimeoutRef.current = setTimeout(() => setError(''), 3000);
                  return;
                }

                // 자동으로 적립 처리 시작
                // processingCouponsRef는 handleCouponValidationById 내부에서 관리됨
                // ref를 통해 최신 함수 참조 (null 체크 추가)
                const validationFn = handleCouponValidationByIdRef.current;
                if (!validationFn) {
                  console.error('handleCouponValidationById is not available');
                  return;
                }
                validationFn(couponId)
                  .then((success) => {
                    // 적립 성공 시에만 마지막 스캔 시간 업데이트 (1초 차이 보장)
                    if (success) {
                      lastScanTimeRef.current = Date.now();
                    } else {
                      // 실패한 경우에도 시간 업데이트하여 다음 스캔 허용 (너무 빠른 재시도 방지)
                      lastScanTimeRef.current = Date.now();
                    }
                  })
                  .catch((error) => {
                    console.error('Auto-apply coupon error:', error);
                    // 에러 발생 시에도 시간 업데이트하여 다음 스캔 허용
                    lastScanTimeRef.current = Date.now();
                  });
              } else {
                setError('유효하지 않은 QR 코드입니다.');
                if (errorTimeoutRef.current) {
                  clearTimeout(errorTimeoutRef.current);
                }
                errorTimeoutRef.current = setTimeout(() => setError(''), 3000);
              }
            } catch (error) {
              console.error('QR scan callback error:', error);
              setError('QR 코드 처리 중 오류가 발생했습니다.');
              if (errorTimeoutRef.current) {
                clearTimeout(errorTimeoutRef.current);
              }
              errorTimeoutRef.current = setTimeout(() => setError(''), 3000);
            }
          },
          (error) => {
            // 스캔 실패 (무시 - 계속 스캔 시도)
            // console.log('Scan error:', error);
          }
        );
      } catch (error) {
        console.error('Scanner initialization error:', error);
        if (isMountedRef.current) {
          setError('QR 스캐너를 시작할 수 없습니다. 카메라 권한을 확인해주세요.');
          setScanning(false);
        }
      }
    };

    startScanning();

    return () => {
      // qrCodeRef.current를 사용하여 현재 활성화된 스캐너 정리
      const cleanupScanner = async () => {
        if (qrCodeRef.current && !isCleaningUpRef.current) {
          isCleaningUpRef.current = true;
          const scannerToClean = qrCodeRef.current;
          try {
            // stop() 에러를 개별적으로 처리 (이미 정지된 경우 에러 무시)
            try {
              await scannerToClean.stop();
            } catch (stopErr) {
              console.log('Scanner stop (may be already stopped):', stopErr);
            }
            // clear() 에러를 개별적으로 처리
            try {
              scannerToClean.clear();
            } catch (clearErr) {
              console.log('Scanner clear error:', clearErr);
            }
          } finally {
            qrCodeRef.current = null;
            isCleaningUpRef.current = false;
          }
        }
      };
      cleanupScanner();
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
    };
  }, [scanning, storeId, storeName, addDebugLog]);

  const handleStartScan = () => {
    setError('');
    lastScanTimeRef.current = 0; // 마지막 인식 시간 초기화
    setScanning(true);
  };


  // 쿠폰 사용하기 버튼 핸들러: 통계 업데이트 및 완료 처리
  const handleUseCoupons = async () => {
    try {
      // 에러 메시지와 타임아웃 즉시 제거
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
        errorTimeoutRef.current = null;
      }
      setError('');

      // 통계 업데이트 (적립된 금액이 있을 때만)
      if (totalAmount > 0 && storeId) {
        try {
          await fetchStoreStats(storeId);
        } catch (statsError) {
          console.error('Fetch stats error in handleUseCoupons:', statsError);
          // 통계 조회 실패해도 계속 진행
        }
      }

      // 먼저 스캔 상태를 false로 설정하여 useEffect cleanup이 실행되도록 함
      setScanning(false);

      // 상태 리셋
      setTotalAmount(0);
      setScanCount(0);
      scannedCouponsRef.current.clear();
      processingCouponsRef.current.clear();
      setCameraPaused(false);
      setShowSuccessFlash(false);
      setFlashAmount(0);
      setError('');
      lastScanTimeRef.current = 0; // 마지막 인식 시간 초기화

      // 카메라 재시작 (다음 고객을 위해) - 스캐너 cleanup이 완료될 때까지 대기
      const waitForCleanup = () => {
        return new Promise<void>((resolve) => {
          let attempts = 0;
          const maxAttempts = 30; // 최대 3초 대기 (100ms * 30)
          const checkCleanup = () => {
            attempts++;
            if (!isCleaningUpRef.current && qrCodeRef.current === null) {
              resolve();
            } else if (attempts >= maxAttempts) {
              // 최대 시도 횟수 초과 - 강제로 진행
              console.log('Cleanup wait timeout, forcing continue...');
              qrCodeRef.current = null;
              isCleaningUpRef.current = false;
              resolve();
            } else {
              setTimeout(checkCleanup, 100);
            }
          };
          // 최소 500ms 대기 후 cleanup 상태 확인
          setTimeout(checkCleanup, 500);
        });
      };

      await waitForCleanup();

      // 컴포넌트가 아직 마운트되어 있으면 스캔 재시작
      if (isMountedRef.current) {
        setScanning(true);
      }
    } catch (error) {
      console.error('Use coupons error:', error);
      if (isMountedRef.current) {
        setError('처리 중 오류가 발생했습니다.');
        if (errorTimeoutRef.current) {
          clearTimeout(errorTimeoutRef.current);
        }
        errorTimeoutRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            setError('');
          }
        }, 3000);
      }
    }
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

          {/* 디버그 로그 표시 (모바일에서도 확인 가능) - 프로덕션에서는 숨김 */}
          {false && debugLogs.length > 0 && (
            <div className="bg-gray-100 border border-gray-300 rounded-lg p-3 mb-4 max-h-60 overflow-y-auto">
              <div className="flex justify-between items-center mb-2">
                <p className="text-xs font-semibold text-gray-700">🔍 디버그 로그 (최근 {debugLogs.length}개)</p>
                <button
                  onClick={() => {
                    const logText = debugLogs.map((log, idx) => {
                      return `[${idx + 1}] [${log.time}] ${log.message}\n${JSON.stringify(log.data, null, 2)}`;
                    }).join('\n\n');
                    const fullText = `=== 디버그 로그 (${new Date().toLocaleString('ko-KR')}) ===\n\n${logText}\n\n=== 현재 상태 ===\n총 적립 금액: ${totalAmount}원\n스캔 카운트: ${scanCount}개\n에러 메시지: ${error || '(없음)'}\n스캔된 쿠폰: ${Array.from(scannedCouponsRef.current).join(', ')}`;
                    navigator.clipboard.writeText(fullText).then(() => {
                      alert('디버그 로그가 클립보드에 복사되었습니다!');
                    }).catch(() => {
                      // 클립보드 API 실패 시 fallback
                      const textArea = document.createElement('textarea');
                      textArea.value = fullText;
                      textArea.style.position = 'fixed';
                      textArea.style.opacity = '0';
                      document.body.appendChild(textArea);
                      textArea.select();
                      try {
                        document.execCommand('copy');
                        alert('디버그 로그가 클립보드에 복사되었습니다!');
                      } catch (err) {
                        alert('복사에 실패했습니다. 로그를 수동으로 복사해주세요.');
                      }
                      document.body.removeChild(textArea);
                    });
                  }}
                  className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded"
                >
                  📋 전체 복사
                </button>
              </div>
              <div className="space-y-1">
                {debugLogs.map((log, idx) => (
                  <div key={idx} className="text-xs text-gray-600 font-mono bg-white p-2 rounded border border-gray-200">
                    <span className="text-gray-500">[{log.time}]</span> {log.message}
                    <details className="mt-1">
                      <summary className="cursor-pointer text-blue-600">데이터 보기</summary>
                      <pre className="mt-1 text-xs overflow-x-auto bg-gray-50 p-2 rounded">
                        {JSON.stringify(log.data, null, 2)}
                      </pre>
                    </details>
                  </div>
                ))}
              </div>
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
              {/* 적립 금액 표시 (카메라 위쪽) - 더 크고 명확하게 */}
              {(totalAmount > 0 || scanCount > 0) && (
                <div className="bg-green-50 border-4 border-green-500 rounded-xl p-6 text-center shadow-2xl transform transition-all duration-300 scale-105">
                  <p className="text-base text-green-700 mb-2 font-semibold">이번 회차 누적 금액</p>
                  <p 
                    className="text-5xl font-bold text-green-800 transition-all duration-300"
                    style={{
                      transform: showSuccessFlash ? 'scale(1.2)' : 'scale(1)',
                    }}
                  >
                    {totalAmount.toLocaleString()}원
                  </p>
                  {scanCount > 0 && (
                    <p className="text-sm text-green-600 mt-2 font-semibold">
                      ({scanCount}개 쿠폰 적립)
                    </p>
                  )}
                </div>
              )}

              {/* 처리 중 표시 */}
              {isProcessing && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                  <p className="text-blue-700 font-medium">적립 처리 중...</p>
                </div>
              )}

              {/* QR reader (자동 스캔, 1초에 1번씩만 인식) */}
              <div id="qr-reader" className="w-full relative">
                {/* 카메라 일시 정지 시 검정 화면 */}
                {cameraPaused && (
                  <div className="absolute inset-0 bg-black z-20 rounded-lg flex items-center justify-center">
                    <div className="bg-white rounded-lg p-8 shadow-2xl">
                      <p className="text-5xl font-bold text-green-600 text-center mb-2">+{flashAmount}원</p>
                      <p className="text-xl font-bold text-green-700 text-center">적립 완료!</p>
                    </div>
                  </div>
                )}
              </div>
              
              {/* 쿠폰 사용하기 버튼 - 금액이 있을 때만 표시 */}
              {totalAmount > 0 && (
                <Button
                  onClick={handleUseCoupons}
                  variant="primary"
                  className="bg-green-600 hover:bg-green-700 text-white border-green-600"
                  fullWidth
                  size="lg"
                  disabled={isProcessing}
                >
                  ✅ 쿠폰 사용하기
                </Button>
              )}

            </div>
          )}

          {/* 가맹점 적립 통계 (하단 고정) */}
          {storeStats && (
            <Card className="mt-6">
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-textPrimary text-center">
                  📊 {storeName} 적립 통계
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <p className="text-xs text-blue-700 font-semibold mb-1">오늘 현황</p>
                    <p className="text-lg font-bold text-blue-900">
                      {storeStats.today_count}건
                    </p>
                    <p className="text-sm font-semibold text-blue-800">
                      {storeStats.today_amount.toLocaleString()}원
                    </p>
                  </div>

                  <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                    <p className="text-xs text-green-700 font-semibold mb-1">누적 현황</p>
                    <p className="text-lg font-bold text-green-900">
                      {storeStats.total_count}건
                    </p>
                    <p className="text-sm font-semibold text-green-800">
                      {storeStats.total_amount.toLocaleString()}원
                    </p>
                  </div>
                </div>
              </div>
            </Card>
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
