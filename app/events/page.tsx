'use client';

import { EventsList } from '@/components/events/events-list';

export default function EventsPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Events & Trips</h1>
      </div>
      <EventsList showAddButton={true} />
    </div>
  );
}