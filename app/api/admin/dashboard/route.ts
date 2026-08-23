import { NextRequest, NextResponse } from 'next/server';
import { db, COLLECTIONS, Timestamp } from '@/lib/firebase';
import { ERROR_MESSAGES } from '@/lib/constants';
import { verifyAdminToken } from '@/lib/auth';
import type { DashboardData } from '@/lib/types';

// Node.js 런타임 사용
export const runtime = 'nodejs';

// 한국 시간 기준 오늘 시작 시간
function getKoreaTodayStart(): Date {
  const now = new Date();
  const koreaOffset = 9 * 60;
  const koreaTime = new Date(now.getTime() + koreaOffset * 60 * 1000);
  koreaTime.setUTCHours(0, 0, 0, 0);
  return new Date(koreaTime.getTime() - koreaOffset * 60 * 1000);
}

export async function GET(request: NextRequest) {
  try {
    const isAuthenticated = await verifyAdminToken(request);
    if (!isAuthenticated) {
      return NextResponse.json(
        { success: false, message: ERROR_MESSAGES.UNAUTHORIZED },
        { status: 401 }
      );
    }

    const todayStart = getKoreaTodayStart();
    const todayTimestamp = Timestamp.fromDate(todayStart);

    // 오늘 통계
    const todaySurveysSnap = await db
      .collection(COLLECTIONS.SURVEYS)
      .where('created_at', '>=', todayTimestamp)
      .get();
    const todaySurveys = todaySurveysSnap.size;

    const todayCouponsIssuedSnap = await db
      .collection(COLLECTIONS.COUPONS)
      .where('issued_at', '>=', todayTimestamp)
      .get();
    const todayCouponsIssued = todayCouponsIssuedSnap.size;

    const todayCouponsUsedSnap = await db
      .collection(COLLECTIONS.COUPONS)
      .where('status', '==', 'used')
      .where('used_at', '>=', todayTimestamp)
      .get();
    const todayCouponsUsed = todayCouponsUsedSnap.size;
    const todayAmountUsed = todayCouponsUsedSnap.docs.reduce(
      (sum, doc) => sum + (doc.data().amount || 0), 0
    );

    // 전체 통계
    const totalSurveysSnap = await db.collection(COLLECTIONS.SURVEYS).get();
    const totalSurveys = totalSurveysSnap.size;

    const totalSurveysStep2Snap = await db
      .collection(COLLECTIONS.SURVEYS)
      .where('stage_completed', '==', 2)
      .get();
    const totalSurveysStep2 = totalSurveysStep2Snap.size;

    const totalCouponsSnap = await db.collection(COLLECTIONS.COUPONS).get();
    const totalCouponsIssued = totalCouponsSnap.size;

    const totalCouponsUsedSnap = await db
      .collection(COLLECTIONS.COUPONS)
      .where('status', '==', 'used')
      .get();
    const totalCouponsUsed = totalCouponsUsedSnap.size;
    const totalAmountUsed = totalCouponsUsedSnap.docs.reduce(
      (sum, doc) => sum + (doc.data().amount || 0), 0
    );

    const totalRaffleSnap = await db.collection(COLLECTIONS.RAFFLE_ENTRIES).get();
    const totalRaffleEntries = totalRaffleSnap.size;

    // 예산 정보
    const budgetDoc = await db
      .collection(COLLECTIONS.SETTINGS)
      .doc('total_budget')
      .get();
    const totalBudget = parseInt(budgetDoc.data()?.value || '280000');
    const remaining = totalBudget - totalAmountUsed;
    const usageRate = (totalAmountUsed / totalBudget) * 100;

    // 지역별 통계
    const regionCounts: Record<string, number> = {};
    totalSurveysSnap.docs.forEach((doc) => {
      const region = doc.data().q1_region;
      if (region) {
        regionCounts[region] = (regionCounts[region] || 0) + 1;
      }
    });

    const byRegion = Object.entries(regionCounts).map(([region, count]) => ({
      region,
      count,
      percentage: (count / (totalSurveys || 1)) * 100,
    }));

    // 날짜별 통계 (최근 7일)
    const dates: string[] = [];
    const koreaTime = new Date();
    const koreaToday = new Date(koreaTime.getTime() + (9 * 60 * 60 * 1000));
    for (let i = 6; i >= 0; i--) {
      const date = new Date(koreaToday);
      date.setUTCDate(date.getUTCDate() - i);
      dates.push(date.toISOString().split('T')[0]);
    }

    const byDate = await Promise.all(
      dates.map(async (date) => {
        const startDate = new Date(date + 'T00:00:00.000Z');
        const endDate = new Date(date + 'T23:59:59.999Z');
        const startTs = Timestamp.fromDate(startDate);
        const endTs = Timestamp.fromDate(endDate);

        const surveysSnap = await db
          .collection(COLLECTIONS.SURVEYS)
          .where('created_at', '>=', startTs)
          .where('created_at', '<', endTs)
          .get();

        const couponsSnap = await db
          .collection(COLLECTIONS.COUPONS)
          .where('status', '==', 'used')
          .where('used_at', '>=', startTs)
          .where('used_at', '<', endTs)
          .get();

        return {
          date,
          surveys: surveysSnap.size,
          coupons_used: couponsSnap.size,
        };
      })
    );

    const dashboardData: DashboardData = {
      today: {
        surveys: todaySurveys,
        coupons_issued: todayCouponsIssued,
        coupons_used: todayCouponsUsed,
        amount_used: todayAmountUsed,
      },
      total: {
        surveys: totalSurveys,
        surveys_step2: totalSurveysStep2,
        coupons_issued: totalCouponsIssued,
        coupons_used: totalCouponsUsed,
        amount_used: totalAmountUsed,
        raffle_entries: totalRaffleEntries,
      },
      budget: {
        total: totalBudget,
        used: totalAmountUsed,
        remaining,
        usage_rate: usageRate,
      },
      by_region: byRegion,
      by_date: byDate,
    };

    return NextResponse.json({
      success: true,
      data: dashboardData,
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return NextResponse.json(
      {
        success: false,
        message: ERROR_MESSAGES.INTERNAL_ERROR,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
