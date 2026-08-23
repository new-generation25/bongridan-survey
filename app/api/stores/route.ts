import { NextResponse } from 'next/server';
import { db, COLLECTIONS } from '@/lib/firebase';
import { ERROR_MESSAGES } from '@/lib/constants';

// Node.js 런타임 사용
export const runtime = 'nodejs';

export async function GET() {
  try {
    const snapshot = await db
      .collection(COLLECTIONS.STORES)
      .where('is_active', '==', true)
      .orderBy('name')
      .get();

    const stores = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

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
