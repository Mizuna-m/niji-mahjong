import "./globals.css";
import Link from "next/link";
import { softBtnCls } from "@/lib/ui";

export const metadata = {
  title: "にじさんじ麻雀杯データベース",
};

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link className={softBtnCls} href={href}>
      {label}
    </Link>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="min-h-dvh bg-gradient-to-b from-zinc-50 to-white text-zinc-900 dark:from-zinc-950 dark:to-zinc-950 dark:text-zinc-100">
        <div className="mx-auto max-w-6xl p-6">
          <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-xl font-semibold tracking-tight">
                にじさんじ麻雀杯2026データベース
              </div>
            </div>

            <nav className="flex flex-wrap gap-2">
              <NavLink href="/" label="対局" />
              <NavLink href="/players" label="参加者" />
              <NavLink href="/ranking" label="予選状況" />
              <NavLink href="/finals" label="決勝状況" />
              <NavLink href="/stats/leaderboard" label="戦績順位" />
            </nav>
          </header>

          <main className="mt-6">{children}</main>

          <footer className="mt-10 border-t border-black/5 pt-6 text-xs text-zinc-500 dark:border-white/10 dark:text-zinc-500">
            <p>Nijisanji Mahjong Cup 2026 Database</p>
            <p>本サービスはデータの可視化を目的としたものであり、集計結果は不正確な場合があります。公式の情報を参照してください。</p>
            <p>つくった人: <Link href="https://x.com/Mizuna_c">@Mizuna_c</Link></p>
          </footer>
        </div>
      </body>
    </html>
  );
}
