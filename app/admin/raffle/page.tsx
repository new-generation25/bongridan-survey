'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Loading from '@/components/ui/Loading';
import { storage, formatDate } from '@/lib/utils';

interface RaffleEntry {
  id: string;
  created_at: string;
  survey_id: string;
  name: string;
  phone: string;
  agreed_privacy: boolean;
  survey_region?: string;
  survey_created_at?: string;
}

interface Winner {
  id: string;
  name: string;
  phone: string;
  survey_region: string;
  created_at: string;
}

export default function AdminRafflePage() {
  const router = useRouter();
  const [entries, setEntries] = useState<RaffleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawing, setDrawing] = useState(false);
  const [winners, setWinners] = useState<Winner[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [eligibleCount, setEligibleCount] = useState(0);
  const [prizeCount, setPrizeCount] = useState(3);

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
        setTotalCount(result.total_count || 0);
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

    if (!confirm(`정말로 추첨을 진행하시겠습니까?\n\n선정 인원: ${prizeCount}명\n총 응모자: ${totalCount}명`)) {
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
        body: JSON.stringify({ count: prizeCount }),
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
            <h1 className="text-3xl font-bold text-textPrimary">
              🎁 추첨 관리
            </h1>
            <p className="text-textSecondary">
              추첨 응모자 관리 및 당첨자 선정
            </p>
          </div>
          <Button onClick={handleLogout} variant="outline">
            로그아웃
          </Button>
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
            </div>
          </Card>
          <Card>
            <div className="space-y-2">
              <p className="text-sm text-textSecondary">선정 인원</p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={prizeCount}
                  onChange={(e) => {
                    const value = parseInt(e.target.value, 10);
                    if (!isNaN(value) && value > 0) {
                      setPrizeCount(value);
                    }
                  }}
                  className="w-20 px-3 py-2 border border-border rounded-lg text-2xl font-bold"
                  min="1"
                />
                <span className="text-textSecondary">명</span>
              </div>
            </div>
          </Card>
        </div>

        {/* 추첨 실행 */}
        {eligibleCount >= 5 && (
          <Card>
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-textPrimary">
                추첨 실행
              </h2>
              <p className="text-sm text-textSecondary">
                종료 시점에서 랜덤으로 당첨자를 선정합니다.
              </p>
              <Button
                onClick={handleDraw}
                disabled={drawing || eligibleCount < 5}
                size="lg"
                fullWidth
              >
                {drawing ? '추첨 중...' : `🎲 추첨 실행 (${prizeCount}명 선정)`}
              </Button>
            </div>
          </Card>
        )}

        {/* 당첨자 결과 */}
        {winners.length > 0 && (
          <Card>
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-textPrimary">
                🎉 당첨자 결과
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-3 text-sm font-semibold text-textPrimary">순위</th>
                      <th className="text-left p-3 text-sm font-semibold text-textPrimary">이름</th>
                      <th className="text-left p-3 text-sm font-semibold text-textPrimary">전화번호</th>
                      <th className="text-left p-3 text-sm font-semibold text-textPrimary">지역</th>
                      <th className="text-left p-3 text-sm font-semibold text-textPrimary">응모일시</th>
                    </tr>
                  </thead>
                  <tbody>
                    {winners.map((winner, index) => (
                      <tr key={winner.id} className="border-b border-border">
                        <td className="p-3 font-bold text-primary">{index + 1}등</td>
                        <td className="p-3 font-semibold text-textPrimary">{winner.name}</td>
                        <td className="p-3 text-textPrimary">{winner.phone}</td>
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
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry) => (
                      <tr key={entry.id} className="border-b border-border">
                        <td className="p-3 font-semibold text-textPrimary">{entry.name}</td>
                        <td className="p-3 text-textPrimary">{entry.phone}</td>
                        <td className="p-3 text-textSecondary">{entry.survey_region || '-'}</td>
                        <td className="p-3 text-textSecondary">
                          {formatDate(entry.created_at, 'datetime')}
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

