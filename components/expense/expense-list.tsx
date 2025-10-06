'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/lib/trpc/client';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { ExpenseForm } from './expense-form';

interface ExpenseListProps {
  limit?: number;
  showAddButton?: boolean;
}

export function ExpenseList({ limit = 20, showAddButton = true }: ExpenseListProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<{
    id: string;
    description: string;
    amount: number;
    categoryId?: string;
  } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const utils = trpc.useUtils();
  const { data: expenses, isLoading } = trpc.expense.getPersonalExpenses.useQuery({
    limit,
    offset: 0,
  });

  const deleteExpense = trpc.expense.delete.useMutation({
    onSuccess: () => {
      utils.expense.getPersonalExpenses.invalidate();
      utils.expense.getSummary.invalidate();
      utils.expense.getRecent.invalidate();
    },
  });

  const handleEdit = (expense: any) => {
    setEditingExpense({
      id: expense.id,
      description: expense.description,
      amount: parseFloat(expense.amount),
      categoryId: expense.category?.id,
    });
  };

  const handleDelete = async (expenseId: string) => {
    if (confirm('Are you sure you want to delete this expense?')) {
      await deleteExpense.mutateAsync({ id: expenseId });
    }
  };

  const handleFormSuccess = () => {
    setShowAddForm(false);
    setEditingExpense(null);
  };

  const handleFormCancel = () => {
    setShowAddForm(false);
    setEditingExpense(null);
  };

  const filteredExpenses = expenses?.filter(expense =>
    expense.description.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Expenses</CardTitle>
            {showAddButton && (
              <Button onClick={() => setShowAddForm(true)}>
                Add Expense
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Input
              placeholder="Search expenses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            
            {showAddForm && (
              <ExpenseForm
                onSuccess={handleFormSuccess}
                onCancel={handleFormCancel}
              />
            )}

            {editingExpense && (
              <ExpenseForm
                initialData={editingExpense}
                onSuccess={handleFormSuccess}
                onCancel={handleFormCancel}
              />
            )}

            {filteredExpenses.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {searchTerm ? 'No expenses found matching your search.' : 'No expenses yet. Add your first expense!'}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredExpenses.map((expense) => (
                  <div
                    key={expense.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium">{expense.description}</h3>
                        {expense.category && (
                          <div 
                            className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold text-white"
                            style={{ backgroundColor: expense.category.color }}
                          >
                            {expense.category.icon && <span className="mr-1">{expense.category.icon}</span>}
                            {expense.category.name}
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">
                        {formatDateTime(expense.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-lg">
                        {formatCurrency(parseFloat(expense.amount))}
                      </span>
                      <div className="flex space-x-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(expense)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(expense.id)}
                          disabled={deleteExpense.isPending}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}