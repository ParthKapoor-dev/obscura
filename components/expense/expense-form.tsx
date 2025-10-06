'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { trpc } from '@/lib/trpc/client';
import { formatCurrency } from '@/lib/utils';
import { CategorySelector } from './category-selector';

const expenseSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  amount: z.number().positive('Amount must be positive'),
  categoryId: z.string().optional(),
  eventId: z.string().optional(),
  splits: z.array(
    z.object({
      userId: z.string(),
      share: z.number().positive('Share must be positive'),
    })
  ).optional(),
});

type ExpenseFormData = z.infer<typeof expenseSchema>;

interface ExpenseFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  initialData?: {
    id?: string;
    description: string;
    amount: number;
    categoryId?: string;
    eventId?: string;
    splits?: Array<{
      userId: string;
      share: number;
    }>;
  };
}

export function ExpenseForm({ onSuccess, onCancel, initialData }: ExpenseFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const utils = trpc.useUtils();
  const createExpense = trpc.expense.create.useMutation();
  const updateExpense = trpc.expense.update.useMutation();
  const createEventExpense = trpc.expense.createEventExpense.useMutation();
  const updateEventExpense = trpc.expense.updateEventExpense.useMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    reset,
  } = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: initialData || {
      description: '',
      amount: 0,
      categoryId: '',
    },
  });

  const watchedAmount = watch('amount');

  const onSubmit = async (data: ExpenseFormData) => {
    setIsSubmitting(true);
    try {
      if (data.eventId) {
        // Event expense
        if (initialData?.id) {
          await updateEventExpense.mutateAsync({
            id: initialData.id,
            description: data.description,
            amount: data.amount,
            categoryId: data.categoryId,
            splits: data.splits || [],
          });
        } else {
          await createEventExpense.mutateAsync({
            eventId: data.eventId,
            description: data.description,
            amount: data.amount,
            categoryId: data.categoryId,
            splits: data.splits || [],
          });
        }
        
        // Invalidate event-related queries
        await utils.expense.getEventExpenses.invalidate({ eventId: data.eventId });
        await utils.event.getBalance.invalidate({ eventId: data.eventId });
        await utils.event.getById.invalidate({ eventId: data.eventId });
      } else {
        // Personal expense
        if (initialData?.id) {
          await updateExpense.mutateAsync({
            id: initialData.id,
            description: data.description,
            amount: data.amount,
            categoryId: data.categoryId,
          });
        } else {
          await createExpense.mutateAsync({
            description: data.description,
            amount: data.amount,
            categoryId: data.categoryId,
          });
        }
        
        // Invalidate personal expense queries
        await utils.expense.getPersonalExpenses.invalidate();
        await utils.expense.getSummary.invalidate();
        await utils.expense.getRecent.invalidate();
      }
      
      reset();
      onSuccess?.();
    } catch (error) {
      console.error('Error saving expense:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>
          {initialData ? 'Edit Expense' : 'Add New Expense'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              placeholder="What did you spend on?"
              {...register('description')}
            />
            {errors.description && (
              <p className="text-sm text-red-600">{errors.description.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                $
              </span>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                className="pl-8"
                {...register('amount', { valueAsNumber: true })}
              />
            </div>
            {errors.amount && (
              <p className="text-sm text-red-600">{errors.amount.message}</p>
            )}
            {watchedAmount > 0 && (
              <p className="text-sm text-gray-600">
                {formatCurrency(watchedAmount)}
              </p>
            )}
          </div>

          <CategorySelector
            selectedCategoryId={watch('categoryId')}
            onCategoryChange={(categoryId) => {
              // Update the form value
              const currentValues = watch();
              reset({ ...currentValues, categoryId: categoryId || undefined });
            }}
            disabled={isSubmitting}
          />

          <div className="flex space-x-2 pt-4">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? 'Saving...' : initialData ? 'Update' : 'Add Expense'}
            </Button>
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}