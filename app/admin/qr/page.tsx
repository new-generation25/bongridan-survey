'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import QRCode from 'qrcode';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Loading from '@/components/ui/Loading';
import { storage } from '@/lib/utils';

interface Store {
  id: string;
  name: string;
}

export default function AdminQRPage() {
  const router = useRouter();
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [baseUrl, setBaseUrl] = useState('');

  useEffect(() => {
    // 관리자 토큰 확인
    const token = storage.get<string>('admin_token');
    if (!token) {
      router.push('/admin');
      return;
    }

    // 현재 도메인 URL 가져오기
    const url = window.location.origin;
    setBaseUrl(url);

    // 가맹점 목록 가져오기
    const fetchStores = async () => {
      try {
        const response = await fetch('/api/stores');
        const data = await response.json();

        if (data.success && data.stores) {
          setStores(data.stores);
        }
      } catch (error) {
        console.error('Fetch stores error:', error);
        alert('가맹점 목록을 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchStores();
  }, [router]);

  // QR코드 이미지 다운로드 함수
  const downloadQRCode = (dataUrl: string, filename: string) => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 고객용 설문 QR코드 다운로드
  const handleDownloadSurveyQR = async () => {
    setGenerating(true);
    try {
      const surveyUrl = `${baseUrl}/`;
      const qrDataUrl = await QRCode.toDataURL(surveyUrl, {
        width: 512,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });
      downloadQRCode(qrDataUrl, '설문조사_QR코드.png');
    } catch (error) {
      console.error('Generate QR error:', error);
      alert('QR코드 생성에 실패했습니다.');
    } finally {
      setGenerating(false);
    }
  };

  // 가맹점별 QR코드 다운로드
  const handleDownloadStoreQR = async (storeId: string, storeName: string) => {
    setGenerating(true);
    try {
      const storeUrl = `${baseUrl}/store/${storeId}`;
      const qrDataUrl = await QRCode.toDataURL(storeUrl, {
        width: 512,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });
      // 파일명에서 특수문자 제거
      const safeName = storeName.replace(/[^a-zA-Z0-9가-힣]/g, '_');
      downloadQRCode(qrDataUrl, `가맹점_${safeName}_QR코드.png`);
    } catch (error) {
      console.error('Generate QR error:', error);
      alert('QR코드 생성에 실패했습니다.');
    } finally {
      setGenerating(false);
    }
  };

  // 모든 가맹점 QR코드 일괄 다운로드
  const handleDownloadAllStoreQR = async () => {
    if (stores.length === 0) {
      alert('가맹점 목록이 없습니다.');
      return;
    }

    setGenerating(true);
    try {
      for (let i = 0; i < stores.length; i++) {
        const store = stores[i];
        const storeUrl = `${baseUrl}/store/${store.id}`;
        const qrDataUrl = await QRCode.toDataURL(storeUrl, {
          width: 512,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF',
          },
        });
        const safeName = store.name.replace(/[^a-zA-Z0-9가-힣]/g, '_');
        downloadQRCode(qrDataUrl, `가맹점_${safeName}_QR코드.png`);
        
        // 다운로드 간격을 두어 브라우저가 처리할 수 있도록
        if (i < stores.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      alert(`총 ${stores.length}개의 가맹점 QR코드를 다운로드했습니다.`);
    } catch (error) {
      console.error('Generate QR error:', error);
      alert('QR코드 생성에 실패했습니다.');
    } finally {
      setGenerating(false);
    }
  };

  const handleLogout = () => {
    storage.remove('admin_token');
    router.push('/admin');
  };

  if (loading) {
    return <Loading fullScreen text="데이터를 불러오는 중입니다..." />;
  }

  return (
    <main className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 헤더 */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-textPrimary">
              QR코드 다운로드
            </h1>
            <p className="text-textSecondary">
              설문조사 및 가맹점용 QR코드를 생성하고 다운로드할 수 있습니다
            </p>
          </div>
          <Button onClick={handleLogout} variant="outline">
            로그아웃
          </Button>
        </div>

        {/* 고객용 설문 QR코드 */}
        <Card>
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-textPrimary mb-2">
                📋 고객용 설문 QR코드
              </h2>
              <p className="text-sm text-textSecondary">
                고객이 스마트폰으로 스캔하여 설문조사에 참여할 수 있는 QR코드입니다.
              </p>
              <p className="text-xs text-textSecondary mt-1">
                URL: {baseUrl}/
              </p>
            </div>
            <Button
              onClick={handleDownloadSurveyQR}
              disabled={generating || !baseUrl}
              fullWidth
            >
              {generating ? '생성 중...' : '설문 QR코드 다운로드'}
            </Button>
          </div>
        </Card>

        {/* 가맹점별 스캔 QR코드 */}
        <Card>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold text-textPrimary mb-2">
                  🏪 가맹점별 스캔 QR코드
                </h2>
                <p className="text-sm text-textSecondary">
                  각 가맹점에서 쿠폰을 스캔할 때 사용하는 전용 QR코드입니다.
                </p>
                <p className="text-xs text-textSecondary mt-1">
                  총 {stores.length}개 가맹점
                </p>
              </div>
              <Button
                onClick={handleDownloadAllStoreQR}
                disabled={generating || stores.length === 0}
                variant="outline"
              >
                {generating ? '생성 중...' : '전체 다운로드'}
              </Button>
            </div>

            {/* 가맹점 목록 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
              {stores.map((store) => (
                <div
                  key={store.id}
                  className="border border-border rounded-lg p-4 space-y-3"
                >
                  <div>
                    <h3 className="font-semibold text-textPrimary">
                      {store.name}
                    </h3>
                    <p className="text-xs text-textSecondary mt-1">
                      {baseUrl}/store/{store.id}
                    </p>
                  </div>
                  <Button
                    onClick={() => handleDownloadStoreQR(store.id, store.name)}
                    disabled={generating}
                    variant="outline"
                    size="sm"
                    fullWidth
                  >
                    QR코드 다운로드
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* 사용 안내 */}
        <Card>
          <div className="space-y-2">
            <h3 className="font-semibold text-textPrimary">
              💡 사용 안내
            </h3>
            <ul className="text-sm text-textSecondary space-y-1 list-disc list-inside">
              <li>다운로드한 QR코드는 인쇄하여 사용할 수 있습니다.</li>
              <li>설문 QR코드는 고객이 쉽게 접근할 수 있는 곳에 배치하세요.</li>
              <li>가맹점 QR코드는 각 가맹점의 계산대에 배치하세요.</li>
              <li>QR코드는 최소 2cm × 2cm 크기로 인쇄하는 것을 권장합니다.</li>
            </ul>
          </div>
        </Card>
      </div>
    </main>
  );
}

