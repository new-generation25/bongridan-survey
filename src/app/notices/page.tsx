'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import pb from '@/lib/pocketbase';
import { RecordModel } from 'pocketbase';

// 날짜 포맷 함수 (서버/클라이언트 일관성 유지)
function formatDate(dateString: string | Date): string {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${month}/${day}/${year}`;
}

export default function NoticesPage() {
    const [notices, setNotices] = useState<RecordModel[]>([]);
    const [selectedNotice, setSelectedNotice] = useState<RecordModel | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchNotices = async () => {
            try {
                const result = await pb.collection('notices').getList(1, 100, {
                    sort: '-date',
                    requestKey: null,
                });
                setNotices(result.items);
            } catch (error) {
                console.error("Failed to fetch notices:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchNotices();
        
        // 주기적으로 데이터 새로고침 (10초마다)
        const interval = setInterval(fetchNotices, 10000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="pt-32 pb-24 px-6 md:px-12 min-h-screen bg-white">
            <div className="container mx-auto">
                {/* 헤더 및 뒤로가기 */}
                <div className="mb-16">
                    <Link href="/">
                        <Button variant="link" className="pl-0 mb-8 text-muted-foreground hover:text-foreground">
                            &larr; Back to Home
                        </Button>
                    </Link>
                    <div>
                        <span className="text-accent text-[11px] font-bold tracking-widest uppercase mb-2 block">Press & News</span>
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight leading-tight text-black">
                            봉황대협동조합의<br />
                            새로운 소식들을 전합니다
                        </h1>
                    </div>
                </div>

                {/* 게시판 테이블 */}
                <div className="w-full border-t border-black/10">
                    {/* Header Row */}
                    <div className="flex flex-nowrap items-center justify-center py-0 border-b border-black/10 text-[11px] font-bold text-muted-foreground uppercase tracking-wider h-[44px]">
                        <div className="flex-1 pl-2 pr-8">
                            <div className="flex flex-col justify-center items-center text-center h-full">제목</div>
                        </div>
                        <div className="flex items-center gap-8 pr-2 shrink-0">
                            <div className="w-24 text-center">작성시간</div>
                        </div>
                    </div>

                    {/* List Items */}
                    <div>
                        {loading ? (
                            <div className="group flex items-center justify-between py-6 border-b border-black/5 h-[44px]">
                                <div className="flex-1 text-[11px] font-medium pl-2 pr-8 text-muted-foreground text-center">
                                    로딩 중...
                                </div>
                            </div>
                        ) : notices.length === 0 ? (
                            <div className="group flex items-center justify-between py-6 border-b border-black/5 h-[44px]">
                                <div className="flex-1 text-[11px] font-medium pl-2 truncate pr-8 text-muted-foreground">
                                    등록된 공지사항이 없습니다.
                                </div>
                                <div className="flex items-center gap-8 pr-2 shrink-0">
                                    <div className="w-24 text-center text-[11px] text-muted-foreground whitespace-nowrap">
                                        -
                                    </div>
                                </div>
                            </div>
                        ) : (
                            notices.map((notice) => (
                                <Dialog key={notice.id}>
                                    <DialogTrigger asChild>
                                        <div
                                            className="group flex items-center justify-between py-6 border-b border-black/5 cursor-pointer hover:bg-white/50 transition-colors h-[44px]"
                                            onClick={() => setSelectedNotice(notice)}
                                        >
                                            <div className="flex-1 text-[13px] font-medium pl-2 truncate pr-8 text-foreground group-hover:text-accent transition-colors">
                                                {notice.title}
                                            </div>
                                            <div className="flex items-center gap-8 pr-2 shrink-0">
                                                <div className="w-24 text-center text-[13px] text-muted-foreground whitespace-nowrap">
                                                    {formatDate(notice.date)}
                                                </div>
                                            </div>
                                        </div>
                                    </DialogTrigger>
                                    <DialogContent className="bg-white border-none shadow-lg sm:max-w-2xl">
                                        <DialogHeader>
                                            <DialogTitle className="text-xl font-bold mb-2">{notice.title}</DialogTitle>
                                            <DialogDescription className="sr-only">
                                                {notice.title} - 공지사항 상세 내용
                                            </DialogDescription>
                                        </DialogHeader>
                                        <div className="mt-4 text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                                            <p className="font-medium text-xs text-accent mb-4">
                                                {formatDate(notice.date)}
                                            </p>
                                            <div dangerouslySetInnerHTML={{ __html: notice.content }} />
                                        </div>
                                    </DialogContent>
                                </Dialog>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

