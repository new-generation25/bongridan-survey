'use client';

import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

export default function QRInfoPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <div className="text-center space-y-6 py-8">
            <div className="text-6xl">📱</div>
            
            <div className="space-y-3">
              <h1 className="text-2xl font-bold text-textPrimary">
                쿠폰 사용 안내
              </h1>
              <p className="text-lg text-textSecondary">
                이 쿠폰은 가맹점에서만 사용할 수 있습니다
              </p>
            </div>

            <div className="bg-primary bg-opacity-10 rounded-xl p-6 space-y-4">
              <p className="text-primary font-semibold text-lg">
                💡 쿠폰 사용 방법
              </p>
              <div className="text-left space-y-2 text-sm text-textSecondary">
                <p>1. 가맹점에 방문하세요</p>
                <p>2. 계산 시 이 화면을 보여주세요</p>
                <p>3. 점원이 전용 앱으로 QR 코드를 스캔합니다</p>
                <p>4. 할인이 자동으로 적용됩니다</p>
              </div>
            </div>

            <div className="bg-warning bg-opacity-10 rounded-xl p-6 space-y-2">
              <p className="text-warning font-semibold">
                ⚠️ 중요 안내
              </p>
              <p className="text-sm text-textSecondary">
                쿠폰 사용을 위해서는 가맹점의 전용 스캔 앱이 필요합니다.<br/>
                일반 카메라 앱으로는 사용할 수 없습니다.
              </p>
            </div>

            <div className="space-y-3 pt-4">
              <Button
                onClick={() => router.push('/stores')}
                fullWidth
                size="lg"
              >
                가맹점 목록 보기
              </Button>
              
              <Button
                onClick={() => router.push('/')}
                variant="outline"
                fullWidth
              >
                처음으로
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </main>
  );
}

