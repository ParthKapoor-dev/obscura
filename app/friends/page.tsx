'use client';

import { FriendsList } from '@/components/friends/friends-list';

export default function FriendsPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Friends</h1>
      </div>
      <FriendsList showAddButton={true} />
    </div>
  );
}