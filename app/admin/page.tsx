'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { storage } from '@/lib/utils';

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password) {
      setError('비밀번호를 입력해주세요.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || '로그인에 실패했습니다.');
        setLoading(false);
        return;
      }

      // 토큰 저장
      storage.set('admin_token', data.token);

      // 대시보드로 이동
      router.push('/admin/dashboard');
    } catch (error) {
      console.error('Login error:', error);
      setError('네트워크 오류가 발생했습니다.');
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <Card>
          <div className="text-center space-y-4 mb-8">
            <div className="text-6xl">🔐</div>
            <h1 className="text-3xl font-bold text-textPrimary">
              관리자 로그인
            </h1>
            <p className="text-textSecondary">
              봉리단길 설문조사 시스템
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              label="비밀번호"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              placeholder="관리자 비밀번호를 입력하세요"
              error={error}
              required
            />

            <Button
              type="submit"
              disabled={loading}
              fullWidth
              size="lg"
            >
              {loading ? '로그인 중...' : '로그인'}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-border text-center">
            <Button
              onClick={() => router.push('/')}
              variant="ghost"
              fullWidth
            >
              메인으로 돌아가기
            </Button>
          </div>
        </Card>
      </div>
    </main>
  );
}

