"use client";

import { useAuth } from "@/context/AuthContext";
import { LogOut, Menu, User, Bell, Search } from "lucide-react";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export const Header = () => {
  const { user } = useAuth();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && searchQuery.trim()) {
      router.push(`/dashboard/transactions?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/login");
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  return (
    <div className="flex items-center p-4 border-b bg-background h-16 w-full justify-between">
      {/* Mobile Title - Centered */}
      <div className="md:hidden flex flex-1 items-center justify-start">
        <span className="font-extrabold text-xl text-amber-950 tracking-tight">Smart<span className="text-amber-600">Finance</span></span>
      </div>

      {/* Desktop Search - hidden on mobile */}
      <div className="hidden md:flex items-center bg-secondary rounded-md px-3 py-1.5 w-64 border focus-within:ring-1 focus-within:ring-amber-500">
        <Search className="h-4 w-4 text-muted-foreground mr-2" />
        <input 
          type="text" 
          placeholder="Cari transaksi ..." 
          className="bg-transparent border-none outline-none text-sm w-full"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleSearch}
        />
      </div>

      {/* Right side icons */}
      <div className="flex items-center space-x-4 ml-auto">
        <button className="text-muted-foreground hover:text-foreground relative">
          <Bell className="h-5 w-5" />
          <span className="absolute top-0 right-0 h-2 w-2 bg-red-500 rounded-full"></span>
        </button>
        
        <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-800 font-bold border border-amber-200 text-sm">
          {user?.displayName ? user.displayName.charAt(0).toUpperCase() : <User className="h-4 w-4" />}
        </div>
        
        <div className="hidden md:block text-sm">
          <p className="font-medium leading-none mb-1">{user?.displayName || "Pengguna"}</p>
          <p className="text-xs text-muted-foreground leading-none">{user?.email}</p>
        </div>

        <Dialog>
          <DialogTrigger asChild>
            <button 
              className="text-muted-foreground hover:text-red-500 transition ml-2"
              title="Keluar"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] w-[90vw] rounded-xl">
            <DialogHeader>
              <DialogTitle>Konfirmasi Keluar</DialogTitle>
              <DialogDescription>
                Apakah Anda yakin ingin keluar dari akun ini? Anda harus masuk kembali untuk mengakses data Anda.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-4 gap-2 sm:gap-0">
              <DialogClose asChild>
                <Button variant="outline" className="w-full sm:w-auto mt-2 sm:mt-0 text-muted-foreground">
                  Batal
                </Button>
              </DialogClose>
              <Button variant="destructive" className="w-full sm:w-auto" onClick={handleLogout}>
                Ya, Keluar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};
