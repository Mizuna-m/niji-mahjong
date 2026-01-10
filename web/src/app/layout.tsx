import "./globals.css";
import Link from "next/link";
import { softBtnCls } from "@/lib/ui";

export const metadata = {
  title: "にじさんじ麻雀杯ログ",
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
                にじさんじ麻雀杯（作業用）ログ
              </div>
              <div className="text-sm text-zinc-600 dark:text-zinc-400">
                Games / Players / Stats を新APIで表示
              </div>
            </div>

            <nav className="flex flex-wrap gap-2">
              <NavLink href="/" label="Games" />
              <NavLink href="/players" label="Players" />
              <NavLink href="/stats/leaderboard" label="Leaderboard" />
              <NavLink href="/stats/cumulative" label="Cumulative" />
            </nav>
          </header>

          <main className="mt-6">{children}</main>

          <footer className="mt-10 border-t border-black/5 pt-6 text-xs text-zinc-500 dark:border-white/10 dark:text-zinc-500">
            Nijisanji Mahjong API demo frontend
          </footer>
        </div>
      </body>
    </html>
  );
}
