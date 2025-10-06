'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Mail, 
  User, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Loader2
} from 'lucide-react';

interface AddFriendDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddFriendDialog({ open, onOpenChange, onSuccess }: AddFriendDialogProps) {
  const [email, setEmail] = useState('');
  const [searchResult, setSearchResult] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState('');

  const utils = trpc.useUtils();
  const searchUser = trpc.friend.searchByEmail.useQuery(
    { email },
    { 
      enabled: false,
      retry: false,
    }
  );
  const addFriend = trpc.friend.addByEmail.useMutation({
    onSuccess: () => {
      onSuccess();
      setEmail('');
      setSearchResult(null);
      setError('');
    },
    onError: (error) => {
      setError(error.message);
    },
  });

  const handleSearch = async () => {
    if (!email.trim()) {
      setError('Please enter an email address');
      return;
    }

    setError('');
    setIsSearching(true);
    
    try {
      const result = await searchUser.refetch();
      setSearchResult(result.data);
    } catch (err) {
      setError('Failed to search for user');
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddFriend = async () => {
    if (!searchResult) return;
    
    await addFriend.mutateAsync({ email: searchResult.email });
  };

  const handleClose = () => {
    onOpenChange(false);
    setEmail('');
    setSearchResult(null);
    setError('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Friend</DialogTitle>
          <DialogDescription>
            Search for a friend by their email address to add them to your friends list.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <div className="flex space-x-2">
              <div className="relative flex-1">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  id="email"
                  type="email"
                  placeholder="friend@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="pl-10"
                />
              </div>
              <Button 
                onClick={handleSearch} 
                disabled={isSearching || !email.trim()}
                variant="outline"
              >
                {isSearching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Search'
                )}
              </Button>
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {searchResult && (
            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center space-x-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={searchResult.avatarUrl || undefined} />
                  <AvatarFallback>
                    {searchResult.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="font-medium text-foreground">
                    {searchResult.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {searchResult.email}
                  </p>
                </div>
                <div className="flex flex-col items-end space-y-1">
                  {searchResult.isSelf ? (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      You
                    </Badge>
                  ) : searchResult.isAlreadyFriend ? (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Already Friends
                    </Badge>
                  ) : (
                    <Badge variant="default" className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      Available
                    </Badge>
                  )}
                </div>
              </div>

              {searchResult.isSelf && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    You cannot add yourself as a friend.
                  </AlertDescription>
                </Alert>
              )}

              {searchResult.isAlreadyFriend && (
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>
                    You are already friends with this person.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          {searchResult && !searchResult.isSelf && !searchResult.isAlreadyFriend && (
            <Button 
              onClick={handleAddFriend}
              disabled={addFriend.isPending}
              className="flex items-center gap-2"
            >
              {addFriend.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              Add Friend
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}