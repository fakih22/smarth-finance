"use client";

import { useState, useEffect } from "react";
import { Plus, Target, Trash2, Edit2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { collection, onSnapshot, query, where, addDoc, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

export default function BudgetsPage() {
  const { user } = useAuth();
  const [budgets, setBudgets] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [categoriesList, setCategoriesList] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [editId, setEditId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    
    // Fetch Budgets
    const qBudgets = query(collection(db, "budgets"), where("userId", "==", user.uid));
    const unsubBudgets = onSnapshot(qBudgets, (snapshot) => {
      setBudgets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Fetch this month's transactions for progress calculation
    const qTrans = query(collection(db, "transactions"), where("userId", "==", user.uid), where("type", "==", "Pengeluaran"));
    const unsubTrans = onSnapshot(qTrans, (snapshot) => {
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const data = snapshot.docs
        .map(doc => doc.data())
        .filter(t => {
          const d = new Date(t.date);
          return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        });
      setTransactions(data);
    });

    // Fetch Categories (Only Pengeluaran)
    const qCats = query(collection(db, "categories"), where("userId", "==", user.uid), where("type", "==", "Pengeluaran"));
    const unsubCats = onSnapshot(qCats, (snapshot) => {
      setCategoriesList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => { unsubBudgets(); unsubTrans(); unsubCats(); };
  }, [user]);

  useEffect(() => {
    if (categoriesList.length > 0 && !categoriesList.find(c => c.name === category)) {
      setCategory(categoriesList[0].name);
    } else if (categoriesList.length === 0) {
      setCategory("");
    }
  }, [categoriesList]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!category) {
      alert("Buat kategori pengeluaran terlebih dahulu di menu Kategori!");
      return;
    }
    setLoading(true);
    try {
      if (editId) {
        await updateDoc(doc(db, "budgets", editId), { name, category, amount: Number(amount) });
      } else {
        await addDoc(collection(db, "budgets"), { userId: user.uid, name, category, amount: Number(amount) });
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
    if (confirm("Hapus anggaran ini?")) {
      await deleteDoc(doc(db, "budgets", id));
    }
  };

  const openEdit = (b: any) => {
    setEditId(b.id);
    setName(b.name);
    setCategory(b.category);
    setAmount(b.amount.toString());
    setIsOpen(true);
  };

  const resetForm = () => {
    setEditId(null);
    setName("");
    if (categoriesList.length > 0) setCategory(categoriesList[0].name);
    setAmount("");
  };

  const formatRupiah = (num: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(num);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Anggaran Bulanan</h2>
          <p className="text-muted-foreground">Kendalikan pengeluaran Anda dengan target anggaran.</p>
        </div>
        <Dialog open={isOpen} onOpenChange={(val) => { setIsOpen(val); if(!val) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Buat Anggaran</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editId ? "Edit Anggaran" : "Buat Anggaran Baru"}</DialogTitle>
              <DialogDescription>Tentukan batas maksimal pengeluaran per kategori.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-2">
                <Label>Nama Anggaran</Label>
                <Input placeholder="Cth: Anggaran Makan Siang" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Kategori Tujuan</Label>
                  <select 
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" 
                    value={category} 
                    onChange={(e) => setCategory(e.target.value)}
                    required
                  >
                    {categoriesList.length === 0 && <option value="">Buat kategori dulu!</option>}
                    {categoriesList.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Nominal Maksimal (Rp)</Label>
                  <Input type="number" placeholder="1000000" value={amount} onChange={(e) => setAmount(e.target.value)} required />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={loading || categoriesList.length === 0}>{loading ? "Menyimpan..." : "Simpan"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {budgets.length === 0 ? (
          <div className="col-span-full py-12 text-center text-muted-foreground border rounded-lg bg-card border-dashed">
            Belum ada anggaran. Silakan buat anggaran baru untuk memantau pengeluaran Anda.
          </div>
        ) : (
          budgets.map((b) => {
            const spent = transactions
              .filter(t => t.category.toLowerCase() === b.category.toLowerCase())
              .reduce((acc, curr) => acc + curr.amount, 0);
            
            const percentage = Math.min((spent / b.amount) * 100, 100);
            const isWarning = percentage >= 80;
            const isDanger = percentage >= 100;

            return (
              <Card key={b.id} className="relative overflow-hidden">
                <div className={cn(
                  "absolute top-0 left-0 w-1 h-full",
                  isDanger ? "bg-rose-500" : isWarning ? "bg-amber-500" : "bg-emerald-500"
                )} />
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Target className="h-4 w-4 text-primary" /> {b.name}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">Kategori: {b.category}</p>
                  </div>
                  <div className="flex space-x-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(b)} className="h-8 w-8 text-muted-foreground hover:text-primary">
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(b.id)} className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-end mb-2">
                    <div>
                      <p className="text-sm font-medium">Terpakai</p>
                      <p className={cn("text-2xl font-bold", isDanger && "text-rose-600")}>{formatRupiah(spent)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">dari {formatRupiah(b.amount)}</p>
                    </div>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2.5 mb-2 overflow-hidden">
                    <div 
                      className={cn("h-2.5 rounded-full transition-all duration-500", isDanger ? "bg-rose-500" : isWarning ? "bg-amber-500" : "bg-emerald-500")}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">{percentage.toFixed(1)}%</span>
                    {isDanger && <span className="text-rose-500 flex items-center font-medium"><AlertCircle className="h-3 w-3 mr-1" /> Melebihi Anggaran</span>}
                    {isWarning && !isDanger && <span className="text-amber-500 flex items-center font-medium"><AlertCircle className="h-3 w-3 mr-1" /> Hampir Habis</span>}
                    {!isWarning && <span className="text-emerald-500 font-medium">Aman</span>}
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
