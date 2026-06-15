"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Wallet,
  Tags,
  Target,
  PiggyBank,
  TrendingUp,
  Settings,
  Bell,
  LogOut,
  FileText
} from "lucide-react";

const routes = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    href: "/dashboard",
    color: "text-sky-500",
  },
  {
    label: "Transaksi",
    icon: Wallet,
    href: "/dashboard/transactions",
    color: "text-violet-500",
  },
  {
    label: "Kategori",
    icon: Tags,
    href: "/dashboard/categories",
    color: "text-pink-700",
  },
  {
    label: "Budget",
    icon: Target,
    href: "/dashboard/budgets",
    color: "text-orange-700",
  },
  {
    label: "Tabungan",
    icon: PiggyBank,
    href: "/dashboard/savings",
    color: "text-emerald-500",
  },
  {
    label: "Investasi",
    icon: TrendingUp,
    href: "/dashboard/investments",
    color: "text-green-700",
  },
  {
    label: "Laporan",
    icon: FileText,
    href: "/dashboard/reports",
    color: "text-blue-700",
  },
];

export const Sidebar = () => {
  const pathname = usePathname();

  return (
    <div className="space-y-4 py-4 flex flex-col h-full bg-[#fdf6b2] border-r border-amber-200 text-slate-800 shadow-md">
      <div className="px-3 py-2 flex-1">
        <Link href="/dashboard" className="flex items-center pl-3 mb-14">
          <h1 className="text-2xl font-extrabold text-amber-950 tracking-tight">
            Smart<span className="text-amber-600">Finance</span>
          </h1>
        </Link>
        <div className="space-y-2">
          {routes.map((route) => (
            <Link
              key={route.href}
              href={route.href}
              className={cn(
                "text-sm group flex p-3 w-full justify-start font-bold cursor-pointer rounded-xl transition-all duration-200",
                pathname === route.href 
                  ? "bg-amber-400 text-amber-950 shadow-md border border-amber-300" 
                  : "text-amber-900 hover:bg-amber-300/50 hover:text-amber-950"
              )}
            >
              <div className="flex items-center flex-1">
                <route.icon className={cn("h-5 w-5 mr-3", pathname === route.href ? "text-amber-950" : route.color)} />
                {route.label}
              </div>
            </Link>
          ))}
        </div>
      </div>
      <div className="px-3 py-2">
        <Link
          href="/settings"
          className={cn(
            "text-sm group flex p-3 w-full justify-start font-bold cursor-pointer rounded-xl transition-all duration-200",
            pathname === "/settings" 
              ? "bg-amber-400 text-amber-950 shadow-md border border-amber-300" 
              : "text-amber-900 hover:bg-amber-300/50 hover:text-amber-950"
          )}
        >
          <div className="flex items-center flex-1">
            <Settings className="h-5 w-5 mr-3 text-amber-700" />
            Pengaturan
          </div>
        </Link>
      </div>
    </div>
  );
};
