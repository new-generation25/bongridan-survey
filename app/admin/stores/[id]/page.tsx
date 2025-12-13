'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import QRCode from 'qrcode';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Loading from '@/components/ui/Loading';
import Input from '@/components/ui/Input';
import { storage, formatCurrency, formatNumber } from '@/lib/utils';

interface StoreDetail {
  id: string;
  name: string;
  manager_name?: string;
  manager_phone?: string;
  is_active: boolean;
  total_used: number;
  total_amount: number;
  settled_amount: number;
  unsettled_amount: number;
}

export default function AdminStoreDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [storeId, setStoreId] = useState('');
  const [store, setStore] = useState<StoreDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({
    name: '',
    manager_name: '',
    manager_phone: '',
    is_active: true,
  });
  const [baseUrl, setBaseUrl] = useState('');

  useEffect(() => {
    const token = storage.get<string>('admin_token');
    if (!token) {
      router.push('/admin');
      return;
    }

    const url = window.location.origin;
    setBaseUrl(url);

    const loadStore = async () => {
      try {
        const resolvedParams = await params;
        const id = resolvedParams.id;
        setStoreId(id);

        const response = await fetch(`/api/admin/stores/${id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'x-admin-token': token,
          },
        });

        const result = await response.json();

        if (!response.ok) {
          if (response.status === 401) {
            storage.remove('admin_token');
            router.push('/admin');
            return;
          }
          alert(result.message || '가맹점 정보를 불러오는데 실패했습니다.');
          router.push('/admin/stores');
          return;
        }

        if (result.success && result.store) {
          setStore(result.store);
          setEditData({
            name: result.store.name,
            manager_name: result.store.manager_name || '',
            manager_phone: result.store.manager_phone || '',
            is_active: result.store.is_active,
          });
        }
      } catch (error) {
        console.error('Load store error:', error);
        alert('네트워크 오류가 발생했습니다.');
        router.push('/admin/stores');
      } finally {
        setLoading(false);
      }
    };

    loadStore();
  }, [params, router]);

  const handleSave = async () => {
    if (!editData.name.trim()) {
      alert('가맹점명을 입력해주세요.');
      return;
    }

    setSaving(true);
    try {
      const token = storage.get<string>('admin_token');
      const response = await fetch(`/api/admin/stores/${storeId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-admin-token': token || '',
        },
        body: JSON.stringify(editData),
      });

      const result = await response.json();

      if (!response.ok) {
        alert(result.message || '가맹점 정보 수정에 실패했습니다.');
        return;
      }

      if (result.success) {
        alert('가맹점 정보가 수정되었습니다.');
        setEditMode(false);
        // 페이지 새로고침
        window.location.reload();
      }
    } catch (error) {
      console.error('Save store error:', error);
      alert('네트워크 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadQR = async () => {
    if (!store || !baseUrl) return;

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

      const link = document.createElement('a');
      link.href = qrDataUrl;
      const safeName = store.name.replace(/[^a-zA-Z0-9가-힣]/g, '_');
      link.download = `${storeId}_${safeName}_qr코드.PNG`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
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

  if (!store) {
    return null;
  }

  return (
    <main className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* 헤더 */}
        <div className="flex justify-between items-center">
          <div>
            <Button
              onClick={() => router.push('/admin/stores')}
              variant="ghost"
              className="mb-2"
            >
              ← 목록으로
            </Button>
            <h1 className="text-3xl font-bold text-textPrimary">
              {store.name}
            </h1>
            <p className="text-textSecondary">
              가맹점 상세 정보 및 관리
            </p>
          </div>
          <Button onClick={handleLogout} variant="outline">
            로그아웃
          </Button>
        </div>

        {/* 가맹점 정보 */}
        <Card>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-textPrimary">
                가맹점 정보
              </h2>
              {!editMode ? (
                <Button onClick={() => setEditMode(true)} variant="outline">
                  수정
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? '저장 중...' : '저장'}
                  </Button>
                  <Button
                    onClick={() => {
                      setEditMode(false);
                      setEditData({
                        name: store.name,
                        manager_name: store.manager_name || '',
                        manager_phone: store.manager_phone || '',
                        is_active: store.is_active,
                      });
                    }}
                    variant="outline"
                  >
                    취소
                  </Button>
                </div>
              )}
            </div>

            {editMode ? (
              <div className="space-y-4">
                <Input
                  label="가맹점명"
                  value={editData.name}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  required
                />
                <Input
                  label="담당자명"
                  value={editData.manager_name}
                  onChange={(e) => setEditData({ ...editData, manager_name: e.target.value })}
                />
                <Input
                  label="연락처"
                  value={editData.manager_phone}
                  onChange={(e) => setEditData({ ...editData, manager_phone: e.target.value })}
                />
                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={editData.is_active}
                      onChange={(e) => setEditData({ ...editData, is_active: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-textPrimary">활성 상태</span>
                  </label>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-textSecondary mb-1">가맹점명</p>
                  <p className="font-semibold text-textPrimary">{store.name}</p>
                </div>
                <div>
                  <p className="text-sm text-textSecondary mb-1">담당자</p>
                  <p className="text-textPrimary">{store.manager_name || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-textSecondary mb-1">연락처</p>
                  <p className="text-textPrimary">{store.manager_phone || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-textSecondary mb-1">상태</p>
                  <span
                    className={`px-2 py-1 rounded text-xs font-semibold ${
                      store.is_active
                        ? 'bg-success bg-opacity-10 text-success'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {store.is_active ? '활성' : '비활성'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* 통계 */}
        <Card>
          <h2 className="text-xl font-semibold text-textPrimary mb-4">
            사용 통계
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-textSecondary mb-1">총 사용 건수</p>
              <p className="text-2xl font-bold text-textPrimary">
                {formatNumber(store.total_used)}건
              </p>
            </div>
            <div>
              <p className="text-sm text-textSecondary mb-1">총 사용 금액</p>
              <p className="text-2xl font-bold text-textPrimary">
                {formatCurrency(store.total_amount)}
              </p>
            </div>
            <div>
              <p className="text-sm text-textSecondary mb-1">정산 금액</p>
              <p className="text-2xl font-bold text-success">
                {formatCurrency(store.settled_amount)}
              </p>
            </div>
            <div>
              <p className="text-sm text-textSecondary mb-1">미정산 금액</p>
              <p className="text-2xl font-bold text-warning">
                {formatCurrency(store.unsettled_amount)}
              </p>
            </div>
          </div>
        </Card>

        {/* QR코드 다운로드 */}
        <Card>
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-textPrimary">
              QR코드 다운로드
            </h2>
            <p className="text-sm text-textSecondary">
              이 가맹점에서 쿠폰을 스캔할 때 사용하는 전용 QR코드입니다.
            </p>
            <p className="text-xs text-textSecondary">
              URL: {baseUrl}/store/{storeId}
            </p>
            <Button
              onClick={handleDownloadQR}
              disabled={generating || !baseUrl}
              fullWidth
            >
              {generating ? '생성 중...' : 'QR코드 다운로드'}
            </Button>
          </div>
        </Card>
      </div>
    </main>
  );
}

