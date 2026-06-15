"use client";

import { useState, useEffect } from "react";
import { Plus, TrendingUp, TrendingDown, Trash2, Edit2, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { collection, onSnapshot, query, where, addDoc, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

export default function InvestmentsPage() {
  const { user } = useAuth();
  const [investments, setInvestments] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [type, setType] = useState("Saham");
  const [initialCapital, setInitialCapital] = useState("");
  const [currentValue, setCurrentValue] = useState("");
  const [editId, setEditId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "investments"), where("userId", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setInvestments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      const data = { 
        userId: user.uid, 
        name, 
        type,
        initialCapital: Number(initialCapital), 
        currentValue: Number(currentValue),
      };
      if (editId) {
        await updateDoc(doc(db, "investments", editId), data);
      } else {
        await addDoc(collection(db, "investments"), data);
      }
      setIsOpen(false);
      resetForm();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Hapus data investasi ini?")) {
      await deleteDoc(doc(db, "investments", id));
    }
  };

  const openEdit = (inv: any) => {
    setEditId(inv.id);
    setName(inv.name);
    setType(inv.type);
    setInitialCapital(inv.initialCapital.toString());
    setCurrentValue(inv.currentValue.toString());
    setIsOpen(true);
  };

  const resetForm = () => {
    setEditId(null);
    setName("");
    setType("Saham");
    setInitialCapital("");
    setCurrentValue("");
  };

  const formatRupiah = (num: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(num);

  const totalCapital = investments.reduce((acc, curr) => acc + curr.initialCapital, 0);
  const totalValue = investments.reduce((acc, curr) => acc + curr.currentValue, 0);
  const totalProfit = totalValue - totalCapital;
  const totalProfitPercentage = totalCapital > 0 ? (totalProfit / totalCapital) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Portofolio Investasi</h2>
          <p className="text-muted-foreground">Pantau pertumbuhan modal dan keuntungan Anda.</p>
        </div>
        <Dialog open={isOpen} onOpenChange={(val) => { setIsOpen(val); if(!val) resetForm(); }}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}><Plus className="mr-2 h-4 w-4" /> Tambah Investasi</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editId ? "Edit Investasi" : "Tambah Investasi"}</DialogTitle>
              <DialogDescription>Masukkan detail instrumen investasi Anda.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nama Aset</Label>
                  <Input placeholder="Cth: BBCA / Emas Antam" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Jenis Investasi</Label>
                  <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" value={type} onChange={(e) => setType(e.target.value)}>
                    <option value="Saham">Saham</option>
                    <option value="Reksa Dana">Reksa Dana</option>
                    <option value="Crypto">Crypto</option>
                    <option value="Emas">Emas</option>
                    <option value="Deposito">Deposito</option>
                    <option value="Obligasi">Obligasi</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Modal Awal (Rp)</Label>
                <Input type="number" placeholder="1000000" value={initialCapital} onChange={(e) => setInitialCapital(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Nilai Saat Ini (Rp)</Label>
                <Input type="number" placeholder="1050000" value={currentValue} onChange={(e) => setCurrentValue(e.target.value)} required />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={loading}>{loading ? "Menyimpan..." : "Simpan"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-6">
            <p className="text-sm font-medium text-muted-foreground mb-1">Total Modal</p>
            <h3 className="text-3xl font-bold">{formatRupiah(totalCapital)}</h3>
          </CardContent>
        </Card>
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-6">
            <p className="text-sm font-medium text-muted-foreground mb-1">Total Nilai Saat Ini</p>
            <h3 className="text-3xl font-bold">{formatRupiah(totalValue)}</h3>
          </CardContent>
        </Card>
        <Card className={cn("border-2", totalProfit >= 0 ? "bg-emerald-50 border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/30" : "bg-rose-50 border-rose-100 dark:bg-rose-950/20 dark:border-rose-900/30")}>
          <CardContent className="p-6 flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Total Keuntungan</p>
              <h3 className={cn("text-3xl font-bold flex items-center", totalProfit >= 0 ? "text-emerald-600" : "text-rose-600")}>
                {totalProfit >= 0 ? "+" : "-"}{formatRupiah(Math.abs(totalProfit))}
              </h3>
            </div>
            <div className={cn("flex items-center px-2.5 py-1 rounded-full text-sm font-semibold", totalProfit >= 0 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400" : "bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-400")}>
              {totalProfit >= 0 ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
              {Math.abs(totalProfitPercentage).toFixed(2)}%
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-8">
        {investments.length === 0 ? (
          <div className="col-span-full py-12 text-center text-muted-foreground border rounded-lg bg-card border-dashed">
            Belum ada portofolio investasi.
          </div>
        ) : (
          investments.map((inv) => {
            const profit = inv.currentValue - inv.initialCapital;
            const percentage = (profit / inv.initialCapital) * 100;
            const isProfit = profit >= 0;

            return (
              <Card key={inv.id} className="transition-all hover:shadow-md">
                <CardHeader className="pb-2 flex flex-row items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Activity className="h-4 w-4 text-primary" /> {inv.name}
                    </CardTitle>
                    <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold bg-secondary/50">
                      {inv.type}
                    </span>
                  </div>
                  <div className="flex space-x-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(inv)} className="h-8 w-8 text-muted-foreground hover:text-primary">
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(inv.id)} className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-1 mb-4 mt-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Modal:</span>
                      <span className="font-medium">{formatRupiah(inv.initialCapital)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Nilai:</span>
                      <span className="font-bold">{formatRupiah(inv.currentValue)}</span>
                    </div>
                  </div>
                  
                  <div className={cn(
                    "p-3 rounded-lg flex justify-between items-center",
                    isProfit ? "bg-emerald-50 dark:bg-emerald-950/20" : "bg-rose-50 dark:bg-rose-950/20"
                  )}>
                    <div>
                      <p className="text-xs text-muted-foreground">Return</p>
                      <p className={cn("font-bold text-lg", isProfit ? "text-emerald-600" : "text-rose-600")}>
                        {isProfit ? "+" : "-"}{formatRupiah(Math.abs(profit))}
                      </p>
                    </div>
                    <div className={cn("flex items-center text-sm font-semibold", isProfit ? "text-emerald-600" : "text-rose-600")}>
                      {isProfit ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
                      {Math.abs(percentage).toFixed(2)}%
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
