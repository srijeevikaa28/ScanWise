
'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  QrCode,
  Warehouse,
  Menu,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { ThemeToggle } from '@/components/theme-toggle';
import { FirebaseClientProvider, useUser, initiateAnonymousSignIn, useAuth } from '@/firebase';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';


const navItems = [
  { href: '/dashboard/scan', icon: QrCode, label: 'Scan' },
  { href: '/dashboard', icon: Warehouse, label: 'Inventory' },
];

function DashboardHeader() {
    const pathname = usePathname();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    return (
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-14 items-center justify-between">
                <div className="flex items-center space-x-2">
                    <Link href="/" className="flex items-center space-x-2">
                        <Icons.logo className="h-6 w-6 text-primary" />
                        <span className="font-bold sm:inline-block text-primary">
                            ScanWise
                        </span>
                    </Link>
                </div>
                
                <div className="flex items-center justify-end gap-2">
                     {/* Desktop Navigation */}
                    <nav className="hidden items-center gap-2 text-sm md:flex">
                         <Link href="/dashboard/scan">
                            <Button variant={pathname.startsWith('/dashboard/scan') ? 'default' : 'outline'}>
                                <QrCode className="mr-2 h-4 w-4" />
                                Scan
                            </Button>
                        </Link>
                        <Link href="/dashboard">
                           <Button variant={pathname === '/dashboard' ? 'default' : 'outline'}>
                                <Warehouse className="mr-2 h-4 w-4" />
                                Inventory
                            </Button>
                        </Link>
                    </nav>
                    
                    <ThemeToggle />

                    {/* Mobile Navigation */}
                    <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                        <SheetTrigger asChild>
                             <Button
                                variant="ghost"
                                className="md:hidden"
                                size="icon"
                                aria-label="Open menu"
                            >
                                <Menu />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="w-[300px] sm:w-[400px]">
                            <div className="flex justify-center my-6">
                                <Link href="/" className="flex items-center space-x-2" onClick={() => setIsMobileMenuOpen(false)}>
                                    <Icons.logo className="h-6 w-6 text-primary" />
                                    <span className="font-bold text-primary">ScanWise</span>
                                </Link>
                            </div>
                             <nav className="flex flex-col gap-4">
                                {navItems.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className={cn(
                                        "flex items-center gap-2 rounded-md p-2 text-lg font-medium",
                                        (item.href === '/dashboard' ? pathname === item.href : pathname.startsWith(item.href))
                                            ? "bg-accent text-accent-foreground"
                                            : "hover:bg-accent"
                                    )}
                                >
                                    <item.icon className="h-5 w-5" />
                                    {item.label}
                                </Link>
                                ))}
                            </nav>
                        </SheetContent>
                    </Sheet>
                </div>
            </div>
        </header>
    );
}

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
    const { user, isUserLoading } = useUser();
    const auth = useAuth();
  
    useEffect(() => {
      if (!isUserLoading && !user) {
        initiateAnonymousSignIn(auth);
      }
    }, [isUserLoading, user, auth]);
  
    if (isUserLoading) {
      return (
        <div className="flex h-screen w-full items-center justify-center bg-transparent">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      );
    }
  

  return (
    <div className="flex min-h-screen w-full flex-col bg-transparent">
      <DashboardHeader />
      <main className="container mx-auto flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
}


export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <FirebaseClientProvider>
            <DashboardLayoutContent>{children}</DashboardLayoutContent>
        </FirebaseClientProvider>
    )
}
