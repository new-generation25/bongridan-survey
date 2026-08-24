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

    // 외부 응답에서 민감 정보 제외 (total_settled, created_at)
    const stores = snapshot.docs
      .map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name as string,
          is_active: data.is_active as boolean,
          // category, address, image_url은 데이터에 있으면 포함
          ...(data.category && { category: data.category }),
          ...(data.address && { address: data.address }),
          ...(data.image_url && { image_url: data.image_url }),
        };
      })
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
