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
  const [debugLogs, setDebugLogs] = useState<Array<{time: string, message: string, data: unknown}>>([]);
  const [showSuccessFlash, setShowSuccessFlash] = useState(false);
  const [flashAmount, setFlashAmount] = useState(0);
  const [cameraPaused, setCameraPaused] = useState(false);
  const [storeStats, setStoreStats] = useState<{
    today_count: number;
    today_amount: number;
    total_count: number;
    total_amount: number;
  } | null>(null);
  const scannedCouponsRef = useRef<Set<string>>(new Set());
  const qrCodeRef = useRef<Html5Qrcode | null>(null);
  const errorTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
      
      // 로컬 개발 환경에서만 HTTP 로깅 시도
      if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
        fetch('http://127.0.0.1:7242/ingest/aeb5e0c2-08cc-4290-a930-f974f5271152',{
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({location:'page.tsx:94',message:'Error state changed',data:logData,timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'D'})
        }).catch(()=>{});
      }
    } else if (!error && prevErrorRef.current) {
      // 에러가 제거되었을 때
      prevErrorRef.current = '';
    }
  }, [error, addDebugLog]); // totalAmount, scanCount, isProcessing 제거하여 중복 방지

  const handleCouponValidation = useCallback(async (code: string) => {
    addDebugLog('handleCouponValidation entry', {
      code,
      hasCode: scannedCouponsRef.current.has(code),
      scannedSetSize: scannedCouponsRef.current.size,
      scannedCodes: Array.from(scannedCouponsRef.current)
    });
    
    // 중복 스캔 체크
    if (scannedCouponsRef.current.has(code)) {
      addDebugLog('Duplicate scan detected', {code,scannedCodes:Array.from(scannedCouponsRef.current),totalAmount,scanCount});
      setError('이미 적립된 쿠폰입니다.');
      // 에러 메시지 자동 제거 (3초 후)
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
      errorTimeoutRef.current = setTimeout(() => {
        addDebugLog('Error timeout callback (duplicate)', {code});
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

      // 응답이 JSON인지 확인
      let data;
      try {
        const text = await response.text();
        console.log('Coupon Use API 응답 상태:', response.status, response.statusText);
        console.log('Coupon Use API 응답 내용:', text.substring(0, 200));
        
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
          // 카메라는 유지 (setScanning 호출하지 않음)
          return false;
        }
        
        data = JSON.parse(text);
      } catch (parseError) {
        console.error('JSON 파싱 오류:', parseError);
        console.error('응답 상태:', response.status);
        console.error('응답 헤더:', Object.fromEntries(response.headers.entries()));
        setError(`서버 응답 오류가 발생했습니다. (상태: ${response.status})`);
        if (errorTimeoutRef.current) {
          clearTimeout(errorTimeoutRef.current);
        }
        errorTimeoutRef.current = setTimeout(() => setError(''), 3000);
        setIsProcessing(false);
        // 카메라는 유지 (setScanning 호출하지 않음)
        return false;
      }

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
        // 추가 확인: 에러 타임아웃이 다시 설정되지 않도록 보장
        setTimeout(() => {
          // 클로저 문제를 피하기 위해 ref를 직접 확인
          if (errorTimeoutRef.current) {
            addDebugLog('Error timeout still exists after success (clearing)', {code});
            clearTimeout(errorTimeoutRef.current);
            errorTimeoutRef.current = null;
          }
          // 에러 메시지도 직접 제거 (상태 참조 없이)
          setError((currentError) => {
            if (currentError) {
              addDebugLog('Clearing error on success (delayed check)', {code,previousError:currentError});
              return '';
            }
            return currentError;
          });
        }, 0);
        
        // 성공 시 스캔된 쿠폰에 추가 (중복 방지)
        scannedCouponsRef.current.add(code);
        addDebugLog('Coupon added to scanned set', {code,scannedSetSize:scannedCouponsRef.current.size,scannedCodes:Array.from(scannedCouponsRef.current)});
      } else {
        addDebugLog('Error response branch', {responseOk:response.ok,responseStatus:response.status,dataSuccess:data?.success,errorMessage:data?.message,code});
        // 실패 응답 처리
        const errorMessage = data?.message || '쿠폰 사용에 실패했습니다.';
        
        // 이미 사용된 쿠폰인 경우 - 스캔된 쿠폰 목록에 추가하여 중복 방지
        if (errorMessage.includes('이미 사용') || errorMessage.includes('사용된') || errorMessage.includes('이미 적립')) {
          addDebugLog('Already used coupon error', {code,errorMessage,responseOk:response.ok,responseStatus:response.status,dataSuccess:data?.success});
          scannedCouponsRef.current.add(code);
          setError('이미 적립된 쿠폰입니다.');
          // 에러 메시지 자동 제거 (3초 후)
          if (errorTimeoutRef.current) {
            clearTimeout(errorTimeoutRef.current);
          }
          errorTimeoutRef.current = setTimeout(() => {
            addDebugLog('Error timeout callback (already used)', {code});
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
      const addedAmount = 500;
      
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
      
      // 0.5초 후 카메라 재개
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
            addDebugLog('Clearing error after flash', {code,previousError:currentError});
            return '';
          }
          return currentError;
        });
      }, 500);
      
      setIsProcessing(false);
      return true;
    } catch (error) {
      console.error('Coupon validation error:', error);
      setError('네트워크 오류가 발생했습니다.');
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
      errorTimeoutRef.current = setTimeout(() => setError(''), 3000);
      setIsProcessing(false);
      // 카메라는 유지 (setScanning 호출하지 않음)
      return false;
    }
  }, [storeId, fetchStoreStats]);

  const handleCouponValidationById = useCallback(async (couponId: string) => {
    // 중복 스캔 체크
    if (scannedCouponsRef.current.has(couponId)) {
      setError('이미 적립된 쿠폰입니다.');
      // 에러 메시지 자동 제거 (3초 후)
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
      errorTimeoutRef.current = setTimeout(() => setError(''), 3000);
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
      const addedAmount = 500;
      
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
      
      // 0.5초 후 카메라 재개
      setTimeout(() => {
        setShowSuccessFlash(false);
        setFlashAmount(0);
        setCameraPaused(false);
        // 에러 타임아웃이 설정되어 있으면 제거 (에러 메시지는 설정하지 않음)
        if (errorTimeoutRef.current) {
          clearTimeout(errorTimeoutRef.current);
          errorTimeoutRef.current = null;
        }
      }, 500);
      
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
                addDebugLog('QR scan ignored (processing)', {decodedText,isProcessing});
                return;
              }

              addDebugLog('QR code scanned', {decodedText,hasErrorTimeout:!!errorTimeoutRef.current,currentError:error});

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
                  addDebugLog('QR code parsed (URL)', {decodedText,couponId});
                } catch (e) {
                  // URL 파싱 실패 시 숫자 코드로 처리
                  addDebugLog('URL parse failed, using as code', {decodedText,error:e});
                  await handleCouponValidation(decodedText);
                  return;
                }
              } else {
                // 숫자 코드인 경우 (기존 방식 호환)
                addDebugLog('QR code parsed (numeric)', {decodedText});
                await handleCouponValidation(decodedText);
                return;
              }
              
              if (couponId) {
                addDebugLog('Calling handleCouponValidationById', {couponId});
                await handleCouponValidationById(couponId);
              } else {
                addDebugLog('Invalid QR code (no couponId)', {decodedText});
                setError('유효하지 않은 QR 코드입니다.');
                if (errorTimeoutRef.current) {
                  clearTimeout(errorTimeoutRef.current);
                }
                errorTimeoutRef.current = setTimeout(() => setError(''), 3000);
              }
            } catch (error) {
              console.error('QR scan callback error:', error);
              addDebugLog('QR scan callback error', {error:error instanceof Error ? error.message : String(error),decodedText});
              setError('QR 코드 처리 중 오류가 발생했습니다.');
              if (errorTimeoutRef.current) {
                clearTimeout(errorTimeoutRef.current);
              }
              errorTimeoutRef.current = setTimeout(() => setError(''), 3000);
              // 카메라는 유지 (setScanning 호출하지 않음)
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
      // 에러 타임아웃 정리
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
    };
  }, [scanning, storeId, storeName, router, handleCouponValidation, handleCouponValidationById]);


  const handleStartScan = () => {
    setError('');
    setScanning(true);
  };

  const handleComplete = async () => {
    try {
      // 에러 메시지와 타임아웃 즉시 제거
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
        errorTimeoutRef.current = null;
      }
      setError('');
      
      // 통계 업데이트 (에러가 발생해도 계속 진행)
      if (totalAmount > 0 && storeId) {
        try {
          await fetchStoreStats(storeId);
        } catch (statsError) {
          // 통계 조회 실패는 무시 (에러 메시지 표시하지 않음)
          console.error('Fetch stats error in handleComplete:', statsError);
        }
      }
      
      // 카메라 중지 (에러가 발생해도 계속 진행)
      const scanner = qrCodeRef.current;
      if (scanner) {
        try {
          await scanner.stop();
        } catch (stopError) {
          // 이미 정리된 경우 무시
          console.error('Stop scanner error:', stopError);
        }
        try {
          scanner.clear();
        } catch (clearError) {
          // 이미 정리된 경우 무시
          console.error('Clear scanner error:', clearError);
        }
        qrCodeRef.current = null;
      }
      
      // 상태 리셋
      setTotalAmount(0);
      setScanCount(0);
      scannedCouponsRef.current.clear();
      setScanning(false);
      setCameraPaused(false);
      setShowSuccessFlash(false);
      setFlashAmount(0);
      setError(''); // 다시 한 번 확실히 제거
    } catch (error) {
      console.error('Complete error:', error);
      // 에러가 발생해도 상태는 리셋
      setScanning(false);
      setError('');
    }
  };

  const handleStopScan = async () => {
    try {
      // 카메라 정리
      if (qrCodeRef.current) {
        try {
          await qrCodeRef.current.stop();
        } catch (stopError) {
          console.error('Stop scanner error:', stopError);
        }
        try {
          qrCodeRef.current.clear();
        } catch (clearError) {
          console.error('Clear scanner error:', clearError);
        }
        qrCodeRef.current = null;
      }
      setScanning(false);
      setCameraPaused(false);
    } catch (error) {
      console.error('Stop scan error:', error);
      setScanning(false);
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

          {/* 디버그 로그 표시 (모바일에서도 확인 가능) */}
          {debugLogs.length > 0 && (
            <div className="bg-gray-100 border border-gray-300 rounded-lg p-3 mb-4 max-h-60 overflow-y-auto">
              <p className="text-xs font-semibold text-gray-700 mb-2">🔍 디버그 로그 (최근 10개)</p>
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
                  <p className="text-base text-green-700 mb-2 font-semibold">총 적립 금액</p>
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
                      ({scanCount}개 쿠폰 사용)
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

              {/* QR reader는 항상 렌더링 (카메라 유지) */}
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
              
              {/* 사용 완료 버튼 - 금액이 있을 때만 표시 */}
              {totalAmount > 0 && (
                <Button
                  onClick={handleComplete}
                  variant="primary"
                  className="bg-green-600 hover:bg-green-700 text-white border-green-600"
                  fullWidth
                  size="lg"
                >
                  ✅ 사용 완료
                </Button>
              )}
              
              {/* 스캔 중일 때는 버튼 없음 (QR 코드를 계속 스캔할 수 있도록) */}

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

