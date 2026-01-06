'use client'
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AppLogo } from '@/components/icons';
import { LayoutDashboard, Beaker, Folder, Settings, BarChart, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/projects', icon: Folder, label: 'Projects' },
    { href: '/executions', icon: Beaker, label: 'Executions' },
    { href: '/ai', icon: Bot, label: 'AI Generation' },
    { href: '/analytics', icon: BarChart, label: 'Analytics' },
]

export function Sidebar() {
    const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-10 hidden w-60 flex-col border-r bg-background sm:flex">
      <nav className="flex flex-col gap-4 px-4 sm:py-5">
        <Link
          href="/dashboard"
          className="group flex h-9 shrink-0 items-center gap-2 rounded-full text-lg font-semibold text-primary-foreground md:text-base"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary">
            <AppLogo className="h-5 w-5 transition-all group-hover:scale-110" />
          </div>
          <span className="font-headline text-xl font-bold text-primary">TestAI</span>
        </Link>
        
        {navItems.map((item) => (
            <Link
                key={item.href}
                href={item.href}
                className={cn("flex items-center gap-3 rounded-lg px-3 py-2 transition-all", 
                pathname.startsWith(item.href) 
                ? 'bg-accent text-accent-foreground' 
                : 'text-muted-foreground hover:text-foreground'
                )}
            >
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
            </Link>
        ))}
      </nav>
      <nav className="mt-auto flex flex-col items-center gap-4 px-2 sm:py-5">
            <Link
                href="/settings"
                className={cn("flex w-full items-center gap-3 rounded-lg px-3 py-2 transition-all", 
                pathname === '/settings' 
                ? 'bg-accent text-accent-foreground' 
                : 'text-muted-foreground hover:text-foreground'
                )}
            >
                <Settings className="h-5 w-5" />
                <span>Settings</span>
            </Link>
      </nav>
    </aside>
  );
}
