'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
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

export function RecentNews() {
    const [notices, setNotices] = useState<RecordModel[]>([]);
    const [selectedNotice, setSelectedNotice] = useState<RecordModel | null>(null);

    useEffect(() => {
        const fetchNotices = async () => {
            try {
                const result = await pb.collection('notices').getList(1, 3, {
                    sort: '-date',
                    requestKey: null, // Disable auto-cancellation
                    $autoCancel: false, // 추가 자동 취소 방지
                });
                console.log("Fetched notices:", result.items.length);
                setNotices(result.items);
            } catch (error) {
                console.error("Failed to fetch notices:", error);
            }
        };

        fetchNotices();
        
        // 주기적으로 데이터 새로고침 (10초마다)
        const interval = setInterval(fetchNotices, 10000);
        return () => clearInterval(interval);
    }, []);

    return (

        <section className="py-24 bg-white text-foreground px-6 md:px-12">
            <div className="container mx-auto">
                <div className="mb-16">
                    <span className="text-accent text-[11px] font-bold tracking-widest uppercase mb-2 block">Press & News</span>
                    <h2 className="text-2xl md:text-3xl font-bold tracking-tight leading-tight text-black">
                        봉황대협동조합의<br />
                        새로운 소식들을 전합니다
                    </h2>
                </div>

                <div className="w-full border-t border-black/10">
                    {/* Header Row - Same structure as data rows for perfect alignment */}
                    <div className="flex flex-nowrap items-center justify-center py-0 border-b border-black/10 text-[13px] font-bold text-muted-foreground uppercase tracking-wider h-[44px]">
                        <div className="flex-1 pl-2 pr-8">
                            <div className="flex flex-col justify-center items-center text-center h-full">제목</div>
                        </div>
                        <div className="flex items-center gap-8 pr-2 shrink-0">
                            <div className="w-24 text-center">작성시간</div>
                        </div>
                    </div>

                    {/* List Items */}
                    <div>
                        {notices.length === 0 ? (
                            <div className="group flex items-center justify-between py-6 border-b border-black/5 h-[44px]">
                                <div className="flex-1 text-[13px] font-medium pl-2 truncate pr-8 text-muted-foreground">
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

                    <div className="flex justify-end mt-8">
                        <Link href="/notices">
                            <Button variant="link" className="text-muted-foreground hover:text-black p-0 h-auto text-[11px] tracking-wide">
                                View All &rarr;
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    );
}
