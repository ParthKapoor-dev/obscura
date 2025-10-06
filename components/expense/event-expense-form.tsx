'use client';

import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { trpc } from '@/lib/trpc/client';
import { formatCurrency } from '@/lib/utils';
import { CategorySelector } from './category-selector';
import { 
  Users, 
  DollarSign, 
  AlertCircle,
  CheckCircle2,
  Loader2
} from 'lucide-react';

const eventExpenseSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  amount: z.number().positive('Amount must be positive'),
  categoryId: z.string().optional(),
  splits: z.array(
    z.object({
      userId: z.string(),
      share: z.number().positive('Share must be positive'),
    })
  ).min(1, 'At least one split is required'),
});

type EventExpenseFormData = z.infer<typeof eventExpenseSchema>;

interface EventExpenseFormProps {
  eventId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
  initialData?: {
    id?: string;
    description: string;
    amount: number;
    categoryId?: string;
    splits: Array<{
      userId: string;
      share: number;
    }>;
  };
}

export function EventExpenseForm({ eventId, onSuccess, onCancel, initialData }: EventExpenseFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [splitEvenly, setSplitEvenly] = useState(true);
  
  const utils = trpc.useUtils();
  const { data: event } = trpc.event.getById.useQuery({ eventId });
  const createEventExpense = trpc.expense.createEventExpense.useMutation();
  const updateEventExpense = trpc.expense.updateEventExpense.useMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    reset,
    control,
    setValue,
  } = useForm<EventExpenseFormData>({
    resolver: zodResolver(eventExpenseSchema),
    defaultValues: initialData || {
      description: '',
      amount: 0,
      categoryId: '',
      splits: [],
    },
  });

  const { fields, replace } = useFieldArray({
    control,
    name: 'splits',
  });

  const watchedAmount = watch('amount');
  const watchedSplits = watch('splits');

  // Initialize splits when event data is loaded
  useEffect(() => {
    if (event && !initialData) {
      const defaultSplits = event.participants.map(participant => ({
        userId: participant.user.id,
        share: 0,
      }));
      replace(defaultSplits);
    }
  }, [event, initialData, replace]);

  // Update splits when amount changes and split evenly is enabled
  useEffect(() => {
    if (splitEvenly && watchedAmount > 0 && event) {
      const sharePerPerson = watchedAmount / event.participants.length;
      const newSplits = event.participants.map(participant => ({
        userId: participant.user.id,
        share: sharePerPerson,
      }));
      replace(newSplits);
    }
  }, [watchedAmount, splitEvenly, event, replace]);

  const onSubmit = async (data: EventExpenseFormData) => {
    setIsSubmitting(true);
    try {
      if (initialData?.id) {
        await updateEventExpense.mutateAsync({
          id: initialData.id,
          ...data,
        });
      } else {
        await createEventExpense.mutateAsync({
          eventId,
          ...data,
        });
      }
      
      // Invalidate and refetch queries
      await utils.expense.getEventExpenses.invalidate({ eventId });
      await utils.event.getBalance.invalidate({ eventId });
      await utils.event.getById.invalidate({ eventId });
      
      reset();
      onSuccess?.();
    } catch (error) {
      console.error('Error saving expense:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSplitToggle = (userId: string, checked: boolean) => {
    if (checked) {
      // Add user to splits
      const user = event?.participants.find(p => p.user.id === userId);
      if (user) {
        const newSplits = [...watchedSplits, { userId, share: 0 }];
        replace(newSplits);
      }
    } else {
      // Remove user from splits
      const newSplits = watchedSplits.filter(split => split.userId !== userId);
      replace(newSplits);
    }
  };

  const handleShareChange = (userId: string, share: number) => {
    const newSplits = watchedSplits.map(split =>
      split.userId === userId ? { ...split, share } : split
    );
    replace(newSplits);
  };

  const totalShares = watchedSplits.reduce((sum, split) => sum + split.share, 0);
  const isBalanced = Math.abs(totalShares - watchedAmount) < 0.01;

  if (!event) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>
          {initialData?.id ? 'Edit Event Expense' : 'Add Event Expense'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
            <Label htmlFor="amount">Total Amount</Label>
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
              const currentValues = watch();
              reset({ ...currentValues, categoryId: categoryId || undefined });
            }}
            disabled={isSubmitting}
          />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Split Among Participants</Label>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="splitEvenly"
                  checked={splitEvenly}
                  onCheckedChange={(checked) => setSplitEvenly(checked === true)}
                />
                <Label htmlFor="splitEvenly" className="text-sm">
                  Split evenly
                </Label>
              </div>
            </div>

            <div className="space-y-3">
              {event.participants.map((participant) => {
                const isSelected = watchedSplits.some(split => split.userId === participant.user.id);
                const split = watchedSplits.find(s => s.userId === participant.user.id);
                
                return (
                  <div key={participant.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) => handleSplitToggle(participant.user.id, checked === true)}
                      disabled={isSubmitting}
                    />
                    
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={participant.user.avatarUrl || undefined} />
                      <AvatarFallback className="text-xs">
                        {participant.user.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1">
                      <p className="font-medium text-sm">{participant.user.name}</p>
                      <p className="text-xs text-muted-foreground">{participant.user.email}</p>
                    </div>
                    
                    {isSelected && (
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-muted-foreground">$</span>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={split?.share || 0}
                          onChange={(e) => handleShareChange(participant.user.id, parseFloat(e.target.value) || 0)}
                          className="w-20 text-sm"
                          disabled={splitEvenly || isSubmitting}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {watchedSplits.length > 0 && (
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center justify-between text-sm">
                  <span>Total split:</span>
                  <div className="flex items-center space-x-2">
                    <span className={isBalanced ? 'text-green-600' : 'text-red-600'}>
                      ${totalShares.toFixed(2)}
                    </span>
                    {isBalanced ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-600" />
                    )}
                  </div>
                </div>
                {!isBalanced && (
                  <p className="text-xs text-red-600 mt-1">
                    Splits must add up to the total amount (${watchedAmount.toFixed(2)})
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="flex space-x-2 pt-4">
            <Button
              type="submit"
              disabled={isSubmitting || !isBalanced || watchedSplits.length === 0}
              className="flex-1"
            >
              {isSubmitting ? 'Saving...' : initialData?.id ? 'Update Expense' : 'Add Expense'}
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