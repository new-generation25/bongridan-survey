'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import { Button } from '@/components/ui/button';
import { 
    Bold, 
    Italic, 
    Underline as UnderlineIcon, 
    Strikethrough,
    List,
    ListOrdered,
    Link as LinkIcon,
    Image as ImageIcon,
    Undo,
    Redo,
    FileText
} from 'lucide-react';
import { useCallback, useRef, useEffect, useState } from 'react';
import pb from '@/lib/pocketbase';

interface RichTextEditorProps {
    content: string;
    onChange: (content: string) => void;
    placeholder?: string;
}

// Extensions를 컴포넌트 외부에서 정의하여 한 번만 생성
const createExtensions = (placeholder: string) => [
    StarterKit.configure({
        heading: {
            levels: [1, 2, 3],
        },
    }),
    Image.configure({
        inline: true,
        allowBase64: true,
    }),
    Link.configure({
        openOnClick: false,
        HTMLAttributes: {
            class: 'text-blue-600 underline',
        },
    }),
    Placeholder.configure({
        placeholder,
    }),
    Underline,
];

export function RichTextEditor({ content, onChange, placeholder = '내용을 입력하세요...' }: RichTextEditorProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const [isMounted, setIsMounted] = useState(false);
    const extensionsRef = useRef(createExtensions(placeholder));

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const editor = useEditor({
        extensions: extensionsRef.current,
        content,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
        editorProps: {
            attributes: {
                class: 'prose prose-sm max-w-none focus:outline-none min-h-[300px] p-4',
            },
        },
        immediatelyRender: false,
        shouldRerenderOnTransaction: false,
    });

    // content가 외부에서 변경될 때 에디터 업데이트
    useEffect(() => {
        if (editor && content !== editor.getHTML()) {
            editor.commands.setContent(content);
        }
    }, [content, editor]);

    const handleImageUpload = useCallback(async () => {
        const input = imageInputRef.current;
        if (!input) return;

        input.click();
    }, []);

    const handleImageFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !editor) return;

        // 이미지 파일만 허용
        if (!file.type.startsWith('image/')) {
            alert('이미지 파일만 업로드할 수 있습니다.');
            return;
        }

        // 파일 크기 제한 (5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('이미지 크기는 5MB 이하여야 합니다.');
            return;
        }

        try {
            // PocketBase에 파일 업로드
            const formData = new FormData();
            formData.append('file', file);

            // 임시 컬렉션에 업로드하거나, 직접 파일 URL 생성
            // 여기서는 간단하게 base64로 변환하여 사용하거나
            // PocketBase의 파일 업로드 API를 사용할 수 있습니다.
            // 실제 프로덕션에서는 서버 API를 통해 업로드하는 것이 좋습니다.
            
            // Base64로 변환하여 임시로 사용
            const reader = new FileReader();
            reader.onload = (event) => {
                const base64 = event.target?.result as string;
                if (base64 && editor) {
                    editor.chain().focus().setImage({ src: base64 }).run();
                }
            };
            reader.readAsDataURL(file);

            // 또는 PocketBase 파일 업로드를 사용하려면:
            // const record = await pb.collection('files').create(formData);
            // const imageUrl = pb.files.getUrl(record, record.file);
            // editor.chain().focus().setImage({ src: imageUrl }).run();
        } catch (error) {
            console.error('이미지 업로드 실패:', error);
            alert('이미지 업로드에 실패했습니다.');
        }

        // input 초기화
        if (e.target) {
            (e.target as HTMLInputElement).value = '';
        }
    }, [editor]);

    const handleFileUpload = useCallback(async () => {
        const input = fileInputRef.current;
        if (!input) return;

        input.click();
    }, []);

    const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !editor) return;

        try {
            // 파일을 PocketBase에 업로드
            const formData = new FormData();
            formData.append('file', file);

            // 임시로 파일명을 링크로 삽입
            // 실제로는 파일을 업로드하고 다운로드 링크를 생성해야 합니다
            const fileName = file.name;
            const fileSize = (file.size / 1024).toFixed(2); // KB
            
            // 에디터에 파일 링크 삽입
            editor.chain().focus().insertContent(
                `<p><a href="#" download="${fileName}">📎 ${fileName} (${fileSize} KB)</a></p>`
            ).run();
        } catch (error) {
            console.error('파일 업로드 실패:', error);
            alert('파일 업로드에 실패했습니다.');
        }

        // input 초기화
        if (e.target) {
            (e.target as HTMLInputElement).value = '';
        }
    }, [editor]);

    const setLink = useCallback(() => {
        if (!editor) return;

        const previousUrl = editor.getAttributes('link').href;
        const url = window.prompt('링크 URL을 입력하세요:', previousUrl);

        if (url === null) {
            return;
        }

        if (url === '') {
            editor.chain().focus().extendMarkRange('link').unsetLink().run();
            return;
        }

        editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }, [editor]);

    if (!isMounted || !editor) {
        return (
            <div className="border rounded-lg overflow-hidden">
                <div className="border-b bg-gray-50 p-2 flex flex-wrap items-center gap-2">
                    <div className="text-sm text-muted-foreground">에디터를 불러오는 중...</div>
                </div>
                <div className="bg-white min-h-[300px] p-4">
                    <div className="text-muted-foreground">로딩 중...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="border rounded-lg overflow-hidden">
            {/* 툴바 */}
            <div className="border-b bg-gray-50 p-2 flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 border-r pr-2">
                    <Button
                        type="button"
                        variant={editor.isActive('bold') ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => editor.chain().focus().toggleBold().run()}
                    >
                        <Bold className="h-4 w-4" />
                    </Button>
                    <Button
                        type="button"
                        variant={editor.isActive('italic') ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => editor.chain().focus().toggleItalic().run()}
                    >
                        <Italic className="h-4 w-4" />
                    </Button>
                    <Button
                        type="button"
                        variant={editor.isActive('underline') ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => editor.chain().focus().toggleUnderline().run()}
                    >
                        <UnderlineIcon className="h-4 w-4" />
                    </Button>
                    <Button
                        type="button"
                        variant={editor.isActive('strike') ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => editor.chain().focus().toggleStrike().run()}
                    >
                        <Strikethrough className="h-4 w-4" />
                    </Button>
                </div>

                <div className="flex items-center gap-1 border-r pr-2">
                    <Button
                        type="button"
                        variant={editor.isActive('heading', { level: 1 }) ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                    >
                        H1
                    </Button>
                    <Button
                        type="button"
                        variant={editor.isActive('heading', { level: 2 }) ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    >
                        H2
                    </Button>
                    <Button
                        type="button"
                        variant={editor.isActive('heading', { level: 3 }) ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                    >
                        H3
                    </Button>
                </div>

                <div className="flex items-center gap-1 border-r pr-2">
                    <Button
                        type="button"
                        variant={editor.isActive('bulletList') ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => editor.chain().focus().toggleBulletList().run()}
                    >
                        <List className="h-4 w-4" />
                    </Button>
                    <Button
                        type="button"
                        variant={editor.isActive('orderedList') ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    >
                        <ListOrdered className="h-4 w-4" />
                    </Button>
                </div>

                <div className="flex items-center gap-1 border-r pr-2">
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={setLink}
                    >
                        <LinkIcon className="h-4 w-4" />
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleImageUpload}
                    >
                        <ImageIcon className="h-4 w-4" />
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleFileUpload}
                    >
                        <FileText className="h-4 w-4" />
                    </Button>
                </div>

                <div className="flex items-center gap-1">
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => editor.chain().focus().undo().run()}
                        disabled={!editor.can().undo()}
                    >
                        <Undo className="h-4 w-4" />
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => editor.chain().focus().redo().run()}
                        disabled={!editor.can().redo()}
                    >
                        <Redo className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* 에디터 영역 */}
            <div className="bg-white">
                <EditorContent editor={editor} />
            </div>

            {/* 숨겨진 파일 입력 */}
            <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageFileChange}
            />
            <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileChange}
            />
        </div>
    );
}

