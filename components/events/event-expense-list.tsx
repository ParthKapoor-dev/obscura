'use client';

import { trpc } from '@/lib/trpc/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Edit, 
  Trash2, 
  DollarSign,
  Calendar,
  User
} from 'lucide-react';

interface EventExpenseListProps {
  eventId: string;
  onEditExpense: (expense: any) => void;
}

export function EventExpenseList({ eventId, onEditExpense }: EventExpenseListProps) {
  const utils = trpc.useUtils();
  const { data: expenses, isLoading } = trpc.expense.getEventExpenses.useQuery({
    eventId,
    limit: 50,
    offset: 0,
  });

  const deleteExpense = trpc.expense.delete.useMutation({
    onSuccess: () => {
      utils.expense.getEventExpenses.invalidate({ eventId });
      utils.event.getBalance.invalidate({ eventId });
    },
  });

  const handleDelete = async (expenseId: string, description: string) => {
    if (confirm(`Are you sure you want to delete "${description}"?`)) {
      await deleteExpense.mutateAsync({ id: expenseId });
    }
  };

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

  if (!expenses || expenses.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No expenses yet</h3>
          <p className="text-gray-500">Add the first expense to start tracking shared costs.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {expenses.map((expense) => (
        <Card key={expense.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <h3 className="font-medium text-foreground">{expense.description}</h3>
                  {expense.category && (
                    <Badge 
                      variant="secondary" 
                      style={{ backgroundColor: expense.category.color + '20', color: expense.category.color }}
                    >
                      {expense.category.name}
                    </Badge>
                  )}
                </div>
                
                <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-3">
                  <div className="flex items-center space-x-1">
                    <User className="h-4 w-4" />
                    <span>Paid by {expense.paidBy.name}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-4 w-4" />
                    <span>{new Date(expense.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-lg font-bold text-green-600">
                    ${parseFloat(expense.amount).toFixed(2)}
                  </span>
                  <span className="text-sm text-muted-foreground">•</span>
                  <span className="text-sm text-muted-foreground">
                    Split among {expense.splits.length} person{expense.splits.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {expense.splits.length > 0 && (
                  <div className="mt-3 space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Split details:</p>
                    <div className="flex flex-wrap gap-2">
                      {expense.splits.map((split) => (
                        <div key={split.id} className="flex items-center space-x-1 text-sm">
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={split.user.avatarUrl || undefined} />
                            <AvatarFallback className="text-xs">
                              {split.user.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span>{split.user.name}:</span>
                          <span className="font-medium">${parseFloat(split.share).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEditExpense(expense)}
                  className="flex items-center gap-1"
                >
                  <Edit className="h-4 w-4" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(expense.id, expense.description)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}