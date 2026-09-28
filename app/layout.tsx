import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Greybox Arena · 证据暗战",
  description: "五宗案件，九条路线。通过证据互证、图像核对和资源规划赢下调查。 Five fictional cases, nine strategies, one reusable GenLayer evidence adjudicator.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
