import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    // 환경 변수 확인
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
    
    const envCheck = {
      hasUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
      urlPreview: supabaseUrl ? `${supabaseUrl.substring(0, 20)}...` : '없음',
      serviceKeyPreview: supabaseServiceKey ? `${supabaseServiceKey.substring(0, 20)}...` : '없음',
    };

    // 테이블 목록 확인
    const { data: tables, error: tablesError } = await supabaseAdmin
      .from('settings')
      .select('key, value')
      .limit(10);

    // stores 테이블 확인
    const { data: stores, error: storesError } = await supabaseAdmin
      .from('stores')
      .select('id, name')
      .limit(5);

    // surveys 테이블 확인
    const { count: surveysCount, error: surveysError } = await supabaseAdmin
      .from('surveys')
      .select('*', { count: 'exact', head: true });

    // coupons 테이블 확인
    const { count: couponsCount, error: couponsError } = await supabaseAdmin
      .from('coupons')
      .select('*', { count: 'exact', head: true });

    return NextResponse.json({
      success: true,
      environment: envCheck,
      database: {
        settings: {
          connected: !tablesError,
          error: tablesError?.message || null,
          data: tables || [],
          count: tables?.length || 0,
        },
        stores: {
          connected: !storesError,
          error: storesError?.message || null,
          data: stores || [],
          count: stores?.length || 0,
        },
        surveys: {
          connected: !surveysError,
          error: surveysError?.message || null,
          count: surveysCount || 0,
        },
        coupons: {
          connected: !couponsError,
          error: couponsError?.message || null,
          count: couponsCount || 0,
        },
      },
    });
  } catch (error) {
    console.error('Database test error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '알 수 없는 오류',
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}



