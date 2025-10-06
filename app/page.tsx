'use client';

import { useSession, signOut } from '@/lib/auth/client';
import { trpc } from '@/lib/trpc/client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { ExpenseSummary } from '@/components/expense/expense-summary';
import { DollarSign, Calendar, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

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
              <h1 className="text-3xl font-bold text-foreground mb-6">
                Dashboard
              </h1>
              <ExpenseSummary />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push('/expenses')}>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3">
                    <div className="p-3 rounded-full bg-primary/10">
                      <DollarSign className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">Personal Expenses</h3>
                      <p className="text-sm text-muted-foreground">Track individual spending</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push('/events')}>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3">
                    <div className="p-3 rounded-full bg-secondary/10">
                      <Calendar className="h-5 w-5 text-secondary-foreground" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">Events & Trips</h3>
                      <p className="text-sm text-muted-foreground">Split bills with friends</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push('/friends')}>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3">
                    <div className="p-3 rounded-full bg-accent/10">
                      <Users className="h-5 w-5 text-accent-foreground" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">Friends</h3>
                      <p className="text-sm text-muted-foreground">Manage your contacts</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
    </div>
  );
}
