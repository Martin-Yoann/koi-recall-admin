'use client';

// ============================================================
// KOI Admin — Top Navigation Bar
// ============================================================

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Shield, Menu, X, Search, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { ADMIN_NAV_ITEMS } from '@/lib/admin-constants';
import { useState } from 'react';

export function TopNav() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-surface-elevated/95 backdrop-blur supports-[backdrop-filter]:bg-surface-elevated/80">
      <div className="container-content flex h-15 items-center justify-between">
        {/* Left: Logo + Nav */}
        <div className="flex items-center gap-8">
          <Link
            href="/"
            className="flex items-center gap-2.5 font-semibold text-text-primary hover:text-blade-resolution transition-colors duration-250"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blade-resolution">
              <Shield className="h-4.5 w-4.5 text-white" />
            </div>
            <span className="text-base tracking-tight font-bold">KOI</span>
            <span className="hidden sm:inline text-xs text-text-tertiary font-medium uppercase tracking-widest">
              Admin
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-0.5">
            {ADMIN_NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'px-3.5 py-2 text-sm rounded-md transition-colors duration-250 font-medium',
                    isActive
                      ? 'text-blade-resolution bg-blade-resolution-light'
                      : 'text-text-secondary hover:text-text-primary hover:bg-surface-secondary'
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right: Search + Notifications + User */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="text-text-secondary hover:text-text-primary" aria-label="Search">
            <Search className="h-4.5 w-4.5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-text-secondary hover:text-text-primary relative" aria-label="Notifications">
            <Bell className="h-4.5 w-4.5" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-blade-safety" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger className="rounded-full ml-1 hover:bg-surface-secondary transition-colors">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-blade-verification text-white text-xs font-bold">
                  AD
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col gap-0.5">
                  <span>Admin User</span>
                  <span className="text-xs text-text-secondary font-normal">admin@koi-platform.com</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Settings</DropdownMenuItem>
              <DropdownMenuItem>Team Members</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-status-rejected">Sign Out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Mobile menu toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Nav */}
      {mobileOpen && (
        <div className="md:hidden border-t bg-surface-elevated">
          <div className="container-content py-3 space-y-1">
            {ADMIN_NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'block px-3 py-2.5 text-sm rounded-md transition-colors duration-250 font-medium',
                    isActive
                      ? 'text-blade-resolution bg-blade-resolution-light'
                      : 'text-text-secondary hover:text-text-primary hover:bg-surface-secondary'
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
}
