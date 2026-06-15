"use client";

import { useState, useEffect } from "react";
import { Plus, PiggyBank, Trash2, Edit2, CheckCircle2, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { collection, onSnapshot, query, where, addDoc, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

export default function SavingsPage() {
  const { user } = useAuth();
  const [savings, setSavings] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form State (Main)
  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [currentAmount, setCurrentAmount] = useState("");
  const [deadline, setDeadline] = useState("");
  const [editId, setEditId] = useState<string | null>(null);

  // Form State (Deposit)
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [depositTargetId, setDepositTargetId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "savings"), where("userId", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setSavings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
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
        targetAmount: Number(targetAmount), 
        currentAmount: Number(currentAmount),
        deadline 
      };
      if (editId) {
        await updateDoc(doc(db, "savings", editId), data);
      } else {
        await addDoc(collection(db, "savings"), data);
      }
      setIsOpen(false);
      resetForm();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !depositTargetId) return;
    setLoading(true);
    try {
      const targetSaving = savings.find(s => s.id === depositTargetId);
      if (targetSaving) {
        const newTotal = targetSaving.currentAmount + Number(depositAmount);
        await updateDoc(doc(db, "savings", depositTargetId), { currentAmount: newTotal });
        
        // Auto-create transaction for history (optional)
        await addDoc(collection(db, "transactions"), {
          userId: user.uid,
          description: `Setor tabungan: ${targetSaving.name}`,
          amount: Number(depositAmount),
          type: "Pengeluaran",
          category: "Tabungan",
          method: "Transfer Bank",
          date: new Date().toISOString(),
        });
      }
      setIsDepositOpen(false);
      setDepositAmount("");
      setDepositTargetId(null);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Hapus target tabungan ini?")) {
      await deleteDoc(doc(db, "savings", id));
    }
  };

  const openEdit = (s: any) => {
    setEditId(s.id);
    setName(s.name);
    setTargetAmount(s.targetAmount.toString());
    setCurrentAmount(s.currentAmount.toString());
    setDeadline(s.deadline);
    setIsOpen(true);
  };

  const openDeposit = (id: string) => {
    setDepositTargetId(id);
    setDepositAmount("");
    setIsDepositOpen(true);
  };

  const resetForm = () => {
    setEditId(null);
    setName("");
    setTargetAmount("");
    setCurrentAmount("0");
    setDeadline("");
  };

  const formatRupiah = (num: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(num);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Target Tabungan</h2>
          <p className="text-muted-foreground">Rencanakan dan pantau impian finansial Anda.</p>
        </div>
        <Dialog open={isOpen} onOpenChange={(val) => { setIsOpen(val); if(!val) resetForm(); }}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}><Plus className="mr-2 h-4 w-4" /> Buat Target Tabungan</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editId ? "Edit Tabungan" : "Buat Target Tabungan"}</DialogTitle>
              <DialogDescription>Tentukan tujuan menabung Anda.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-2">
                <Label>Nama Impian / Target</Label>
                <Input placeholder="Cth: Dana Darurat / Beli Rumah" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Target Terkumpul (Rp)</Label>
                  <Input type="number" placeholder="50000000" value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Sudah Terkumpul (Awal) (Rp)</Label>
                  <Input type="number" placeholder="0" value={currentAmount} onChange={(e) => setCurrentAmount(e.target.value)} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Tenggat Waktu (Deadline)</Label>
                <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} required />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={loading}>{loading ? "Menyimpan..." : "Simpan"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Deposit Modal */}
      <Dialog open={isDepositOpen} onOpenChange={setIsDepositOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Setor Uang</DialogTitle>
            <DialogDescription>Masukkan nominal yang ingin disetor ke tabungan ini.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleDeposit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nominal Setoran (Rp)</Label>
              <Input type="number" placeholder="100000" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} required />
              <p className="text-xs text-muted-foreground mt-1">Setoran ini juga akan otomatis tercatat di halaman Transaksi sebagai pengeluaran ber-kategori "Tabungan".</p>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={loading}>{loading ? "Menyetor..." : "Setor Sekarang"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {savings.length === 0 ? (
          <div className="col-span-full py-12 text-center text-muted-foreground border rounded-lg bg-card border-dashed">
            Belum ada target tabungan.
          </div>
        ) : (
          savings.map((s) => {
            const percentage = Math.min((s.currentAmount / s.targetAmount) * 100, 100);
            const isCompleted = percentage >= 100;

            return (
              <Card key={s.id} className={cn("relative overflow-hidden transition-all hover:shadow-md", isCompleted && "border-emerald-500 bg-emerald-500/5")}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        {isCompleted ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <PiggyBank className="h-5 w-5 text-sky-500" />}
                        {s.name}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">Target: {new Date(s.deadline).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</p>
                    </div>
                    <div className="flex space-x-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(s)} className="h-8 w-8 text-muted-foreground hover:text-primary">
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id)} className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-end mb-2 mt-4">
                    <div>
                      <p className={cn("text-2xl font-bold", isCompleted ? "text-emerald-600" : "text-sky-600")}>
                        {formatRupiah(s.currentAmount)}
                      </p>
                    </div>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-3 mb-2 overflow-hidden border border-muted">
                    <div 
                      className={cn("h-3 rounded-full transition-all duration-1000", isCompleted ? "bg-emerald-500" : "bg-sky-500")}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between items-center text-xs mt-3">
                    <span className="font-medium">{percentage.toFixed(1)}% Terkumpul</span>
                    <span className="text-muted-foreground">dari {formatRupiah(s.targetAmount)}</span>
                  </div>
                  {!isCompleted && (
                    <Button onClick={() => openDeposit(s.id)} variant="outline" className="w-full mt-4 border-dashed border-2 hover:border-primary">
                      <DollarSign className="w-4 h-4 mr-2" /> Setor Uang
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
