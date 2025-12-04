export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
      <div className="max-w-2xl w-full space-y-8 text-center">
        <h1 className="text-4xl font-bold text-textPrimary">
          봉리단길 방문객 설문조사
        </h1>
        <p className="text-xl text-textSecondary">
          설문에 참여하시고 500원 할인 쿠폰을 받아가세요!
        </p>
        <div className="flex flex-col gap-4 mt-8">
          <a
            href="/survey/step1"
            className="bg-primary text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-600 transition-colors"
          >
            설문 시작하기
          </a>
          <a
            href="/stores"
            className="text-primary hover:underline"
          >
            가맹점 목록 보기
          </a>
        </div>
      </div>
    </main>
  );
}

