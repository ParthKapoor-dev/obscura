'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Plus, 
  Search, 
  Calendar,
  Users,
  DollarSign,
  MoreVertical,
  Edit,
  Trash2,
  Eye
} from 'lucide-react';
import { CreateEventDialog } from './create-event-dialog';
import { EventDetailsDialog } from './event-details-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface EventsListProps {
  limit?: number;
  showAddButton?: boolean;
}

export function EventsList({ limit = 20, showAddButton = true }: EventsListProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const utils = trpc.useUtils();
  const { data: events, isLoading: eventsLoading } = trpc.event.getAll.useQuery();
  const { data: currentUser, isLoading: userLoading } = trpc.user.getProfile.useQuery();

  const deleteEvent = trpc.event.delete.useMutation({
    onSuccess: () => {
      utils.event.getAll.invalidate();
    },
  });

  const handleDeleteEvent = async (eventId: string, eventName: string) => {
    if (confirm(`Are you sure you want to delete "${eventName}"? This will also delete all associated expenses.`)) {
      await deleteEvent.mutateAsync({ eventId });
    }
  };

  const filteredEvents = events?.filter(event =>
    event.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const isLoading = eventsLoading || userLoading;

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
      {showAddButton && (
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-foreground">Events</h2>
          <Button onClick={() => setShowCreateDialog(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create Event
          </Button>
        </div>
      )}

      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search events..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {filteredEvents.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm ? 'No events found' : 'No events yet'}
            </h3>
            <p className="text-gray-500 mb-4">
              {searchTerm 
                ? 'Try adjusting your search terms'
                : 'Create an event to start splitting expenses with friends'
              }
            </p>
            {!searchTerm && showAddButton && (
              <Button onClick={() => setShowCreateDialog(true)} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Create Your First Event
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredEvents.slice(0, limit).map((event) => {
            const totalExpenses = event.expenses.length;
            const totalAmount = event.expenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);
            const isCreator = event.createdBy.id === currentUser?.id;

            return (
              <Card key={event.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="font-medium text-foreground text-lg">
                          {event.name}
                        </h3>
                        {isCreator && (
                          <Badge variant="secondary" className="text-xs">
                            Creator
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-3">
                        <div className="flex items-center space-x-1">
                          <Users className="h-4 w-4" />
                          <span>{event.participants.length} participant{event.participants.length !== 1 ? 's' : ''}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <DollarSign className="h-4 w-4" />
                          <span>${totalAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-4 w-4" />
                          <span>{totalExpenses} expense{totalExpenses !== 1 ? 's' : ''}</span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <div className="flex -space-x-2">
                          {event.participants.slice(0, 3).map((participant) => (
                            <Avatar key={participant.id} className="h-6 w-6 border-2 border-background">
                              <AvatarImage src={participant.user.avatarUrl || undefined} />
                              <AvatarFallback className="text-xs">
                                {participant.user.name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                          {event.participants.length > 3 && (
                            <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                              +{event.participants.length - 3}
                            </div>
                          )}
                        </div>
                        <span className="text-sm text-muted-foreground">
                          Created {new Date(event.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedEvent(event.id)}
                        className="flex items-center gap-1"
                      >
                        <Eye className="h-4 w-4" />
                        View
                      </Button>
                      
                      {isCreator && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setSelectedEvent(event.id)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDeleteEvent(event.id, event.name)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <CreateEventDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={() => {
          setShowCreateDialog(false);
          utils.event.getAll.invalidate();
        }}
      />

      {selectedEvent && (
        <EventDetailsDialog
          eventId={selectedEvent}
          open={!!selectedEvent}
          onOpenChange={(open) => !open && setSelectedEvent(null)}
        />
      )}
    </div>
  );
}