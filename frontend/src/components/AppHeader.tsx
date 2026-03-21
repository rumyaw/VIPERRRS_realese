import Image from 'next/image';
import Link from 'next/link';
import ThemeToggle from './theme/ThemeToggle';
import AuthStatus from './AuthStatus';

export default function AppHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-black/5 bg-white/70 backdrop-blur dark:border-white/10 dark:bg-black/40">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-3">
          <Image src="/logo.png" alt="Трамплин" width={34} height={34} className="h-9 w-9" priority />
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold text-black dark:text-white">Трамплин</span>
            <span className="text-xs text-black/55 dark:text-white/55">Карьерная платформа</span>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <AuthStatus />
        </div>
      </div>
    </header>
  );
}
