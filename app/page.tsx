'use client';

import { useSession, signOut } from '@/lib/auth/client';
import { trpc } from '@/lib/trpc/client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

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
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">Obscura</h1>
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
                <span className="text-sm font-medium text-gray-700">
                  {user?.name}
                </span>
              </div>
              <button
                onClick={() => signOut()}
                className="bg-gray-800 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-700"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="border-4 border-dashed border-gray-200 rounded-lg h-96 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Welcome to Obscura!
              </h2>
              <p className="text-gray-600 mb-6">
                Your personal expense tracking and bill-splitting app.
              </p>
              <div className="space-y-2 text-sm text-gray-500">
                <p>✅ Authentication setup complete</p>
                <p>✅ Database schema ready</p>
                <p>✅ tRPC APIs configured</p>
                <p>🔄 Ready for Phase 2: Core Expense Tracking</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
