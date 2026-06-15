"use client";

import { useState, useEffect } from "react";
import { format, isAfter, subDays, startOfMonth, isSameDay, isBefore, startOfDay, endOfDay } from "date-fns";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { Download, FileText, Search, Filter, Plus, Trash2, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { collection, onSnapshot, query, where, addDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";

export default function TransactionsPage() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("Semua");
  const [dateFilter, setDateFilter] = useState("Semua Waktu");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [transactions, setTransactions] = useState<any[]>([]);
  const [categoriesList, setCategoriesList] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form State
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState("Pengeluaran");
  const [category, setCategory] = useState("");
  const [method, setMethod] = useState("Cash");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const q = params.get("search");
      if (q) {
        setSearchTerm(decodeURIComponent(q));
      }
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    
    // Fetch Transactions
    const qTrans = query(collection(db, "transactions"), where("userId", "==", user.uid));
    const unsubTrans = onSnapshot(qTrans, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      data.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setTransactions(data);
    });

    // Fetch Categories
    const qCats = query(collection(db, "categories"), where("userId", "==", user.uid));
    const unsubCats = onSnapshot(qCats, (snapshot) => {
      setCategoriesList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => { unsubTrans(); unsubCats(); };
  }, [user]);

  // Handle default category when type changes
  useEffect(() => {
    const availableCats = categoriesList.filter(c => c.type === type);
    if (availableCats.length > 0 && !availableCats.find(c => c.name === category)) {
      setCategory(availableCats[0].name);
    } else if (availableCats.length === 0) {
      setCategory(""); // Reset if no categories for this type
    }
  }, [type, categoriesList]);

  const filteredTransactions = transactions.filter((t) => {
    const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          t.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === "Semua" ? true : t.type === typeFilter;
    
    let matchesDate = true;
    const tDate = new Date(t.date);
    const today = new Date();
    
    if (dateFilter === "Hari Ini") {
      matchesDate = isSameDay(tDate, today);
    } else if (dateFilter === "7 Hari Terakhir") {
      matchesDate = isAfter(tDate, subDays(today, 7));
    } else if (dateFilter === "Bulan Ini") {
      matchesDate = isAfter(tDate, startOfMonth(today));
    } else if (dateFilter === "Pilih Rentang") {
      if (startDate && endDate) {
        const start = startOfDay(new Date(startDate));
        const end = endOfDay(new Date(endDate));
        matchesDate = (isAfter(tDate, start) || isSameDay(tDate, start)) && 
                      (isBefore(tDate, end) || isSameDay(tDate, end));
      }
    }

    return matchesSearch && matchesType && matchesDate;
  });

  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount);
  };

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!category) {
      alert("Pilih kategori terlebih dahulu! Buat kategori di menu Kategori jika belum ada.");
      return;
    }
    setLoading(true);
    try {
      await addDoc(collection(db, "transactions"), {
        userId: user.uid,
        description,
        amount: Number(amount),
        type,
        category,
        method,
        date: new Date().toISOString(),
      });
      setIsOpen(false);
      setDescription(""); setAmount("");
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Apakah Anda yakin ingin menghapus transaksi ini?")) {
      await deleteDoc(doc(db, "transactions", id));
    }
  };

  const getTotals = () => {
    const totalPemasukan = filteredTransactions.filter(t => t.type === "Pemasukan").reduce((acc, curr) => acc + curr.amount, 0);
    const totalPengeluaran = filteredTransactions.filter(t => t.type === "Pengeluaran").reduce((acc, curr) => acc + curr.amount, 0);
    return { totalPemasukan, totalPengeluaran };
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text("Laporan Transaksi Keuangan", 14, 15);
    doc.setFontSize(10);
    doc.text(`Dicetak pada: ${format(new Date(), "dd MMM yyyy HH:mm")}`, 14, 22);
    
    let periodText = dateFilter;
    if (dateFilter === "Pilih Rentang" && startDate && endDate) {
      periodText = `${format(new Date(startDate), "dd MMM yyyy")} - ${format(new Date(endDate), "dd MMM yyyy")}`;
    }
    doc.text(`Periode: ${periodText}`, 14, 28);

    const tableColumn = ["Tanggal", "Keterangan", "Kategori", "Tipe", "Metode", "Nominal"];
    const tableRows = filteredTransactions.map(t => [
      format(new Date(t.date), "dd MMM yyyy"),
      t.description,
      t.category,
      t.type,
      t.method,
      formatRupiah(t.amount)
    ]);

    const { totalPemasukan, totalPengeluaran } = getTotals();

    autoTable(doc, { 
      head: [tableColumn], 
      body: tableRows, 
      startY: 35,
      foot: [
        ["", "", "", "", "Total Pemasukan", formatRupiah(totalPemasukan)],
        ["", "", "", "", "Total Pengeluaran", formatRupiah(totalPengeluaran)],
        ["", "", "", "", "Saldo Bersih", formatRupiah(totalPemasukan - totalPengeluaran)]
      ],
      footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' }
    });
    
    doc.save(`laporan-transaksi-${format(new Date(), "dd-MM-yyyy")}.pdf`);
  };

  const exportToExcel = () => {
    const dataToExport = filteredTransactions.map(t => ({
      Tanggal: format(new Date(t.date), "dd MMM yyyy"),
      Keterangan: t.description,
      Kategori: t.category,
      Tipe: t.type,
      Metode_Pembayaran: t.method,
      Nominal: t.amount
    }));

    const { totalPemasukan, totalPengeluaran } = getTotals();
    
    // Add spacer and totals
    dataToExport.push({ Tanggal: "", Keterangan: "", Kategori: "", Tipe: "", Metode_Pembayaran: "", Nominal: null as any });
    dataToExport.push({ Tanggal: "", Keterangan: "TOTAL PEMASUKAN", Kategori: "", Tipe: "", Metode_Pembayaran: "", Nominal: totalPemasukan });
    dataToExport.push({ Tanggal: "", Keterangan: "TOTAL PENGELUARAN", Kategori: "", Tipe: "", Metode_Pembayaran: "", Nominal: totalPengeluaran });
    dataToExport.push({ Tanggal: "", Keterangan: "SALDO BERSIH", Kategori: "", Tipe: "", Metode_Pembayaran: "", Nominal: totalPemasukan - totalPengeluaran });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Transaksi");
    XLSX.writeFile(workbook, `laporan-transaksi-${format(new Date(), "dd-MM-yyyy")}.xlsx`);
  };

  const availableCategoriesForForm = categoriesList.filter(c => c.type === type);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Manajemen Transaksi</h2>
          <p className="text-muted-foreground">Kelola dan pantau semua pemasukan dan pengeluaran Anda secara real-time.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" onClick={exportToPDF} disabled={filteredTransactions.length === 0}>
            <FileText className="mr-2 h-4 w-4 text-red-500" />
            PDF
          </Button>
          <Button variant="outline" onClick={exportToExcel} disabled={filteredTransactions.length === 0}>
            <Download className="mr-2 h-4 w-4 text-green-600" />
            Excel
          </Button>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> Tambah Transaksi</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Tambah Transaksi Baru</DialogTitle>
                <DialogDescription>Masukkan detail transaksi yang ingin dicatat.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddTransaction} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Jenis</Label>
                    <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" value={type} onChange={(e) => setType(e.target.value)}>
                      <option value="Pengeluaran">Pengeluaran</option>
                      <option value="Pemasukan">Pemasukan</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Kategori</Label>
                    <select 
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" 
                      value={category} 
                      onChange={(e) => setCategory(e.target.value)}
                      required
                    >
                      {availableCategoriesForForm.length === 0 && <option value="">Buat kategori dulu!</option>}
                      {availableCategoriesForForm.map(c => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Keterangan</Label>
                  <Input placeholder="Makan siang bersama..." value={description} onChange={(e) => setDescription(e.target.value)} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nominal (Rp)</Label>
                    <Input type="number" placeholder="50000" value={amount} onChange={(e) => setAmount(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Metode</Label>
                    <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" value={method} onChange={(e) => setMethod(e.target.value)}>
                      <option value="Cash">Cash</option>
                      <option value="Transfer Bank">Transfer Bank</option>
                      <option value="E-Wallet">E-Wallet</option>
                      <option value="QRIS">QRIS</option>
                    </select>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={loading || availableCategoriesForForm.length === 0}>{loading ? "Menyimpan..." : "Simpan Transaksi"}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader className="p-4 border-b">
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <div className="relative w-full md:w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari transaksi..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-2 w-full md:w-auto md:flex md:items-center">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground hidden sm:block" />
                <select
                  className="h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-sm shadow-sm"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                >
                  <option value="Semua Waktu">Semua Waktu</option>
                  <option value="Hari Ini">Hari Ini</option>
                  <option value="7 Hari Terakhir">7 Hari Terakhir</option>
                  <option value="Bulan Ini">Bulan Ini</option>
                  <option value="Pilih Rentang">Pilih Rentang</option>
                </select>
              </div>

              {dateFilter === "Pilih Rentang" && (
                <div className="flex items-center gap-2 col-span-2 md:col-span-1 justify-center mt-2 md:mt-0">
                  <Input type="date" className="h-9 w-[130px] px-2" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                  <span className="text-muted-foreground">-</span>
                  <Input type="date" className="h-9 w-[130px] px-2" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
              )}

              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground hidden sm:block" />
                <select
                  className="h-9 w-full md:w-[180px] rounded-md border border-input bg-background px-2 py-1 text-sm shadow-sm"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                >
                  <option value="Semua">Semua Jenis</option>
                  <option value="Pemasukan">Pemasukan</option>
                  <option value="Pengeluaran">Pengeluaran</option>
                </select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>Keterangan</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead>Metode</TableHead>
                <TableHead className="text-right">Nominal</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                    Tidak ada transaksi ditemukan.
                  </TableCell>
                </TableRow>
              ) : (
                filteredTransactions.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{format(new Date(t.date), "dd MMM yyyy")}</TableCell>
                    <TableCell>{t.description}</TableCell>
                    <TableCell>
                      <span className={cn(
                        "inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold ring-1 ring-inset",
                        t.type === "Pemasukan" 
                          ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20" 
                          : "bg-rose-50 text-rose-700 ring-rose-600/10"
                      )}>
                        {t.category}
                      </span>
                    </TableCell>
                    <TableCell>{t.method}</TableCell>
                    <TableCell className="text-right font-bold">
                      <span className={cn(
                        "inline-flex px-3 py-1 rounded-full text-sm", 
                        t.type === "Pemasukan" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                      )}>
                        {t.type === "Pemasukan" ? "+" : "-"}{formatRupiah(t.amount)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(t.id)} className="text-rose-400 hover:text-rose-700 hover:bg-rose-100 rounded-full transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
