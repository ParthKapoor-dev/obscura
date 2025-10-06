'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  UserPlus, 
  UserMinus, 
  Search, 
  Mail, 
  User,
  AlertCircle,
  CheckCircle2,
  X
} from 'lucide-react';
import { AddFriendDialog } from './add-friend-dialog';

interface FriendsListProps {
  limit?: number;
  showAddButton?: boolean;
}

export function FriendsList({ limit = 20, showAddButton = true }: FriendsListProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const utils = trpc.useUtils();
  const { data: friends, isLoading } = trpc.friend.getAll.useQuery();

  const removeFriend = trpc.friend.remove.useMutation({
    onSuccess: () => {
      utils.friend.getAll.invalidate();
    },
  });

  const handleRemoveFriend = async (friendId: string, friendName: string) => {
    if (confirm(`Are you sure you want to remove ${friendName} from your friends?`)) {
      await removeFriend.mutateAsync({ friendId });
    }
  };

  const filteredFriends = friends?.filter(friend =>
    friend.friend.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    friend.friend.email.toLowerCase().includes(searchTerm.toLowerCase())
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
      {showAddButton && (
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-foreground">Friends</h2>
          <Button onClick={() => setShowAddDialog(true)} className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Add Friend
          </Button>
        </div>
      )}

      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search friends..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {filteredFriends.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm ? 'No friends found' : 'No friends yet'}
            </h3>
            <p className="text-gray-500 mb-4">
              {searchTerm 
                ? 'Try adjusting your search terms'
                : 'Add friends by their email address to start splitting expenses'
              }
            </p>
            {!searchTerm && showAddButton && (
              <Button onClick={() => setShowAddDialog(true)} className="flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Add Your First Friend
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredFriends.slice(0, limit).map((friendship) => (
            <Card key={friendship.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={friendship.friend.avatarUrl || undefined} />
                      <AvatarFallback>
                        {friendship.friend.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-medium text-foreground">
                        {friendship.friend.name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {friendship.friend.email}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Added {new Date(friendship.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Friend
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveFriend(friendship.friend.id, friendship.friend.name)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <UserMinus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AddFriendDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSuccess={() => {
          setShowAddDialog(false);
          utils.friend.getAll.invalidate();
        }}
      />
    </div>
  );
}