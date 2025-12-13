'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Loading from '@/components/ui/Loading';
import { storage, formatDate } from '@/lib/utils';

interface RaffleEntry {
  id: string | null;
  created_at: string;
  survey_id: string;
  name: string;
  phone: string;
  agreed_privacy: boolean;
  survey_region?: string;
  survey_created_at?: string;
  has_raffle_entry?: boolean; // 추첨 응모 여부
}

interface Winner {
  id: string;
  name: string;
  phone: string;
  survey_region: string;
  created_at: string;
  rank: number;
  amount: number;
}

export default function AdminRafflePage() {
  const router = useRouter();
  const [entries, setEntries] = useState<RaffleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawing, setDrawing] = useState(false);
  const [winners, setWinners] = useState<Winner[]>([]);
  const [totalCount, setTotalCount] = useState(0); // 추첨 응모자 수 (raffle_entries_count)
  const [eligibleCount, setEligibleCount] = useState(0); // 2단계 설문 완료자 수

  useEffect(() => {
    const token = storage.get<string>('admin_token');
    if (!token) {
      router.push('/admin');
      return;
    }

    fetchEntries();
  }, [router]);

  const fetchEntries = async () => {
    try {
      const token = storage.get<string>('admin_token');
      const response = await fetch('/api/admin/raffle', {
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
        alert(result.message || '추첨 데이터를 불러오는데 실패했습니다.');
        setLoading(false);
        return;
      }

      if (result.success) {
        setEntries(result.entries || []);
        // raffle_entries_count가 있으면 사용, 없으면 total_count 사용 (하위 호환성)
        setTotalCount(result.raffle_entries_count !== undefined ? result.raffle_entries_count : result.total_count || 0);
        setEligibleCount(result.eligible_count || 0);
      }
    } catch (error) {
      console.error('Fetch entries error:', error);
      alert('네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleDraw = async () => {
    if (eligibleCount < 5) {
      alert('추첨 가능한 응답자가 부족합니다. (5명 이상 필요)');
      return;
    }

    if (totalCount < 7) {
      alert(`추첨 응모자가 부족합니다. (현재: ${totalCount}명, 필요: 7명 이상)`);
      return;
    }

    if (!confirm(`정말로 추첨을 진행하시겠습니까?\n\n` +
      `1등 (2만원): 1명\n` +
      `2등 (1만원): 2명\n` +
      `3등 (5천원): 4명\n` +
      `총 7명 선정, 총 6만원\n\n` +
      `총 응모자: ${totalCount}명`)) {
      return;
    }

    setDrawing(true);
    try {
      const token = storage.get<string>('admin_token');
      const response = await fetch('/api/admin/raffle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-admin-token': token || '',
        },
        body: JSON.stringify({}),
      });

      const result = await response.json();

      if (!response.ok) {
        alert(result.message || '추첨에 실패했습니다.');
        setDrawing(false);
        return;
      }

      if (result.success && result.winners) {
        setWinners(result.winners);
        alert(`추첨이 완료되었습니다!\n\n당첨자 ${result.selected_count}명이 선정되었습니다.`);
      }
    } catch (error) {
      console.error('Draw raffle error:', error);
      alert('네트워크 오류가 발생했습니다.');
    } finally {
      setDrawing(false);
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
              🎁 추첨 관리
            </h1>
            <p className="text-textSecondary">
              추첨 응모자 관리 및 당첨자 선정
            </p>
          </div>
          <div className="flex gap-3">
            <Button onClick={handleLogout} variant="outline">
              로그아웃
            </Button>
          </div>
        </div>

        {/* 통계 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <div className="space-y-2">
              <p className="text-sm text-textSecondary">2단계 설문 완료자</p>
              <p className="text-3xl font-bold text-textPrimary">
                {eligibleCount}명
              </p>
              <p className="text-xs text-textSecondary">
                {eligibleCount >= 5 ? '✅ 추첨 가능' : '⚠️ 5명 이상 필요'}
              </p>
            </div>
          </Card>
          <Card>
            <div className="space-y-2">
              <p className="text-sm text-textSecondary">추첨 응모자</p>
              <p className="text-3xl font-bold text-textPrimary">
                {totalCount}명
              </p>
              <p className="text-xs text-textSecondary">
                {totalCount >= 7 ? '✅ 추첨 가능' : '⚠️ 7명 이상 필요'}
              </p>
            </div>
          </Card>
          <Card>
            <div className="space-y-2">
              <p className="text-sm text-textSecondary">상금 총액</p>
              <p className="text-3xl font-bold text-primary">
                60,000원
              </p>
              <p className="text-xs text-textSecondary">
                1등(2만원) 1명, 2등(1만원) 2명, 3등(5천원) 4명
              </p>
            </div>
          </Card>
        </div>

        {/* 추첨 실행 */}
        {eligibleCount >= 5 && totalCount >= 7 && (
          <Card>
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-textPrimary">
                랜덤 추첨 실행
              </h2>
              <div className="bg-primary bg-opacity-10 rounded-lg p-4 space-y-2">
                <p className="font-semibold text-textPrimary">상금 구조</p>
                <ul className="text-sm text-textSecondary space-y-1">
                  <li>🥇 1등: 20,000원 (1명)</li>
                  <li>🥈 2등: 10,000원 (2명)</li>
                  <li>🥉 3등: 5,000원 (4명)</li>
                  <li className="font-semibold text-textPrimary pt-2">총 7명 선정, 총 60,000원</li>
                </ul>
              </div>
              <p className="text-sm text-textSecondary">
                종료 시점에서 랜덤으로 당첨자를 선정합니다. 관리자가 개별 연락을 진행합니다.
              </p>
              <Button
                onClick={handleDraw}
                disabled={drawing || eligibleCount < 5 || totalCount < 7}
                size="lg"
                fullWidth
                className="bg-primary hover:bg-blue-600"
              >
                {drawing ? '랜덤 추첨 중...' : '🎲 랜덤 추첨 실행 (7명 선정)'}
              </Button>
            </div>
          </Card>
        )}
        
        {/* 추첨 조건 미충족 시 안내 */}
        {(eligibleCount < 5 || totalCount < 7) && (
          <Card>
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-textPrimary">
                랜덤 추첨 실행
              </h2>
              <div className="bg-warning bg-opacity-10 rounded-lg p-4 space-y-2">
                <p className="font-semibold text-warning">추첨 조건 미충족</p>
                <ul className="text-sm text-textSecondary space-y-1">
                  {eligibleCount < 5 && (
                    <li>⚠️ 2단계 설문 완료자: {eligibleCount}명 / 필요: 5명 이상</li>
                  )}
                  {totalCount < 7 && (
                    <li>⚠️ 추첨 응모자: {totalCount}명 / 필요: 7명 이상</li>
                  )}
                </ul>
              </div>
              <p className="text-sm text-textSecondary">
                추첨 조건을 충족하면 랜덤 추첨 버튼이 활성화됩니다.
              </p>
            </div>
          </Card>
        )}

        {/* 당첨자 결과 */}
        {winners.length > 0 && (
          <Card>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-textPrimary">
                  🎉 당첨자 결과
                </h2>
                <p className="text-sm text-textSecondary">
                  총 {winners.length}명 선정
                </p>
              </div>
              
              {/* 등급별로 그룹화하여 표시 */}
              {[1, 2, 3].map((rank) => {
                const rankWinners = winners.filter((w) => w.rank === rank);
                if (rankWinners.length === 0) return null;

                const prizeInfo = rank === 1 ? { amount: 20000, label: '1등' } :
                                 rank === 2 ? { amount: 10000, label: '2등' } :
                                 { amount: 5000, label: '3등' };

                return (
                  <div key={rank} className="space-y-2">
                    <h3 className="font-semibold text-textPrimary">
                      {rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'} {prizeInfo.label} ({prizeInfo.amount.toLocaleString()}원) - {rankWinners.length}명
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-border bg-gray-50">
                            <th className="text-left p-3 text-sm font-semibold text-textPrimary">이름</th>
                            <th className="text-left p-3 text-sm font-semibold text-textPrimary">전화번호</th>
                            <th className="text-left p-3 text-sm font-semibold text-textPrimary">지역</th>
                            <th className="text-left p-3 text-sm font-semibold text-textPrimary">응모일시</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rankWinners.map((winner) => (
                            <tr key={winner.id} className="border-b border-border">
                              <td className="p-3 font-semibold text-textPrimary">{winner.name}</td>
                              <td className="p-3">
                                <a
                                  href={`tel:${winner.phone}`}
                                  className="text-primary font-semibold hover:underline text-lg"
                                >
                                  {winner.phone}
                                </a>
                              </td>
                              <td className="p-3 text-textSecondary">{winner.survey_region}</td>
                              <td className="p-3 text-textSecondary">
                                {formatDate(winner.created_at, 'datetime')}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* 응모자 목록 */}
        <Card>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-textPrimary">
                추첨 응모자 목록
              </h2>
              <Button onClick={fetchEntries} variant="outline" size="sm">
                새로고침
              </Button>
            </div>
            {eligibleCount < 5 ? (
              <div className="text-center py-8">
                <p className="text-textSecondary mb-2">
                  추첨 가능한 응답자가 부족합니다.
                </p>
                <p className="text-sm text-textSecondary">
                  현재: {eligibleCount}명 / 필요: 5명 이상
                </p>
              </div>
            ) : entries.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-textSecondary">추첨 응모자가 없습니다.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-3 text-sm font-semibold text-textPrimary">이름</th>
                      <th className="text-left p-3 text-sm font-semibold text-textPrimary">전화번호</th>
                      <th className="text-left p-3 text-sm font-semibold text-textPrimary">지역</th>
                      <th className="text-left p-3 text-sm font-semibold text-textPrimary">응모일시</th>
                      <th className="text-left p-3 text-sm font-semibold text-textPrimary">상태</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry, index) => (
                      <tr key={entry.id || `entry-${index}`} className="border-b border-border">
                        <td className="p-3 font-semibold text-textPrimary">{entry.name}</td>
                        <td className="p-3">
                          {entry.phone !== '-' ? (
                            <a
                              href={`tel:${entry.phone}`}
                              className="text-primary font-semibold hover:underline"
                            >
                              {entry.phone}
                            </a>
                          ) : (
                            <span className="text-textSecondary">-</span>
                          )}
                        </td>
                        <td className="p-3 text-textSecondary">{entry.survey_region || '-'}</td>
                        <td className="p-3 text-textSecondary">
                          {formatDate(entry.survey_created_at || entry.created_at, 'datetime')}
                        </td>
                        <td className="p-3">
                          {entry.has_raffle_entry === false ? (
                            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                              2단계 완료 (추첨 미응모)
                            </span>
                          ) : (
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                              추첨 응모 완료
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Card>
      </div>
    </main>
  );
}

