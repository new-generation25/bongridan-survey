// 유틸리티 함수들

import { type ClassValue, clsx } from 'clsx';

// Tailwind CSS 클래스 병합
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

// 디바이스 ID 생성 또는 가져오기
export function getDeviceId(): string {
  if (typeof window === 'undefined') return '';
  
  const DEVICE_ID_KEY = 'survey_device_id';
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  
  if (!deviceId) {
    deviceId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  
  return deviceId;
}

// 날짜 포맷팅
export function formatDate(date: string | Date, format: 'date' | 'datetime' | 'time' = 'date'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  
  switch (format) {
    case 'datetime':
      return `${year}-${month}-${day} ${hours}:${minutes}`;
    case 'time':
      return `${hours}:${minutes}`;
    case 'date':
    default:
      return `${year}-${month}-${day}`;
  }
}

// 숫자 포맷팅 (천단위 콤마)
export function formatNumber(num: number): string {
  return num.toLocaleString('ko-KR');
}

// 금액 포맷팅
export function formatCurrency(amount: number): string {
  return `${formatNumber(amount)}원`;
}

// 퍼센트 포맷팅
export function formatPercent(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

// 로컬 스토리지 헬퍼
export const storage = {
  get<T>(key: string): T | null {
    if (typeof window === 'undefined') return null;
    try {
      const item = localStorage.getItem(key);
      if (!item) return null;
      
      // 문자열인 경우 따옴표 제거
      if (item.startsWith('"') && item.endsWith('"')) {
        return JSON.parse(item) as T;
      }
      
      // JSON 파싱 시도
      try {
        return JSON.parse(item) as T;
      } catch {
        // JSON이 아니면 문자열로 반환
        return item as T;
      }
    } catch {
      return null;
    }
  },
  
  set<T>(key: string, value: T): void {
    if (typeof window === 'undefined') return;
    try {
      // 문자열인 경우 따옴표 없이 저장
      if (typeof value === 'string') {
        localStorage.setItem(key, value);
      } else {
        localStorage.setItem(key, JSON.stringify(value));
      }
    } catch (error) {
      console.error('Storage set error:', error);
    }
  },
  
  remove(key: string): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(key);
  },
  
  clear(): void {
    if (typeof window === 'undefined') return;
    localStorage.clear();
  }
};

// 쿠키 헬퍼
export const cookies = {
  get(name: string): string | null {
    if (typeof document === 'undefined') return null;
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
    return null;
  },
  
  set(name: string, value: string, days: number = 365): void {
    if (typeof document === 'undefined') return;
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    const expires = `expires=${date.toUTCString()}`;
    document.cookie = `${name}=${value};${expires};path=/`;
  },
  
  remove(name: string): void {
    if (typeof document === 'undefined') return;
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
  }
};

// 디바운스
export function debounce<T extends (...args: Parameters<T>) => ReturnType<T>>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// 배열을 청크로 나누기
export function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

// 객체에서 빈 값 제거
export function removeEmptyValues<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.entries(obj).reduce((acc, [key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      acc[key as keyof T] = value as T[keyof T];
    }
    return acc;
  }, {} as Partial<T>);
}

