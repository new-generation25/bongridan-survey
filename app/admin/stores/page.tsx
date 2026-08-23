'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import QRCode from 'qrcode';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Loading from '@/components/ui/Loading';
import { useToast } from '@/components/ui/ToastProvider';
import { storage, formatCurrency, formatNumber } from '@/lib/utils';

interface StoreWithStats {
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

export default function AdminStoresPage() {
  const router = useRouter();
  const { showError, showSuccess } = useToast();
  const [stores, setStores] = useState<StoreWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newStore, setNewStore] = useState({
    name: '',
    manager_name: '',
    manager_phone: '',
  });
  const [generatingQR, setGeneratingQR] = useState<string | null>(null);
  const [baseUrl, setBaseUrl] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = () => {
      const token = storage.get<string>('admin_token');
      if (!token) {
        router.push('/admin');
        return false;
      }
      return true;
    };

    if (!checkAuth()) {
      return;
    }

    const url = window.location.origin;
    setBaseUrl(url);

    fetchStores();

    // 페이지 포커스 시 로그인 정보 재확인
    const handleFocus = () => {
      checkAuth();
    };

    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [router]);

  const fetchStores = async () => {
    try {
      const token = storage.get<string>('admin_token');
      const response = await fetch('/api/admin/stores', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-admin-token': token || '',
        },
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          storage.remove('admin_token');
          router.push('/admin');
          return;
        }
        showError(result.message || '가맹점 목록을 불러오는데 실패했습니다.');
        setLoading(false);
        return;
      }

      if (result.success && result.stores) {
        setStores(result.stores);
      }
    } catch (error) {
      console.error('Fetch stores error:', error);
      showError('네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddStore = async () => {
    if (!newStore.name.trim()) {
      showError('가맹점명을 입력해주세요.');
      return;
    }

    try {
      const token = storage.get<string>('admin_token');
      const response = await fetch('/api/admin/stores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-admin-token': token || '',
        },
        body: JSON.stringify({
          name: newStore.name,
          manager_name: newStore.manager_name || null,
          manager_phone: newStore.manager_phone || null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        showError(result.message || '가맹점 추가에 실패했습니다.');
        return;
      }

      if (result.success) {
        showError('가맹점이 추가되었습니다.');
        setShowAddModal(false);
        setNewStore({ name: '', manager_name: '', manager_phone: '' });
        fetchStores();
      }
    } catch (error) {
      console.error('Add store error:', error);
      showError('네트워크 오류가 발생했습니다.');
    }
  };

  const handleDownloadQR = async (storeId: string, storeName: string) => {
    if (!baseUrl) return;

    setGeneratingQR(storeId);
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
      const safeName = storeName.replace(/[^a-zA-Z0-9가-힣]/g, '_');
      link.download = `${storeId}_${safeName}_qr코드.PNG`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Generate QR error:', error);
      showError('QR코드 생성에 실패했습니다.');
    } finally {
      setGeneratingQR(null);
    }
  };

  const handleToggleStatus = async (storeId: string, currentStatus: boolean) => {
    if (!confirm(`가맹점을 ${currentStatus ? '비활성' : '활성'}으로 변경하시겠습니까?`)) {
      return;
    }

    setUpdatingStatus(storeId);
    try {
      const token = storage.get<string>('admin_token');
      const response = await fetch(`/api/admin/stores/${storeId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-admin-token': token || '',
        },
        body: JSON.stringify({
          is_active: !currentStatus,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        showError(result.message || '상태 변경에 실패했습니다.');
        return;
      }

      if (result.success) {
        // 목록 새로고침
        fetchStores();
      }
    } catch (error) {
      console.error('Toggle status error:', error);
      showError('네트워크 오류가 발생했습니다.');
    } finally {
      setUpdatingStatus(null);
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
            <div className="flex items-center gap-3 mb-2">
              <Link href="/admin/dashboard">
                <Button variant="ghost" size="sm">
                  ← 대시보드
                </Button>
              </Link>
            </div>
            <h1 className="text-3xl font-bold text-textPrimary">
              🏪 가맹점 관리
            </h1>
            <p className="text-textSecondary">
              가맹점 정보를 관리하고 통계를 확인할 수 있습니다
            </p>
          </div>
          <div className="flex gap-3">
            <Button onClick={() => setShowAddModal(true)}>
              + 가맹점 추가
            </Button>
            <Button onClick={handleLogout} variant="outline">
              로그아웃
            </Button>
          </div>
        </div>

        {/* 가맹점 목록 */}
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-3 text-sm font-semibold text-textPrimary">No</th>
                  <th className="text-left p-3 text-sm font-semibold text-textPrimary">가맹점명</th>
                  <th className="text-left p-3 text-sm font-semibold text-textPrimary">담당자</th>
                  <th className="text-right p-3 text-sm font-semibold text-textPrimary">사용</th>
                  <th className="text-right p-3 text-sm font-semibold text-textPrimary">정산</th>
                  <th className="text-right p-3 text-sm font-semibold text-textPrimary">미정산</th>
                  <th className="text-center p-3 text-sm font-semibold text-textPrimary">상태</th>
                  <th className="text-center p-3 text-sm font-semibold text-textPrimary">QR코드</th>
                  <th className="text-center p-3 text-sm font-semibold text-textPrimary">관리</th>
                </tr>
              </thead>
              <tbody>
                {stores.map((store, index) => (
                  <tr
                    key={store.id}
                    className="border-b border-border hover:bg-gray-50 transition-colors"
                  >
                    <td className="p-3 text-textSecondary">{store.id}</td>
                    <td className="p-3">
                      <Link
                        href={`/admin/stores/${store.id}`}
                        className="font-semibold text-textPrimary hover:text-primary"
                      >
                        {store.name}
                      </Link>
                    </td>
                    <td className="p-3 text-textSecondary">
                      {store.manager_name || '-'}
                    </td>
                    <td className="p-3 text-right text-textPrimary">
                      {formatNumber(store.total_used)}건
                      <br />
                      <span className="text-sm text-textSecondary">
                        {formatCurrency(store.total_amount)}
                      </span>
                    </td>
                    <td className="p-3 text-right text-success">
                      {formatCurrency(store.settled_amount)}
                    </td>
                    <td className="p-3 text-right text-warning">
                      {formatCurrency(store.unsettled_amount)}
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => handleToggleStatus(store.id, store.is_active)}
                        disabled={updatingStatus === store.id}
                        className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                          store.is_active
                            ? 'bg-success bg-opacity-10 text-success hover:bg-success hover:bg-opacity-20'
                            : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                        } ${updatingStatus === store.id ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        title={store.is_active ? '클릭하여 비활성화' : '클릭하여 활성화'}
                      >
                        {updatingStatus === store.id ? '변경 중...' : store.is_active ? '활성' : '비활성'}
                      </button>
                    </td>
                    <td className="p-3 text-center">
                      <Button
                        onClick={() => handleDownloadQR(store.id, store.name)}
                        disabled={generatingQR === store.id || !baseUrl}
                        variant="outline"
                        size="sm"
                      >
                        {generatingQR === store.id ? '생성 중...' : 'QR 다운로드'}
                      </Button>
                    </td>
                    <td className="p-3 text-center">
                      <Link href={`/admin/stores/${store.id}`}>
                        <Button variant="outline" size="sm">
                          상세
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* 가맹점 추가 모달 */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="max-w-md w-full mx-4">
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-textPrimary">가맹점 추가</h2>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-textPrimary mb-1">
                      가맹점명 <span className="text-error">*</span>
                    </label>
                    <input
                      type="text"
                      value={newStore.name}
                      onChange={(e) => setNewStore({ ...newStore, name: e.target.value })}
                      className="w-full px-4 py-2 border border-border rounded-lg"
                      placeholder="가맹점명을 입력하세요"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-textPrimary mb-1">
                      담당자명
                    </label>
                    <input
                      type="text"
                      value={newStore.manager_name}
                      onChange={(e) => setNewStore({ ...newStore, manager_name: e.target.value })}
                      className="w-full px-4 py-2 border border-border rounded-lg"
                      placeholder="담당자명을 입력하세요"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-textPrimary mb-1">
                      연락처
                    </label>
                    <input
                      type="text"
                      value={newStore.manager_phone}
                      onChange={(e) => setNewStore({ ...newStore, manager_phone: e.target.value })}
                      className="w-full px-4 py-2 border border-border rounded-lg"
                      placeholder="연락처를 입력하세요"
                    />
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <Button onClick={handleAddStore} fullWidth>
                    추가
                  </Button>
                  <Button
                    onClick={() => {
                      setShowAddModal(false);
                      setNewStore({ name: '', manager_name: '', manager_phone: '' });
                    }}
                    variant="outline"
                    fullWidth
                  >
                    취소
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </main>
  );
}

