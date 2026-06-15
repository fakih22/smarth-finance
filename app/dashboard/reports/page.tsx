"use client";

import { useState, useEffect } from "react";
import { format, isAfter, subDays, startOfMonth, startOfYear, isSameDay, isBefore, startOfDay, endOfDay } from "date-fns";
import { Printer, Calendar, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';

const COLORS = ['#0ea5e9', '#f43f5e', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

export default function ReportsPage() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [dateFilter, setDateFilter] = useState("Bulan Ini");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "transactions"), where("userId", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [user]);

  const filteredTransactions = transactions.filter((t) => {
    let matchesDate = true;
    const tDate = new Date(t.date);
    const today = new Date();
    
    if (dateFilter === "Hari Ini") {
      matchesDate = isSameDay(tDate, today);
    } else if (dateFilter === "7 Hari Terakhir") {
      matchesDate = isAfter(tDate, subDays(today, 7));
    } else if (dateFilter === "Bulan Ini") {
      matchesDate = isAfter(tDate, startOfMonth(today));
    } else if (dateFilter === "Tahun Ini") {
      matchesDate = isAfter(tDate, startOfYear(today));
    } else if (dateFilter === "Pilih Rentang") {
      if (startDate && endDate) {
        const start = startOfDay(new Date(startDate));
        const end = endOfDay(new Date(endDate));
        matchesDate = (isAfter(tDate, start) || isSameDay(tDate, start)) && 
                      (isBefore(tDate, end) || isSameDay(tDate, end));
      }
    }
    return matchesDate;
  });

  const totalPemasukan = filteredTransactions.filter(t => t.type === "Pemasukan").reduce((acc, curr) => acc + curr.amount, 0);
  const totalPengeluaran = filteredTransactions.filter(t => t.type === "Pengeluaran").reduce((acc, curr) => acc + curr.amount, 0);
  const saldoBersih = totalPemasukan - totalPengeluaran;

  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount);
  };

  // Process data for Area Chart (Cashflow Trend)
  const getCashflowData = () => {
    const grouped: { [key: string]: { date: string, Pemasukan: number, Pengeluaran: number } } = {};
    
    // Sort transactions by date ascending for the chart
    const sorted = [...filteredTransactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    sorted.forEach(t => {
      const dateKey = format(new Date(t.date), "dd MMM");
      if (!grouped[dateKey]) {
        grouped[dateKey] = { date: dateKey, Pemasukan: 0, Pengeluaran: 0 };
      }
      if (t.type === "Pemasukan") grouped[dateKey].Pemasukan += t.amount;
      if (t.type === "Pengeluaran") grouped[dateKey].Pengeluaran += t.amount;
    });

    return Object.values(grouped);
  };

  // Process data for Pie Chart (Expense Categories)
  const getCategoryData = () => {
    const grouped: { [key: string]: number } = {};
    filteredTransactions.filter(t => t.type === "Pengeluaran").forEach(t => {
      if (!grouped[t.category]) grouped[t.category] = 0;
      grouped[t.category] += t.amount;
    });

    return Object.entries(grouped)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value); // Sort descending
  };

  const chartDataFlow = getCashflowData();
  const chartDataCat = getCategoryData();

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Header & Filters (Hidden when printing) */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Laporan & Analitik</h2>
          <p className="text-muted-foreground">Analisis arus kas dan distribusi pengeluaran Anda.</p>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <select
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          >
            <option value="Semua Waktu">Semua Waktu</option>
            <option value="Hari Ini">Hari Ini</option>
            <option value="7 Hari Terakhir">7 Hari Terakhir</option>
            <option value="Bulan Ini">Bulan Ini</option>
            <option value="Tahun Ini">Tahun Ini</option>
            <option value="Pilih Rentang">Pilih Rentang</option>
          </select>

          {dateFilter === "Pilih Rentang" && (
            <div className="flex items-center gap-2 ml-2">
              <Input type="date" className="h-9 w-[130px]" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              <span className="text-muted-foreground">-</span>
              <Input type="date" className="h-9 w-[130px]" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          )}

          <Button onClick={handlePrint} variant="outline" className="ml-2">
            <Printer className="mr-2 h-4 w-4" /> Cetak PDF
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3" id="print-area">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pemasukan</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{formatRupiah(totalPemasukan)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pengeluaran</CardTitle>
            <TrendingDown className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-600">{formatRupiah(totalPengeluaran)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Bersih (Profit)</CardTitle>
            <DollarSign className="h-4 w-4 text-sky-500" />
          </CardHeader>
          <CardContent>
            <div className={cn("text-2xl font-bold", saldoBersih >= 0 ? "text-sky-600" : "text-rose-600")}>
              {formatRupiah(saldoBersih)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-7">
        <Card className="md:col-span-4">
          <CardHeader>
            <CardTitle>Tren Arus Kas</CardTitle>
            <CardDescription>Perbandingan pemasukan dan pengeluaran seiring waktu.</CardDescription>
          </CardHeader>
          <CardContent className="pl-0">
            {chartDataFlow.length === 0 ? (
              <div className="flex h-[300px] items-center justify-center text-muted-foreground text-sm">
                Belum ada data transaksi di periode ini.
              </div>
            ) : (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={chartDataFlow} margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorPemasukan" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorPengeluaran" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} dy={10} />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tickFormatter={(val) => `Rp${val / 1000}k`} 
                      tick={{ fontSize: 12 }}
                      width={80}
                    />
                    <Tooltip 
                      formatter={(value: number) => formatRupiah(value)}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Legend iconType="circle" />
                    <Area type="monotone" dataKey="Pemasukan" stroke="#10b981" fillOpacity={1} fill="url(#colorPemasukan)" strokeWidth={2} />
                    <Area type="monotone" dataKey="Pengeluaran" stroke="#f43f5e" fillOpacity={1} fill="url(#colorPengeluaran)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle>Distribusi Pengeluaran</CardTitle>
            <CardDescription>Kemana perginya uang Anda berdasarkan kategori.</CardDescription>
          </CardHeader>
          <CardContent>
            {chartDataCat.length === 0 ? (
               <div className="flex h-[300px] items-center justify-center text-muted-foreground text-sm">
                Tidak ada data pengeluaran.
             </div>
            ) : (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={chartDataCat}
                      cx="50%"
                      cy="45%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {chartDataCat.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatRupiah(value)} />
                    <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* CSS for printing to hide UI elements and format nicely */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * {
            visibility: hidden;
          }
          #print-area, #print-area * {
            visibility: visible;
          }
          #print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}} />
    </div>
  );
}
