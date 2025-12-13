import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { ERROR_MESSAGES } from '@/lib/constants';
import { verifyAdminToken } from '@/lib/auth';

// GET: 추첨 응모자 목록 조회 (2단계 설문 완료자만, 5개 이상)
export async function GET(request: NextRequest) {
  try {
    const isAuthenticated = await verifyAdminToken(request);
    if (!isAuthenticated) {
      return NextResponse.json(
        { success: false, message: ERROR_MESSAGES.UNAUTHORIZED },
        { status: 401 }
      );
    }

    // 2단계 설문 완료자만 조회 (stage_completed = 2)
    const { data: completedSurveys, error: surveysError } = await supabaseAdmin
      .from('surveys')
      .select('id, q1_region, created_at')
      .eq('stage_completed', 2);

    if (surveysError) {
      console.error('Get completed surveys error:', surveysError);
      return NextResponse.json(
        { success: false, message: ERROR_MESSAGES.INTERNAL_ERROR },
        { status: 500 }
      );
    }

    if (!completedSurveys || completedSurveys.length < 5) {
      return NextResponse.json({
        success: true,
        entries: [],
        total_count: completedSurveys?.length || 0,
        message: completedSurveys && completedSurveys.length > 0
          ? `현재 ${completedSurveys.length}명의 응답자가 있습니다. 5명 이상이 되어야 추첨이 가능합니다.`
          : '추첨 응모자가 없습니다.',
      });
    }

    // 추첨 응모자 조회 (완료된 설문에 대한 응모만)
    const surveyIds = completedSurveys.map((s) => s.id);
    const { data: entries, error: entriesError } = await supabaseAdmin
      .from('raffle_entries')
      .select('*')
      .in('survey_id', surveyIds)
      .order('created_at', { ascending: false });

    if (entriesError) {
      console.error('Get raffle entries error:', entriesError);
      return NextResponse.json(
        { success: false, message: ERROR_MESSAGES.INTERNAL_ERROR },
        { status: 500 }
      );
    }

    // 설문 정보와 결합
    const entriesWithSurvey = (entries || []).map((entry) => {
      const survey = completedSurveys.find((s) => s.id === entry.survey_id);
      return {
        ...entry,
        survey_region: survey?.q1_region || '-',
        survey_created_at: survey?.created_at || entry.created_at,
      };
    });

    return NextResponse.json({
      success: true,
      entries: entriesWithSurvey,
      total_count: entriesWithSurvey.length,
      eligible_count: completedSurveys.length,
    });
  } catch (error) {
    console.error('Get raffle entries error:', error);
    return NextResponse.json(
      { success: false, message: ERROR_MESSAGES.INTERNAL_ERROR },
      { status: 500 }
    );
  }
}

// POST: 랜덤 추첨 실행
export async function POST(request: NextRequest) {
  try {
    const isAuthenticated = await verifyAdminToken(request);
    if (!isAuthenticated) {
      return NextResponse.json(
        { success: false, message: ERROR_MESSAGES.UNAUTHORIZED },
        { status: 401 }
      );
    }

    // 등급별 상금 설정: 1등(2만원) 1명, 2등(1만원) 2명, 3등(5천원) 4명
    const prizeStructure = [
      { rank: 1, amount: 20000, count: 1 },
      { rank: 2, amount: 10000, count: 2 },
      { rank: 3, amount: 5000, count: 4 },
    ];
    const totalWinners = 7; // 총 7명

    // 2단계 설문 완료자만 조회
    const { data: completedSurveys, error: surveysError } = await supabaseAdmin
      .from('surveys')
      .select('id')
      .eq('stage_completed', 2);

    if (surveysError) {
      console.error('Get completed surveys error:', surveysError);
      return NextResponse.json(
        { success: false, message: ERROR_MESSAGES.INTERNAL_ERROR },
        { status: 500 }
      );
    }

    if (!completedSurveys || completedSurveys.length < 5) {
      return NextResponse.json(
        {
          success: false,
          message: `추첨 가능한 응답자가 부족합니다. (현재: ${completedSurveys?.length || 0}명, 필요: 5명 이상)`,
        },
        { status: 400 }
      );
    }

    // 추첨 응모자 조회
    const surveyIds = completedSurveys.map((s) => s.id);
    const { data: entries, error: entriesError } = await supabaseAdmin
      .from('raffle_entries')
      .select('*')
      .in('survey_id', surveyIds);

    if (entriesError) {
      console.error('Get raffle entries error:', entriesError);
      return NextResponse.json(
        { success: false, message: ERROR_MESSAGES.INTERNAL_ERROR },
        { status: 500 }
      );
    }

    if (!entries || entries.length === 0) {
      return NextResponse.json(
        { success: false, message: '추첨 응모자가 없습니다.' },
        { status: 400 }
      );
    }

    if (entries.length < totalWinners) {
      return NextResponse.json(
        {
          success: false,
          message: `추첨 응모자가 부족합니다. (현재: ${entries.length}명, 필요: ${totalWinners}명 이상)`,
        },
        { status: 400 }
      );
    }

    // 랜덤 추첨 (Fisher-Yates 셔플 알고리즘)
    const shuffled = [...entries];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // 등급별로 선정
    let currentIndex = 0;
    const winners: Array<{
      id: string;
      name: string;
      phone: string;
      survey_region: string;
      created_at: string;
      rank: number;
      amount: number;
    }> = [];

    for (const prize of prizeStructure) {
      const selected = shuffled.slice(currentIndex, currentIndex + prize.count);
      currentIndex += prize.count;

      // 설문 정보 조회
      const selectedSurveyIds = selected.map((e) => e.survey_id);
      const { data: surveys } = await supabaseAdmin
        .from('surveys')
        .select('id, q1_region, created_at')
        .in('id', selectedSurveyIds);

      selected.forEach((entry) => {
        const survey = surveys?.find((s) => s.id === entry.survey_id);
        winners.push({
          id: entry.id,
          name: entry.name,
          phone: entry.phone,
          survey_region: survey?.q1_region || '-',
          created_at: entry.created_at,
          rank: prize.rank,
          amount: prize.amount,
        });
      });
    }

    return NextResponse.json({
      success: true,
      winners,
      total_entries: entries.length,
      selected_count: winners.length,
      total_amount: 60000, // 총 6만원
    });
  } catch (error) {
    console.error('Raffle draw error:', error);
    return NextResponse.json(
      { success: false, message: ERROR_MESSAGES.INTERNAL_ERROR },
      { status: 500 }
    );
  }
}

