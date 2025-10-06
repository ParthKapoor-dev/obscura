'use client';

import { ExpenseList } from '@/components/expense/expense-list';

export default function ExpensesPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Personal Expenses</h1>
      </div>
      <ExpenseList showAddButton={true} />
    </div>
  );
}