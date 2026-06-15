"use client";

import { useState, useEffect } from "react";
import { Plus, Tags, Trash2, Edit2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { collection, onSnapshot, query, where, addDoc, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";

export default function CategoriesPage() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [type, setType] = useState("Pengeluaran");
  const [color, setColor] = useState("#ef4444");
  const [editId, setEditId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "categories"), where("userId", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCategories(data);
    });
    return () => unsubscribe();
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      if (editId) {
        await updateDoc(doc(db, "categories", editId), { name, type, color });
      } else {
        await addDoc(collection(db, "categories"), { userId: user.uid, name, type, color });
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
    if (confirm("Hapus kategori ini?")) {
      await deleteDoc(doc(db, "categories", id));
    }
  };

  const openEdit = (cat: any) => {
    setEditId(cat.id);
    setName(cat.name);
    setType(cat.type);
    setColor(cat.color);
    setIsOpen(true);
  };

  const resetForm = () => {
    setEditId(null);
    setName("");
    setType("Pengeluaran");
    setColor("#ef4444");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Kategori</h2>
          <p className="text-muted-foreground">Kelola label kategori untuk transaksi Anda.</p>
        </div>
        <Dialog open={isOpen} onOpenChange={(val) => { setIsOpen(val); if(!val) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Tambah Kategori</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editId ? "Edit Kategori" : "Tambah Kategori"}</DialogTitle>
              <DialogDescription>Isi detail kategori di bawah ini.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-2">
                <Label>Nama Kategori</Label>
                <Input placeholder="Cth: Makanan" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Jenis</Label>
                  <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" value={type} onChange={(e) => setType(e.target.value)}>
                    <option value="Pengeluaran">Pengeluaran</option>
                    <option value="Pemasukan">Pemasukan</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Warna Identitas</Label>
                  <Input type="color" className="p-1 h-9" value={color} onChange={(e) => setColor(e.target.value)} />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={loading}>{loading ? "Menyimpan..." : "Simpan"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
        {categories.length === 0 ? (
          <div className="col-span-full py-12 text-center text-muted-foreground border rounded-lg bg-card border-dashed">
            Belum ada kategori. Silakan tambah kategori baru.
          </div>
        ) : (
          categories.map((cat) => (
            <Card key={cat.id} className="overflow-hidden hover:shadow-md transition">
              <div className="h-2 w-full" style={{ backgroundColor: cat.color }}></div>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-full flex items-center justify-center bg-muted">
                    <Tags className="h-5 w-5" style={{ color: cat.color }} />
                  </div>
                  <div>
                    <h3 className="font-semibold leading-none">{cat.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{cat.type}</p>
                  </div>
                </div>
                <div className="flex space-x-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(cat)} className="h-8 w-8 text-muted-foreground hover:text-primary">
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(cat.id)} className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
