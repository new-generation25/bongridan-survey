import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "봉리단길 방문객 설문조사",
  description: "봉리단길 방문객 소비행태 조사 시스템",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}

