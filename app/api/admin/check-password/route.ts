import { NextRequest, NextResponse } from 'next/server';
import { db, COLLECTIONS } from '@/lib/firebase';

// Node.js 런타임 사용
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    // 설정에서 관리자 비밀번호 가져오기
    const settingDoc = await db
      .collection(COLLECTIONS.SETTINGS)
      .doc('admin_password')
      .get();

    if (!settingDoc.exists) {
      console.error('Admin password setting not found');
      return NextResponse.json(
        { success: false, message: '비밀번호를 가져올 수 없습니다.' },
        { status: 500 }
      );
    }

    const setting = settingDoc.data();
    const isDefaultPassword = setting?.value === 'change_this_password_in_production';

    return NextResponse.json({
      success: true,
      isDefaultPassword,
      status: isDefaultPassword
        ? '⚠️ 초기 비밀번호입니다. 변경이 필요합니다.'
        : '✅ 비밀번호가 변경되었습니다.',
    });
  } catch (error) {
    console.error('Check password error:', error);
    return NextResponse.json(
      { success: false, message: '확인 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
