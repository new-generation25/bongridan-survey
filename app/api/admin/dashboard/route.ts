import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { ERROR_MESSAGES } from '@/lib/constants';
import type { DashboardData } from '@/lib/types';

export async function GET() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    // 오늘 통계
    const { count: todaySurveys } = await supabaseAdmin
      .from('surveys')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', todayISO);

    const { count: todayCouponsIssued } = await supabaseAdmin
      .from('coupons')
      .select('*', { count: 'exact', head: true })
      .gte('issued_at', todayISO);

    const { count: todayCouponsUsed } = await supabaseAdmin
      .from('coupons')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'used')
      .gte('used_at', todayISO);

    const { data: todayUsedCoupons } = await supabaseAdmin
      .from('coupons')
      .select('amount')
      .eq('status', 'used')
      .gte('used_at', todayISO);

    const todayAmountUsed = todayUsedCoupons?.reduce((sum, c) => sum + c.amount, 0) || 0;

    // 전체 통계
    const { count: totalSurveys } = await supabaseAdmin
      .from('surveys')
      .select('*', { count: 'exact', head: true });

    const { count: totalSurveysStep2 } = await supabaseAdmin
      .from('surveys')
      .select('*', { count: 'exact', head: true })
      .eq('stage_completed', 2);

    const { count: totalCouponsIssued } = await supabaseAdmin
      .from('coupons')
      .select('*', { count: 'exact', head: true });

    const { count: totalCouponsUsed } = await supabaseAdmin
      .from('coupons')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'used');

    const { data: allUsedCoupons } = await supabaseAdmin
      .from('coupons')
      .select('amount')
      .eq('status', 'used');

    const totalAmountUsed = allUsedCoupons?.reduce((sum, c) => sum + c.amount, 0) || 0;

    const { count: totalRaffleEntries } = await supabaseAdmin
      .from('raffle_entries')
      .select('*', { count: 'exact', head: true });

    // 예산 정보
    const { data: budgetSetting } = await supabaseAdmin
      .from('settings')
      .select('value')
      .eq('key', 'total_budget')
      .single();

    const totalBudget = parseInt(budgetSetting?.value || '200000');
    const remaining = totalBudget - totalAmountUsed;
    const usageRate = (totalAmountUsed / totalBudget) * 100;

    // 지역별 통계
    const { data: surveysByRegion } = await supabaseAdmin
      .from('surveys')
      .select('q1_region');

    const regionCounts: Record<string, number> = {};
    surveysByRegion?.forEach((s) => {
      regionCounts[s.q1_region] = (regionCounts[s.q1_region] || 0) + 1;
    });

    const byRegion = Object.entries(regionCounts).map(([region, count]) => ({
      region,
      count,
      percentage: (count / (totalSurveys || 1)) * 100,
    }));

    // 날짜별 통계 (최근 7일)
    const dates: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      dates.push(date.toISOString().split('T')[0]);
    }

    const byDate = await Promise.all(
      dates.map(async (date) => {
        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);

        const { count: surveys } = await supabaseAdmin
          .from('surveys')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', date)
          .lt('created_at', nextDate.toISOString().split('T')[0]);

        const { count: couponsUsed } = await supabaseAdmin
          .from('coupons')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'used')
          .gte('used_at', date)
          .lt('used_at', nextDate.toISOString().split('T')[0]);

        return {
          date,
          surveys: surveys || 0,
          coupons_used: couponsUsed || 0,
        };
      })
    );

    const dashboardData: DashboardData = {
      today: {
        surveys: todaySurveys || 0,
        coupons_issued: todayCouponsIssued || 0,
        coupons_used: todayCouponsUsed || 0,
        amount_used: todayAmountUsed,
      },
      total: {
        surveys: totalSurveys || 0,
        surveys_step2: totalSurveysStep2 || 0,
        coupons_issued: totalCouponsIssued || 0,
        coupons_used: totalCouponsUsed || 0,
        amount_used: totalAmountUsed,
        raffle_entries: totalRaffleEntries || 0,
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
      { success: false, message: ERROR_MESSAGES.INTERNAL_ERROR },
      { status: 500 }
    );
  }
}

