'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Loading from '@/components/ui/Loading';
import { useToast } from '@/components/ui/ToastProvider';
import Input from '@/components/ui/Input';
import { storage, formatCurrency, formatNumber, formatDate } from '@/lib/utils';

interface Settlement {
  id: string;
  created_at: string;
  store_id: string;
  amount: number;
  note?: string;
  settled_by?: string;
  stores?: {
    id: string;
    name: string;
  };
}

interface StoreUnsettled {
  store_id: string;
  store_name: string;
  used_count: number;
  total_amount: number;
  settled_amount: number;
  unsettled_amount: number;
}

export default function AdminSettlementsPage() {
  const router = useRouter();
  const { showError, showSuccess } = useToast();
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [storesUnsettled, setStoresUnsettled] = useState<StoreUnsettled[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSettlement, setNewSettlement] = useState({
    store_id: '',
    amount: '',
    note: '',
  });
  const [allStores, setAllStores] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    const token = storage.get<string>('admin_token');
    if (!token) {
      router.push('/admin');
      return;
    }

    fetchData();
    fetchStores();
  }, [router]);

  const fetchData = async () => {
    try {
      const token = storage.get<string>('admin_token');
      const response = await fetch('/api/admin/settlements', {
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
        showError(result.message || '정산 데이터를 불러오는데 실패했습니다.');
        setLoading(false);
        return;
      }

      if (result.success) {
        setSettlements(result.settlements || []);
        setStoresUnsettled(result.stores_unsettled || []);
      }
    } catch (error) {
      console.error('Fetch settlements error:', error);
      showError('네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

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

      if (result.success && result.stores) {
        setAllStores(result.stores.map((s: { id: string; name: string }) => ({
          id: s.id,
          name: s.name,
        })));
      }
    } catch (error) {
      console.error('Fetch stores error:', error);
    }
  };

  const handleAddSettlement = async () => {
    if (!newSettlement.store_id || !newSettlement.amount) {
      showError('가맹점과 정산 금액을 입력해주세요.');
      return;
    }

    const amount = parseInt(newSettlement.amount, 10);
    if (isNaN(amount) || amount <= 0) {
      showError('정산 금액은 0보다 큰 숫자여야 합니다.');
      return;
    }

    try {
      const token = storage.get<string>('admin_token');
      const response = await fetch('/api/admin/settlements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-admin-token': token || '',
        },
        body: JSON.stringify({
          store_id: newSettlement.store_id,
          amount,
          note: newSettlement.note || null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        showError(result.message || '정산 입력에 실패했습니다.');
        return;
      }

      if (result.success) {
        showError('정산이 입력되었습니다.');
        setShowAddModal(false);
        setNewSettlement({ store_id: '', amount: '', note: '' });
        fetchData();
      }
    } catch (error) {
      console.error('Add settlement error:', error);
      showError('네트워크 오류가 발생했습니다.');
    }
  };

  const handleLogout = () => {
    storage.remove('admin_token');
    router.push('/admin');
  };

  const totalUnsettled = storesUnsettled.reduce((sum, s) => sum + s.unsettled_amount, 0);

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
              💰 정산 관리
            </h1>
            <p className="text-textSecondary">
              정산 현황 및 정산 이력을 관리할 수 있습니다
            </p>
          </div>
          <div className="flex gap-3">
            <Button onClick={() => setShowAddModal(true)}>
              + 정산 입력
            </Button>
            <Button onClick={handleLogout} variant="outline">
              로그아웃
            </Button>
          </div>
        </div>

        {/* 정산 현황 요약 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <div className="space-y-2">
              <p className="text-sm text-textSecondary">전체 미정산 금액</p>
              <p className="text-3xl font-bold text-warning">
                {formatCurrency(totalUnsettled)}
              </p>
            </div>
          </Card>
          <Card>
            <div className="space-y-2">
              <p className="text-sm text-textSecondary">미정산 가맹점 수</p>
              <p className="text-3xl font-bold text-textPrimary">
                {storesUnsettled.length}개
              </p>
            </div>
          </Card>
          <Card>
            <div className="space-y-2">
              <p className="text-sm text-textSecondary">총 정산 건수</p>
              <p className="text-3xl font-bold text-textPrimary">
                {formatNumber(settlements.length)}건
              </p>
            </div>
          </Card>
        </div>

        {/* 가맹점별 미정산 현황 */}
        {storesUnsettled.length > 0 && (
          <Card>
            <h2 className="text-xl font-semibold text-textPrimary mb-4">
              가맹점별 미정산 현황
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-3 text-sm font-semibold text-textPrimary">가맹점명</th>
                    <th className="text-right p-3 text-sm font-semibold text-textPrimary">적립건수</th>
                    <th className="text-right p-3 text-sm font-semibold text-textPrimary">총 사용</th>
                    <th className="text-right p-3 text-sm font-semibold text-textPrimary">미정산</th>
                    <th className="text-right p-3 text-sm font-semibold text-textPrimary">정산</th>
                  </tr>
                </thead>
                <tbody>
                  {storesUnsettled.map((store) => (
                    <tr key={store.store_id} className="border-b border-border">
                      <td className="p-3 font-semibold text-textPrimary">{store.store_name}</td>
                      <td className="p-3 text-right text-textPrimary">
                        {formatNumber(store.used_count)}건
                      </td>
                      <td className="p-3 text-right text-textPrimary">
                        {formatCurrency(store.total_amount)}
                      </td>
                      <td className="p-3 text-right text-warning font-semibold">
                        {formatCurrency(store.unsettled_amount)}
                      </td>
                      <td className="p-3 text-right text-success">
                        {formatCurrency(store.settled_amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* 정산 이력 */}
        <Card>
          <h2 className="text-xl font-semibold text-textPrimary mb-4">
            정산 이력
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-3 text-sm font-semibold text-textPrimary">날짜</th>
                  <th className="text-left p-3 text-sm font-semibold text-textPrimary">가맹점</th>
                  <th className="text-right p-3 text-sm font-semibold text-textPrimary">금액</th>
                  <th className="text-left p-3 text-sm font-semibold text-textPrimary">메모</th>
                </tr>
              </thead>
              <tbody>
                {settlements.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-textSecondary">
                      정산 이력이 없습니다.
                    </td>
                  </tr>
                ) : (
                  settlements.map((settlement) => (
                    <tr key={settlement.id} className="border-b border-border">
                      <td className="p-3 text-textSecondary">
                        {formatDate(settlement.created_at, 'datetime')}
                      </td>
                      <td className="p-3 font-semibold text-textPrimary">
                        {settlement.stores?.name || settlement.store_id}
                      </td>
                      <td className="p-3 text-right font-semibold text-success">
                        {formatCurrency(settlement.amount)}
                      </td>
                      <td className="p-3 text-textSecondary">
                        {settlement.note || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* 정산 입력 모달 */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="max-w-md w-full mx-4">
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-textPrimary">정산 입력</h2>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-textPrimary mb-1">
                      가맹점 <span className="text-error">*</span>
                    </label>
                    <select
                      value={newSettlement.store_id}
                      onChange={(e) => setNewSettlement({ ...newSettlement, store_id: e.target.value })}
                      className="w-full px-4 py-2 border border-border rounded-lg"
                    >
                      <option value="">가맹점 선택</option>
                      {allStores.map((store) => (
                        <option key={store.id} value={store.id}>
                          {store.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-textPrimary mb-1">
                      정산 금액 <span className="text-error">*</span>
                    </label>
                    <input
                      type="number"
                      value={newSettlement.amount}
                      onChange={(e) => setNewSettlement({ ...newSettlement, amount: e.target.value })}
                      className="w-full px-4 py-2 border border-border rounded-lg"
                      placeholder="정산 금액을 입력하세요"
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-textPrimary mb-1">
                      메모
                    </label>
                    <textarea
                      value={newSettlement.note}
                      onChange={(e) => setNewSettlement({ ...newSettlement, note: e.target.value })}
                      className="w-full px-4 py-2 border border-border rounded-lg"
                      rows={3}
                      placeholder="정산 메모를 입력하세요 (선택사항)"
                    />
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <Button onClick={handleAddSettlement} fullWidth>
                    입력
                  </Button>
                  <Button
                    onClick={() => {
                      setShowAddModal(false);
                      setNewSettlement({ store_id: '', amount: '', note: '' });
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

