import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const user_id = searchParams.get("user_id");
  const year = searchParams.get("year") || new Date().getFullYear().toString();
  if (!user_id) return NextResponse.json({ error: "user_id required" }, { status: 400 });

  const [invoicesRes, expensesRes, inventoryRes] = await Promise.all([
    supabaseAdmin.from("invoices").select("total,status,currency,paid_at,created_at,items").eq("user_id", user_id),
    supabaseAdmin.from("expenses").select("amount,currency,date,category").eq("user_id", user_id),
    supabaseAdmin.from("inventory").select("id,name,quantity,cost_price,selling_price,low_stock_alert").eq("user_id", user_id),
  ]);

  const invoices = invoicesRes.data ?? [];
  const expenses = expensesRes.data ?? [];
  const inventory = inventoryRes.data ?? [];

  // Revenue from paid invoices this year
  const paidInvoices = invoices.filter((i: any) => i.status === "paid" && i.paid_at && new Date(i.paid_at).getFullYear().toString() === year);
  const totalRevenue = paidInvoices.reduce((sum: number, i: any) => sum + Number(i.total), 0);

  // Total expenses this year
  const yearExpenses = expenses.filter((e: any) => e.date && new Date(e.date).getFullYear().toString() === year);
  const totalExpenses = yearExpenses.reduce((sum: number, e: any) => sum + Number(e.amount), 0);

  // Monthly breakdown
  const months = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    label: new Date(2000, i).toLocaleString("default", { month: "short" }),
    revenue: 0,
    expenses: 0,
  }));

  paidInvoices.forEach((inv: any) => {
    const m = new Date(inv.paid_at).getMonth();
    months[m].revenue += Number(inv.total);
  });

  yearExpenses.forEach((exp: any) => {
    const m = new Date(exp.date).getMonth();
    months[m].expenses += Number(exp.amount);
  });

  // Expense by category
  const expenseByCategory: Record<string, number> = {};
  yearExpenses.forEach((e: any) => {
    expenseByCategory[e.category] = (expenseByCategory[e.category] || 0) + Number(e.amount);
  });

  // Outstanding invoices
  const outstanding = invoices.filter((i: any) => i.status === "sent" || i.status === "draft");
  const totalOutstanding = outstanding.reduce((sum: number, i: any) => sum + Number(i.total), 0);

  // Low stock items
  const lowStock = inventory.filter((i: any) => Number(i.quantity) <= Number(i.low_stock_alert));

  // Inventory value
  const inventoryValue = inventory.reduce((sum: number, i: any) => sum + Number(i.quantity) * Number(i.cost_price), 0);

  // Top selling products from invoice items
  const productSales: Record<string, { qty: number; revenue: number }> = {};
  paidInvoices.forEach((inv: any) => {
    if (Array.isArray(inv.items)) {
      inv.items.forEach((item: any) => {
        if (!item.description) return;
        if (!productSales[item.description]) productSales[item.description] = { qty: 0, revenue: 0 };
        productSales[item.description].qty += Number(item.qty) || 0;
        productSales[item.description].revenue += (Number(item.qty) || 0) * (Number(item.unit_price) || 0);
      });
    }
  });
  const topProducts = Object.entries(productSales)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  return NextResponse.json({
    totalRevenue, totalExpenses,
    grossProfit: totalRevenue - totalExpenses,
    totalOutstanding,
    invoiceCount: invoices.length,
    paidCount: paidInvoices.length,
    months,
    expenseByCategory,
    lowStock,
    inventoryValue,
    topProducts,
  });
}