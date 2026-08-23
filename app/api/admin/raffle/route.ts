import { NextRequest, NextResponse } from 'next/server';
import { db, COLLECTIONS } from '@/lib/firebase';
import { ERROR_MESSAGES } from '@/lib/constants';
import { verifyAdminToken } from '@/lib/auth';

// Node.js 런타임 사용
export const runtime = 'nodejs';

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
    const completedSurveysSnap = await db
      .collection(COLLECTIONS.SURVEYS)
      .where('stage_completed', '==', 2)
      .get();

    const completedSurveys = completedSurveysSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    if (completedSurveys.length < 5) {
      return NextResponse.json({
        success: true,
        entries: [],
        total_count: completedSurveys.length,
        message: completedSurveys.length > 0
          ? `현재 ${completedSurveys.length}명의 응답자가 있습니다. 5명 이상이 되어야 추첨이 가능합니다.`
          : '추첨 응모자가 없습니다.',
      });
    }

    // 추첨 응모자 조회 (완료된 설문에 대한 응모만)
    const surveyIds = completedSurveys.map((s) => s.id);

    // Firestore in 쿼리는 최대 30개까지만 지원
    const entriesPromises = [];
    for (let i = 0; i < surveyIds.length; i += 30) {
      const chunk = surveyIds.slice(i, i + 30);
      entriesPromises.push(
        db.collection(COLLECTIONS.RAFFLE_ENTRIES)
          .where('survey_id', 'in', chunk)
          .get()
      );
    }

    const entriesSnapshots = await Promise.all(entriesPromises);
    const entries = entriesSnapshots.flatMap(snap =>
      snap.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          survey_id: data.survey_id as string,
          name: data.name as string,
          phone: data.phone as string,
          agreed_privacy: data.agreed_privacy as boolean,
          created_at: data.created_at?.toDate?.().toISOString() || data.created_at,
        };
      })
    );

    // 추첨 응모를 하지 않은 설문 완료자도 포함하여 표시
    const entriesMap = new Map(entries.map(e => [e.survey_id, e]));
    const allEntries = completedSurveys.map((survey: { id: string; q1_region?: string; created_at?: { toDate?: () => Date } | string }) => {
      const entry = entriesMap.get(survey.id);
      const surveyCreatedAt = typeof survey.created_at === 'object' && survey.created_at?.toDate
        ? survey.created_at.toDate().toISOString()
        : survey.created_at;

      if (entry) {
        return {
          ...entry,
          survey_region: survey.q1_region || '-',
          survey_created_at: surveyCreatedAt,
          has_raffle_entry: true,
        };
      } else {
        return {
          id: null,
          survey_id: survey.id,
          name: '-',
          phone: '-',
          agreed_privacy: false,
          created_at: surveyCreatedAt,
          survey_region: survey.q1_region || '-',
          survey_created_at: surveyCreatedAt,
          has_raffle_entry: false,
        };
      }
    });

    // 실제 추첨 응모한 사람 수
    const raffleEntriesCount = entries.length;

    return NextResponse.json({
      success: true,
      entries: allEntries,
      total_count: allEntries.length,
      eligible_count: completedSurveys.length,
      raffle_entries_count: raffleEntriesCount,
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
    const totalWinners = 7;

    // 2단계 설문 완료자만 조회
    const completedSurveysSnap = await db
      .collection(COLLECTIONS.SURVEYS)
      .where('stage_completed', '==', 2)
      .get();

    const completedSurveys = completedSurveysSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    if (completedSurveys.length < 5) {
      return NextResponse.json(
        {
          success: false,
          message: `추첨 가능한 응답자가 부족합니다. (현재: ${completedSurveys.length}명, 필요: 5명 이상)`,
        },
        { status: 400 }
      );
    }

    // 추첨 응모자 조회
    const surveyIds = completedSurveys.map((s) => s.id);

    const entriesPromises = [];
    for (let i = 0; i < surveyIds.length; i += 30) {
      const chunk = surveyIds.slice(i, i + 30);
      entriesPromises.push(
        db.collection(COLLECTIONS.RAFFLE_ENTRIES)
          .where('survey_id', 'in', chunk)
          .get()
      );
    }

    const entriesSnapshots = await Promise.all(entriesPromises);
    const entries = entriesSnapshots.flatMap(snap =>
      snap.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          survey_id: data.survey_id as string,
          name: data.name as string,
          phone: data.phone as string,
          created_at: data.created_at?.toDate?.().toISOString() || data.created_at,
        };
      })
    );

    if (entries.length === 0) {
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

      for (const entry of selected) {
        const survey = completedSurveys.find((s: { id: string }) => s.id === entry.survey_id) as {
          id: string;
          q1_region?: string;
          created_at?: { toDate?: () => Date } | string
        } | undefined;

        const entryCreatedAt = typeof entry.created_at === 'object' && entry.created_at?.toDate
          ? entry.created_at.toDate().toISOString()
          : entry.created_at;

        winners.push({
          id: entry.id,
          name: entry.name,
          phone: entry.phone,
          survey_region: survey?.q1_region || '-',
          created_at: entryCreatedAt,
          rank: prize.rank,
          amount: prize.amount,
        });
      }
    }

    return NextResponse.json({
      success: true,
      winners,
      total_entries: entries.length,
      selected_count: winners.length,
      total_amount: 60000,
    });
  } catch (error) {
    console.error('Raffle draw error:', error);
    return NextResponse.json(
      { success: false, message: ERROR_MESSAGES.INTERNAL_ERROR },
      { status: 500 }
    );
  }
}
