// API 키 생성 및 관리 유틸리티 - Firebase 버전

import { randomBytes } from 'crypto';
import { db, COLLECTIONS, Timestamp, generateId } from './firebase';

// API 키 형식: brg_{32자리 랜덤 문자열}
export function generateApiKeyString(): string {
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
    const key = generateApiKeyString();
    const keyHash = await hashApiKey(key);
    const keyId = generateId();

    const expiresAt = params.expiresInDays
      ? Timestamp.fromDate(new Date(Date.now() + params.expiresInDays * 24 * 60 * 60 * 1000))
      : null;

    const now = Timestamp.now();

    const keyData = {
      key_hash: keyHash,
      key_prefix: key.substring(0, 8), // 식별용 prefix (brg_xxxx)
      partner_name: params.partnerName,
      partner_contact: params.partnerContact,
      permissions: params.permissions || ['survey', 'coupon'],
      rate_limit: params.rateLimitPerHour || 1000,
      is_active: true,
      created_at: now,
      last_used_at: null,
      expires_at: expiresAt,
    };

    await db.collection(COLLECTIONS.API_KEYS).doc(keyId).set(keyData);

    return {
      key, // 이 키는 한 번만 보여줌 (저장 안 됨)
      keyInfo: {
        id: keyId,
        key_hash: keyHash,
        partner_name: params.partnerName,
        partner_contact: params.partnerContact,
        permissions: params.permissions || ['survey', 'coupon'],
        rate_limit: params.rateLimitPerHour || 1000,
        is_active: true,
        created_at: now.toDate().toISOString(),
        last_used_at: null,
        expires_at: expiresAt ? expiresAt.toDate().toISOString() : null,
      },
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

    const snapshot = await db
      .collection(COLLECTIONS.API_KEYS)
      .where('key_hash', '==', keyHash)
      .where('is_active', '==', true)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    const data = doc.data();

    // 만료 체크
    if (data.expires_at && data.expires_at.toDate() < new Date()) {
      return null;
    }

    // 마지막 사용 시간 업데이트
    await doc.ref.update({ last_used_at: Timestamp.now() });

    return {
      id: doc.id,
      key_hash: data.key_hash,
      partner_name: data.partner_name,
      partner_contact: data.partner_contact,
      permissions: data.permissions,
      rate_limit: data.rate_limit,
      is_active: data.is_active,
      created_at: data.created_at?.toDate?.().toISOString() || data.created_at,
      last_used_at: data.last_used_at?.toDate?.().toISOString() || null,
      expires_at: data.expires_at?.toDate?.().toISOString() || null,
    };
  } catch (error) {
    console.error('Validate API key error:', error);
    return null;
  }
}

// API 키 비활성화
export async function revokeApiKey(keyId: string): Promise<boolean> {
  try {
    await db
      .collection(COLLECTIONS.API_KEYS)
      .doc(keyId)
      .update({ is_active: false });

    return true;
  } catch (error) {
    console.error('Revoke API key error:', error);
    return false;
  }
}

// API 키 목록 조회 (관리자용)
export async function listApiKeys(): Promise<ApiKeyInfo[]> {
  try {
    const snapshot = await db
      .collection(COLLECTIONS.API_KEYS)
      .orderBy('created_at', 'desc')
      .get();

    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        key_hash: data.key_hash,
        partner_name: data.partner_name,
        partner_contact: data.partner_contact,
        permissions: data.permissions,
        rate_limit: data.rate_limit,
        is_active: data.is_active,
        created_at: data.created_at?.toDate?.().toISOString() || data.created_at,
        last_used_at: data.last_used_at?.toDate?.().toISOString() || null,
        expires_at: data.expires_at?.toDate?.().toISOString() || null,
      };
    });
  } catch (error) {
    console.error('List API keys error:', error);
    return [];
  }
}
