"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Wallet,
  Target,
  PiggyBank,
  FileText
} from "lucide-react";

const mobileRoutes = [
  {
    label: "Home",
    icon: LayoutDashboard,
    href: "/dashboard",
  },
  {
    label: "Transaksi",
    icon: Wallet,
    href: "/dashboard/transactions",
  },
  {
    label: "Budget",
    icon: Target,
    href: "/dashboard/budgets",
  },
  {
    label: "Tabungan",
    icon: PiggyBank,
    href: "/dashboard/savings",
  },
  {
    label: "Laporan",
    icon: FileText,
    href: "/dashboard/reports",
  },
];

export const BottomNav = () => {
  const pathname = usePathname();

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-t border-slate-200/50 pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
      <div className="flex items-center justify-around p-2">
        {mobileRoutes.map((route) => {
          const isActive = pathname === route.href;
          return (
            <Link
              key={route.href}
              href={route.href}
              className="flex flex-col items-center justify-center w-full py-1 gap-1"
            >
              <div 
                className={cn(
                  "p-2 rounded-xl transition-all duration-300",
                  isActive ? "bg-amber-100 text-amber-700 shadow-sm" : "text-slate-400 hover:bg-slate-50"
                )}
              >
                <route.icon className={cn("h-6 w-6", isActive ? "stroke-[2.5px]" : "stroke-2")} />
              </div>
              <span 
                className={cn(
                  "text-[10px] font-medium transition-all duration-300",
                  isActive ? "text-amber-800 font-bold" : "text-slate-500"
                )}
              >
                {route.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};
