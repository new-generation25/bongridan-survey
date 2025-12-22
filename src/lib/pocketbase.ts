import PocketBase from 'pocketbase';

const pb = new PocketBase(process.env.NEXT_PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8090');

// 자동 취소 비활성화
pb.autoCancellation(false);

// 캐시 비활성화를 위한 beforeSend 훅
pb.beforeSend = function (url, options) {
    options.cache = 'no-store';
    options.headers = {
        ...options.headers,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
    };
    return { url, options };
};

export default pb;
