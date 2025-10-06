'use client';

import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  UserPlus, 
  AlertCircle,
  Loader2,
  CheckCircle2
} from 'lucide-react';

interface CreateEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateEventDialog({ open, onOpenChange, onSuccess }: CreateEventDialogProps) {
  const [eventName, setEventName] = useState('');
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [error, setError] = useState('');

  const utils = trpc.useUtils();
  const { data: friends, isLoading: friendsLoading } = trpc.friend.getAll.useQuery();
  const createEvent = trpc.event.create.useMutation({
    onSuccess: () => {
      onSuccess();
      setEventName('');
      setSelectedFriends([]);
      setError('');
    },
    onError: (error) => {
      setError(error.message);
    },
  });

  const handleFriendToggle = (friendId: string) => {
    setSelectedFriends(prev => 
      prev.includes(friendId) 
        ? prev.filter(id => id !== friendId)
        : [...prev, friendId]
    );
  };

  const handleCreate = async () => {
    if (!eventName.trim()) {
      setError('Event name is required');
      return;
    }

    if (selectedFriends.length === 0) {
      setError('Please select at least one friend');
      return;
    }

    setError('');
    await createEvent.mutateAsync({
      name: eventName.trim(),
      participantIds: selectedFriends,
    });
  };

  const handleClose = () => {
    onOpenChange(false);
    setEventName('');
    setSelectedFriends([]);
    setError('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCreate();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Event</DialogTitle>
          <DialogDescription>
            Create a new event to split expenses with your friends.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="eventName">Event Name</Label>
            <Input
              id="eventName"
              placeholder="e.g., Weekend Trip, Dinner Party"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              onKeyPress={handleKeyPress}
            />
          </div>

          <div className="space-y-2">
            <Label>Select Friends</Label>
            {friendsLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : friends && friends.length > 0 ? (
              <div className="max-h-48 overflow-y-auto space-y-2 border rounded-md p-3">
                {friends.map((friendship) => (
                  <div
                    key={friendship.id}
                    className="flex items-center space-x-3 p-2 rounded-md hover:bg-muted cursor-pointer"
                    onClick={() => handleFriendToggle(friendship.friend.id)}
                  >
                    <Checkbox
                      checked={selectedFriends.includes(friendship.friend.id)}
                      onChange={() => handleFriendToggle(friendship.friend.id)}
                    />
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={friendship.friend.avatarUrl || undefined} />
                      <AvatarFallback>
                        {friendship.friend.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{friendship.friend.name}</p>
                      <p className="text-xs text-muted-foreground">{friendship.friend.email}</p>
                    </div>
                    {selectedFriends.includes(friendship.friend.id) && (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-2" />
                <p className="text-sm">No friends found</p>
                <p className="text-xs">Add friends first to create an event</p>
              </div>
            )}
          </div>

          {selectedFriends.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedFriends.map((friendId) => {
                const friend = friends?.find(f => f.friend.id === friendId);
                return friend ? (
                  <Badge key={friendId} variant="secondary" className="flex items-center gap-1">
                    <Avatar className="h-4 w-4">
                      <AvatarImage src={friend.friend.avatarUrl || undefined} />
                      <AvatarFallback className="text-xs">
                        {friend.friend.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {friend.friend.name}
                  </Badge>
                ) : null;
              })}
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleCreate}
            disabled={createEvent.isPending || !eventName.trim() || selectedFriends.length === 0}
            className="flex items-center gap-2"
          >
            {createEvent.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UserPlus className="h-4 w-4" />
            )}
            Create Event
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}