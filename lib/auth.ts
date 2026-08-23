// 인증 헬퍼 함수 (JWT + bcrypt) - Firebase 버전

import { NextRequest } from 'next/server';
import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { db, COLLECTIONS, Timestamp } from './firebase';

// JWT 시크릿 키 (환경변수에서 가져오거나 기본값 사용)
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'bongridan-survey-secret-key-change-in-production'
);

// JWT 만료 시간 (24시간)
const JWT_EXPIRES_IN = '24h';

// JWT 토큰 생성
export async function generateAdminToken(): Promise<string> {
  const token = await new SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRES_IN)
    .sign(JWT_SECRET);

  return token;
}

// 관리자 토큰 검증 (JWT)
export async function verifyAdminToken(request: NextRequest): Promise<boolean> {
  try {
    // Authorization 헤더에서 토큰 가져오기
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '') ||
                  request.headers.get('x-admin-token') ||
                  request.nextUrl.searchParams.get('token');

    if (!token) {
      return false;
    }

    try {
      // JWT 검증
      const { payload } = await jwtVerify(token, JWT_SECRET);

      // role이 admin인지 확인
      if (payload.role !== 'admin') {
        return false;
      }

      return true;
    } catch (error) {
      // JWT 검증 실패 (만료, 변조 등)
      console.error('JWT verification error:', error);
      return false;
    }
  } catch {
    return false;
  }
}

// 비밀번호 해싱
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

// 관리자 비밀번호 확인 (bcrypt) - Firebase 버전
export async function verifyAdminPassword(password: string): Promise<boolean> {
  try {
    const settingDoc = await db
      .collection(COLLECTIONS.SETTINGS)
      .doc('admin_password')
      .get();

    if (!settingDoc.exists) {
      return false;
    }

    const storedPassword = settingDoc.data()?.value;

    if (!storedPassword) {
      return false;
    }

    // 기존 평문 비밀번호 호환성 유지 (해시가 아닌 경우)
    // bcrypt 해시는 '$2a$' 또는 '$2b$'로 시작
    if (!storedPassword.startsWith('$2a$') && !storedPassword.startsWith('$2b$')) {
      // 평문 비밀번호인 경우 - 레거시 호환
      if (password === storedPassword) {
        // 로그인 성공 시 비밀번호를 해시로 자동 업그레이드
        const hashedPassword = await hashPassword(password);
        await db
          .collection(COLLECTIONS.SETTINGS)
          .doc('admin_password')
          .set({
            value: hashedPassword,
            updated_at: Timestamp.now(),
          }, { merge: true });

        console.log('Admin password automatically upgraded to bcrypt hash');
        return true;
      }
      return false;
    }

    // bcrypt로 비밀번호 비교
    return bcrypt.compare(password, storedPassword);
  } catch (error) {
    console.error('Password verification error:', error);
    return false;
  }
}

// 비밀번호 변경
export async function changeAdminPassword(newPassword: string): Promise<boolean> {
  try {
    const hashedPassword = await hashPassword(newPassword);

    await db
      .collection(COLLECTIONS.SETTINGS)
      .doc('admin_password')
      .set({
        value: hashedPassword,
        updated_at: Timestamp.now(),
      }, { merge: true });

    return true;
  } catch (error) {
    console.error('Password change error:', error);
    return false;
  }
}
