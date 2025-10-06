'use client';

import { useSession, signOut } from '@/lib/auth/client';
import { trpc } from '@/lib/trpc/client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { ExpenseSummary } from '@/components/expense/expense-summary';
import { ExpenseList } from '@/components/expense/expense-list';
import { FriendsList } from '@/components/friends/friends-list';
import { EventsList } from '@/components/events/events-list';

export default function Home() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const { data: user, isLoading: userLoading } = trpc.user.getProfile.useQuery(
    undefined,
    {
      enabled: !!session,
    }
  );

  useEffect(() => {
    if (!isPending && !session) {
      router.push('/auth');
    }
  }, [session, isPending, router]);

  if (isPending || userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="bg-card shadow border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-card-foreground">
                Obscura
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                {user?.avatarUrl && (
                  <img
                    className="h-8 w-8 rounded-full"
                    src={user.avatarUrl}
                    alt={user.name}
                  />
                )}
                <span className="text-sm font-medium text-muted-foreground">
                  {user?.name}
                </span>
              </div>
              <button
                onClick={() => signOut()}
                className="bg-primary text-primary-foreground px-3 py-2 rounded-md text-sm font-medium hover:bg-primary/90"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0 space-y-8">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-6">
              Expense Dashboard
            </h2>
            <ExpenseSummary />
          </div>
          
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-6">
              All Expenses
            </h2>
            <ExpenseList />
          </div>

          <div>
            <h2 className="text-2xl font-bold text-foreground mb-6">
              Friends
            </h2>
            <FriendsList />
          </div>

          <div>
            <h2 className="text-2xl font-bold text-foreground mb-6">
              Events
            </h2>
            <EventsList />
          </div>
        </div>
      </main>
    </div>
  );
}
