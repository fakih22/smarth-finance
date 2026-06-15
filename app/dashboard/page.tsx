"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet, TrendingUp, TrendingDown, PiggyBank } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#ef4444', '#10b981', '#f59e0b'];

export default function DashboardPage() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [savingsTarget, setSavingsTarget] = useState(15000000); // Default dummy target

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "transactions"), where("userId", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data());
      setTransactions(data);
    });
    return () => unsubscribe();
  }, [user]);

  // Calculations
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const thisMonthTransactions = transactions.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const totalPemasukanBulanIni = thisMonthTransactions
    .filter(t => t.type === "Pemasukan")
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalPengeluaranBulanIni = thisMonthTransactions
    .filter(t => t.type === "Pengeluaran")
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalPemasukanAll = transactions.filter(t => t.type === "Pemasukan").reduce((a, b) => a + b.amount, 0);
  const totalPengeluaranAll = transactions.filter(t => t.type === "Pengeluaran").reduce((a, b) => a + b.amount, 0);
  const totalSaldo = totalPemasukanAll - totalPengeluaranAll;

  // Recharts Data Transformation (Monthly Cashflow)
  const cashFlowMap: Record<string, { pemasukan: number, pengeluaran: number }> = {};
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];
  
  transactions.forEach(t => {
    const d = new Date(t.date);
    if (d.getFullYear() === currentYear) {
      const monthStr = monthNames[d.getMonth()];
      if (!cashFlowMap[monthStr]) cashFlowMap[monthStr] = { pemasukan: 0, pengeluaran: 0 };
      if (t.type === "Pemasukan") cashFlowMap[monthStr].pemasukan += t.amount;
      if (t.type === "Pengeluaran") cashFlowMap[monthStr].pengeluaran += t.amount;
    }
  });

  const dataCashFlow = monthNames.map(m => ({
    name: m,
    pemasukan: cashFlowMap[m]?.pemasukan || 0,
    pengeluaran: cashFlowMap[m]?.pengeluaran || 0,
  }));

  // Recharts Data Transformation (Expense Pie Chart)
  const pieMap: Record<string, number> = {};
  thisMonthTransactions.filter(t => t.type === "Pengeluaran").forEach(t => {
    pieMap[t.category] = (pieMap[t.category] || 0) + t.amount;
  });
  const dataPie = Object.keys(pieMap).map(k => ({ name: k, value: pieMap[k] }));

  const formatRupiah = (num: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(num);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Ringkasan Keuangan</h2>
        <p className="text-muted-foreground">Monitor aktivitas keuangan Anda bulan ini secara realtime.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Saldo</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatRupiah(totalSaldo)}</div>
            <p className="text-xs text-muted-foreground">Akumulasi seluruh waktu</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pemasukan Bulan Ini</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{formatRupiah(totalPemasukanBulanIni)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pengeluaran Bulan Ini</CardTitle>
            <TrendingDown className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-600">{formatRupiah(totalPengeluaranBulanIni)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tabungan</CardTitle>
            <PiggyBank className="h-4 w-4 text-sky-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-sky-600">{formatRupiah(totalSaldo > 0 ? totalSaldo : 0)}</div>
            <p className="text-xs text-muted-foreground">Dari target {formatRupiah(savingsTarget)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Cash Flow ({currentYear})</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={dataCashFlow}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `Rp${value / 1000}k`} />
                <Tooltip cursor={{fill: 'transparent'}} formatter={(value: number) => formatRupiah(value)} />
                <Legend />
                <Bar dataKey="pemasukan" name="Pemasukan" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="pengeluaran" name="Pengeluaran" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Pengeluaran per Kategori (Bulan Ini)</CardTitle>
          </CardHeader>
          <CardContent>
            {dataPie.length === 0 ? (
              <div className="h-[350px] flex items-center justify-center text-muted-foreground">Belum ada pengeluaran</div>
            ) : (
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie data={dataPie} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                    {dataPie.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatRupiah(value)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
