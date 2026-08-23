'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Loading from '@/components/ui/Loading';
import { useToast } from '@/components/ui/ToastProvider';
import { storage, formatCurrency, formatNumber, formatPercent } from '@/lib/utils';
import type { DashboardData } from '@/lib/types';

export default function AdminDashboardPage() {
  const router = useRouter();
  const { showError, showSuccess } = useToast();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 관리자 토큰 확인
    const token = storage.get<string>('admin_token');
    if (!token) {
      router.push('/admin');
      return;
    }

    const fetchData = async () => {
      try {
        const response = await fetch('/api/admin/dashboard', {
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
          // 500 오류 등 다른 오류 처리
          const errorMessage = result.message || result.error || '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
          showError(errorMessage);
          setLoading(false);
          return;
        }

        if (result.success && result.data) {
          setData(result.data);
        } else {
          const errorMessage = result.message || '데이터를 불러오는데 실패했습니다.';
          showError(errorMessage);
        }
      } catch (error) {
        console.error('Fetch dashboard error:', error);
        showError('네트워크 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router]);

  const handleLogout = () => {
    storage.remove('admin_token');
    router.push('/admin');
  };

  if (loading) {
    return <Loading fullScreen text="데이터를 불러오는 중입니다..." />;
  }

  if (!data) {
    return null;
  }

  return (
    <main className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 헤더 */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-textPrimary">
              관리자 대시보드
            </h1>
            <p className="text-textSecondary">
              봉리단길 설문조사 시스템
            </p>
          </div>
          <Button onClick={handleLogout} variant="outline">
            로그아웃
          </Button>
        </div>

        {/* 오늘 통계 */}
        <div>
          <h2 className="text-xl font-semibold text-textPrimary mb-4">
            📊 오늘 현황
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <div className="space-y-2">
                <p className="text-sm text-textSecondary">설문 참여</p>
                <p className="text-3xl font-bold text-primary">
                  {formatNumber(data.today.surveys)}
                </p>
                <p className="text-xs text-textSecondary">건</p>
              </div>
            </Card>

            <Card>
              <div className="space-y-2">
                <p className="text-sm text-textSecondary">쿠폰 발급</p>
                <p className="text-3xl font-bold text-success">
                  {formatNumber(data.today.coupons_issued)}
                </p>
                <p className="text-xs text-textSecondary">건</p>
              </div>
            </Card>

            <Card>
              <div className="space-y-2">
                <p className="text-sm text-textSecondary">쿠폰 사용</p>
                <p className="text-3xl font-bold text-warning">
                  {formatNumber(data.today.coupons_used)}
                </p>
                <p className="text-xs text-textSecondary">건</p>
              </div>
            </Card>

            <Card>
              <div className="space-y-2">
                <p className="text-sm text-textSecondary">사용 금액</p>
                <p className="text-3xl font-bold text-error">
                  {formatCurrency(data.today.amount_used)}
                </p>
              </div>
            </Card>
          </div>
        </div>

        {/* 전체 통계 */}
        <div>
          <h2 className="text-xl font-semibold text-textPrimary mb-4">
            📈 전체 통계
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <div className="space-y-2">
                <p className="text-sm text-textSecondary">총 설문 참여</p>
                <p className="text-4xl font-bold text-primary">
                  {formatNumber(data.total.surveys)}
                </p>
                <p className="text-xs text-textSecondary">
                  2단계 완료: {formatNumber(data.total.surveys_step2)}건
                </p>
              </div>
            </Card>

            <Card>
              <div className="space-y-2">
                <p className="text-sm text-textSecondary">쿠폰 사용률</p>
                <p className="text-4xl font-bold text-success">
                  {formatPercent((data.total.coupons_used / (data.total.coupons_issued || 1)) * 100, 1)}
                </p>
                <p className="text-xs text-textSecondary">
                  {formatNumber(data.total.coupons_used)} / {formatNumber(data.total.coupons_issued)}
                </p>
              </div>
            </Card>

            <Card>
              <div className="space-y-2">
                <p className="text-sm text-textSecondary">추첨 응모</p>
                <p className="text-4xl font-bold text-warning">
                  {formatNumber(data.total.raffle_entries)}
                </p>
                <p className="text-xs text-textSecondary">명</p>
              </div>
            </Card>
          </div>
        </div>

        {/* 예산 현황 */}
        <Card>
          <h2 className="text-xl font-semibold text-textPrimary mb-4">
            💰 예산 현황
          </h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-textSecondary">총 예산</span>
              <span className="text-xl font-bold text-textPrimary">
                {formatCurrency(data.budget.total)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-textSecondary">사용 금액</span>
              <span className="text-xl font-bold text-error">
                {formatCurrency(data.budget.used)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-textSecondary">잔여 금액</span>
              <span className="text-xl font-bold text-success">
                {formatCurrency(data.budget.remaining)}
              </span>
            </div>
            
            {/* 진행률 바 */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-textSecondary">사용률</span>
                <span className="font-semibold text-primary">
                  {formatPercent(data.budget.usage_rate)}
                </span>
              </div>
              <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${Math.min(data.budget.usage_rate, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </Card>

        {/* 지역별 통계 */}
        <Card>
          <h2 className="text-xl font-semibold text-textPrimary mb-4">
            🗺️ 지역별 응답 현황
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {data.by_region.map((item) => (
              <div
                key={item.region}
                className="border border-border rounded-lg p-4"
              >
                <p className="text-sm text-textSecondary mb-1">{item.region}</p>
                <p className="text-2xl font-bold text-primary">
                  {formatNumber(item.count)}
                </p>
                <p className="text-xs text-textSecondary">
                  {formatPercent(item.percentage, 0)}
                </p>
              </div>
            ))}
          </div>
        </Card>

        {/* 날짜별 추이 */}
        <Card>
          <h2 className="text-xl font-semibold text-textPrimary mb-4">
            📅 최근 7일 추이
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border">
                <tr>
                  <th className="text-left p-3 text-textSecondary font-medium">날짜</th>
                  <th className="text-right p-3 text-textSecondary font-medium">설문</th>
                  <th className="text-right p-3 text-textSecondary font-medium">쿠폰 사용</th>
                </tr>
              </thead>
              <tbody>
                {data.by_date.map((item) => (
                  <tr key={item.date} className="border-b border-border">
                    <td className="p-3 text-textPrimary">{item.date}</td>
                    <td className="p-3 text-right font-semibold text-primary">
                      {formatNumber(item.surveys)}
                    </td>
                    <td className="p-3 text-right font-semibold text-success">
                      {formatNumber(item.coupons_used)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* 추가 메뉴 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link href="/admin/stores">
            <Card className="hover:border-primary cursor-pointer transition-colors">
              <div className="text-center space-y-3 py-4">
                <div className="text-4xl">🏪</div>
                <p className="font-semibold text-textPrimary">가맹점 관리</p>
                <p className="text-sm text-textSecondary">가맹점 정보 및 통계 관리</p>
              </div>
            </Card>
          </Link>

          <Link href="/admin/settlements">
            <Card className="hover:border-primary cursor-pointer transition-colors">
              <div className="text-center space-y-3 py-4">
                <div className="text-4xl">💰</div>
                <p className="font-semibold text-textPrimary">정산 관리</p>
                <p className="text-sm text-textSecondary">정산 현황 및 이력 관리</p>
              </div>
            </Card>
          </Link>

          <Link href="/admin/raffle">
            <Card className="hover:border-primary cursor-pointer transition-colors">
              <div className="text-center space-y-3 py-4">
                <div className="text-4xl">🎁</div>
                <p className="font-semibold text-textPrimary">추첨 관리</p>
                <p className="text-sm text-textSecondary">추첨 응모자 관리 및 당첨자 선정</p>
              </div>
            </Card>
          </Link>
        </div>
      </div>
    </main>
  );
}

