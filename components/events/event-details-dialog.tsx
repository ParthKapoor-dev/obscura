'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Users, 
  DollarSign, 
  Calendar,
  Plus,
  Edit,
  Trash2,
  UserPlus,
  UserMinus,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { EventExpenseForm } from '@/components/expense/event-expense-form';
import { EventExpenseList } from './event-expense-list';
import { EventBalanceView } from './event-balance-view';

interface EventDetailsDialogProps {
  eventId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EventDetailsDialog({ eventId, open, onOpenChange }: EventDetailsDialogProps) {
  const [activeTab, setActiveTab] = useState('expenses');
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any>(null);

  const utils = trpc.useUtils();
  const { data: event, isLoading: eventLoading } = trpc.event.getById.useQuery(
    { eventId },
    { enabled: open && !!eventId }
  );
  const { data: balance } = trpc.event.getBalance.useQuery(
    { eventId },
    { enabled: open && !!eventId }
  );
  const { data: currentUser, isLoading: userLoading } = trpc.user.getProfile.useQuery();

  const deleteEvent = trpc.event.delete.useMutation({
    onSuccess: () => {
      onOpenChange(false);
      utils.event.getAll.invalidate();
    },
  });

  const handleDeleteEvent = async () => {
    if (!event) return;
    
    if (confirm(`Are you sure you want to delete "${event.name}"? This will also delete all associated expenses.`)) {
      await deleteEvent.mutateAsync({ eventId });
    }
  };

  const handleEditExpense = (expense: any) => {
    setEditingExpense(expense);
    setShowAddExpense(true);
  };

  const handleFormSuccess = () => {
    setShowAddExpense(false);
    setEditingExpense(null);
    utils.event.getById.invalidate({ eventId });
    utils.event.getBalance.invalidate({ eventId });
  };

  const handleFormCancel = () => {
    setShowAddExpense(false);
    setEditingExpense(null);
  };

  const isLoading = eventLoading || userLoading;

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Loading...</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!event) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Event not found</DialogTitle>
            <DialogDescription>
              The event you're looking for doesn't exist or you don't have access to it.
            </DialogDescription>
          </DialogHeader>
          <div className="text-center py-4">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const totalExpenses = event.expenses.length;
  const totalAmount = event.expenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);
  const isCreator = event.createdBy.id === currentUser?.id;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-2xl">{event.name}</DialogTitle>
              <DialogDescription>
                Created by {event.createdBy.name} • {new Date(event.createdAt).toLocaleDateString()}
              </DialogDescription>
            </div>
            {isCreator && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDeleteEvent}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Event
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Participants</p>
                  <p className="text-2xl font-bold text-blue-600">{event.participants.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Total Amount</p>
                  <p className="text-2xl font-bold text-green-600">${totalAmount.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Expenses</p>
                  <p className="text-2xl font-bold text-purple-600">{totalExpenses}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center justify-between mb-4">
          <div className="flex -space-x-2">
            {event.participants.slice(0, 5).map((participant) => (
              <Avatar key={participant.id} className="h-8 w-8 border-2 border-background">
                <AvatarImage src={participant.user.avatarUrl || undefined} />
                <AvatarFallback className="text-xs">
                  {participant.user.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            ))}
            {event.participants.length > 5 && (
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                +{event.participants.length - 5}
              </div>
            )}
          </div>
          <Button onClick={() => setShowAddExpense(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Expense
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="expenses">Expenses</TabsTrigger>
            <TabsTrigger value="balance">Balance</TabsTrigger>
            <TabsTrigger value="participants">Participants</TabsTrigger>
          </TabsList>

          <TabsContent value="expenses" className="space-y-4">
            <EventExpenseList
              eventId={eventId}
              onEditExpense={handleEditExpense}
            />
          </TabsContent>

          <TabsContent value="balance" className="space-y-4">
            <EventBalanceView eventId={eventId} balance={balance} />
          </TabsContent>

          <TabsContent value="participants" className="space-y-4">
            <div className="space-y-3">
              {event.participants.map((participant) => (
                <div key={participant.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={participant.user.avatarUrl || undefined} />
                      <AvatarFallback>
                        {participant.user.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{participant.user.name}</p>
                      <p className="text-sm text-muted-foreground">{participant.user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {participant.user.id === event.createdBy.id && (
                      <Badge variant="secondary">Creator</Badge>
                    )}
                    {participant.user.id === currentUser?.id && (
                      <Badge variant="outline">You</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {showAddExpense && (
          <EventExpenseForm
            eventId={eventId}
            onSuccess={handleFormSuccess}
            onCancel={handleFormCancel}
            initialData={editingExpense ? {
              id: editingExpense.id,
              description: editingExpense.description,
              amount: parseFloat(editingExpense.amount),
              categoryId: editingExpense.category?.id,
              splits: editingExpense.splits?.map((split: any) => ({
                userId: split.user.id,
                share: parseFloat(split.share),
              })) || [],
            } : undefined}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}