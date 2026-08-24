import { NextResponse } from 'next/server';
import { db, COLLECTIONS } from '@/lib/firebase';
import { ERROR_MESSAGES } from '@/lib/constants';

// Node.js 런타임 사용
export const runtime = 'nodejs';

export async function GET() {
  try {
    // Firestore 복합 인덱스 없이 조회 (클라이언트 정렬)
    const snapshot = await db
      .collection(COLLECTIONS.STORES)
      .where('is_active', '==', true)
      .get();

    const stores = snapshot.docs
      .map(doc => ({
        id: doc.id,
        name: doc.data().name as string,
        ...doc.data(),
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'ko'));

    return NextResponse.json({
      success: true,
      stores,
    });
  } catch (error) {
    console.error('Get stores error:', error);
    return NextResponse.json(
      { success: false, message: ERROR_MESSAGES.INTERNAL_ERROR },
      { status: 500 }
    );
  }
}
