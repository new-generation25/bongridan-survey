// API 키 생성 및 관리 유틸리티

import { randomBytes } from 'crypto';
import { supabaseAdmin } from './supabase';

// API 키 형식: brg_{32자리 랜덤 문자열}
export function generateApiKey(): string {
  const prefix = 'brg';
  const randomPart = randomBytes(24).toString('base64url'); // URL-safe base64
  return `${prefix}_${randomPart}`;
}

// API 키 정보 타입
export interface ApiKeyInfo {
  id: string;
  key_hash: string;
  partner_name: string;
  partner_contact: string;
  permissions: string[];
  rate_limit: number;
  is_active: boolean;
  created_at: string;
  last_used_at: string | null;
  expires_at: string | null;
}

// API 키 해싱 (저장용)
export async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// API 키 생성 및 DB 저장
export async function createApiKey(params: {
  partnerName: string;
  partnerContact: string;
  permissions?: string[];
  rateLimitPerHour?: number;
  expiresInDays?: number;
}): Promise<{ key: string; keyInfo: ApiKeyInfo } | null> {
  try {
    const key = generateApiKey();
    const keyHash = await hashApiKey(key);

    const expiresAt = params.expiresInDays
      ? new Date(Date.now() + params.expiresInDays * 24 * 60 * 60 * 1000).toISOString()
      : null;

    const { data, error } = await supabaseAdmin
      .from('api_keys')
      .insert({
        key_hash: keyHash,
        key_prefix: key.substring(0, 8), // 식별용 prefix (brg_xxxx)
        partner_name: params.partnerName,
        partner_contact: params.partnerContact,
        permissions: params.permissions || ['survey', 'coupon'],
        rate_limit: params.rateLimitPerHour || 1000,
        is_active: true,
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (error) {
      console.error('Create API key error:', error);
      return null;
    }

    return {
      key, // 이 키는 한 번만 보여줌 (저장 안 됨)
      keyInfo: data,
    };
  } catch (error) {
    console.error('Create API key error:', error);
    return null;
  }
}

// API 키 검증 (DB 기반)
export async function validateApiKeyFromDB(key: string): Promise<ApiKeyInfo | null> {
  try {
    if (!key || !key.startsWith('brg_')) {
      return null;
    }

    const keyHash = await hashApiKey(key);

    const { data, error } = await supabaseAdmin
      .from('api_keys')
      .select('*')
      .eq('key_hash', keyHash)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      return null;
    }

    // 만료 체크
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return null;
    }

    // 마지막 사용 시간 업데이트
    await supabaseAdmin
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', data.id);

    return data;
  } catch (error) {
    console.error('Validate API key error:', error);
    return null;
  }
}

// API 키 비활성화
export async function revokeApiKey(keyId: string): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from('api_keys')
      .update({ is_active: false })
      .eq('id', keyId);

    return !error;
  } catch (error) {
    console.error('Revoke API key error:', error);
    return false;
  }
}

// API 키 목록 조회 (관리자용)
export async function listApiKeys(): Promise<ApiKeyInfo[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('api_keys')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('List API keys error:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('List API keys error:', error);
    return [];
  }
}
