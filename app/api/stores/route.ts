import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { ERROR_MESSAGES } from '@/lib/constants';

export async function GET() {
  try {
    const { data: stores, error } = await supabase
      .from('stores')
      .select('id, name, is_active')
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('Get stores error:', error);
      return NextResponse.json(
        { success: false, message: ERROR_MESSAGES.INTERNAL_ERROR },
        { status: 500 }
      );
    }

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

