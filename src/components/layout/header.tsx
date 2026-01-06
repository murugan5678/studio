'use client'
import Link from 'next/link';
import { PanelLeft, Beaker, Folder, Home, Settings, BarChart, Bot } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { UserNav } from './user-nav';
import { usePathname } from 'next/navigation';
import { AppLogo } from '../icons';
import React from 'react';

const navItems = [
    { href: '/dashboard', icon: Home, label: 'Dashboard' },
    { href: '/projects', icon: Folder, label: 'Projects' },
    { href: '/executions', icon: Beaker, label: 'Executions' },
    { href: '/ai/scenario-generator', icon: Bot, label: 'AI Generation' },
    { href: '/settings', icon: Settings, label: 'Settings' },
]

export function Header() {
    const pathname = usePathname();
    const pathSegments = pathname.split('/').filter(Boolean);

    return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
      <Sheet>
        <SheetTrigger asChild>
          <Button size="icon" variant="outline" className="sm:hidden">
            <PanelLeft className="h-5 w-5" />
            <span className="sr-only">Toggle Menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="sm:max-w-xs">
          <nav className="grid gap-6 text-lg font-medium">
            <Link
              href="#"
              className="group flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:text-base"
            >
              <AppLogo className="h-5 w-5 transition-all group-hover:scale-110" />
              <span className="sr-only">QA Management</span>
            </Link>
            {navItems.map(item => (
                <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground"
                >
                    <item.icon className="h-5 w-5" />
                    {item.label}
                </Link>
            ))}
          </nav>
        </SheetContent>
      </Sheet>
      <Breadcrumb className="hidden md:flex">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/">Home</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          {pathSegments.map((segment, index) => (
            <React.Fragment key={segment}>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                    {index === pathSegments.length - 1 ? (
                        <BreadcrumbPage className="capitalize">{segment.replace(/-/g, ' ')}</BreadcrumbPage>
                    ) : (
                        <BreadcrumbLink asChild>
                            <Link href={`/${pathSegments.slice(0, index + 1).join('/')}`} className="capitalize">{segment.replace(/-/g, ' ')}</Link>
                        </BreadcrumbLink>
                    )}
                </BreadcrumbItem>
            </React.Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
      <div className="relative ml-auto flex-1 md:grow-0" />
      <UserNav />
    </header>
  );
}
