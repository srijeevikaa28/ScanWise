import Link from 'next/link';
import { Icons } from '@/components/icons';
import { Button } from '../ui/button';
import { ThemeToggle } from '../theme-toggle';

export default function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/60 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <Link href="/" className="mr-6 flex items-center space-x-2">
          <Icons.logo className="h-6 w-6 text-primary" />
          <span className="font-bold sm:inline-block text-primary">
            ScanWise
          </span>
        </Link>
        <nav className="flex items-center gap-6 text-sm flex-1">
          <Link
            href="/#features"
            className="transition-colors hover:text-foreground/80 text-foreground/60"
          >
            Features
          </Link>
        </nav>
        <div className="flex items-center justify-end gap-2">
          <ThemeToggle />
           <Link href="/dashboard">
            <Button>
              Go to App
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
