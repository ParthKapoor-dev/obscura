import { z } from 'zod';
import { eq, and, desc, inArray, or } from 'drizzle-orm';
import { router, protectedProcedure } from '../init';
import { events, eventParticipants, users, expenses, expenseSplits } from '@/lib/db';

export const eventRouter = router({
  // Get all events for the current user (as creator or participant)
  getAll: protectedProcedure.query(async ({ ctx }) => {
    const userEvents = await ctx.db.query.events.findMany({
      where: or(
        eq(events.createdBy, ctx.session.user.id),
        inArray(
          events.id,
          ctx.db
            .select({ eventId: eventParticipants.eventId })
            .from(eventParticipants)
            .where(eq(eventParticipants.userId, ctx.session.user.id))
        )
      ),
      with: {
        createdBy: {
          columns: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
        participants: {
          with: {
            user: {
              columns: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
        },
        expenses: {
          with: {
            paidBy: {
              columns: {
                id: true,
                name: true,
                avatarUrl: true,
              },
            },
            category: {
              columns: {
                id: true,
                name: true,
                color: true,
                icon: true,
              },
            },
          },
          orderBy: [desc(expenses.createdAt)],
        },
      },
      orderBy: [desc(events.createdAt)],
    });

    return userEvents;
  }),

  // Get event by ID
  getById: protectedProcedure
    .input(
      z.object({
        eventId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const event = await ctx.db.query.events.findFirst({
        where: eq(events.id, input.eventId),
        with: {
          createdBy: {
            columns: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
          participants: {
            with: {
              user: {
                columns: {
                  id: true,
                  name: true,
                  email: true,
                  avatarUrl: true,
                },
              },
            },
          },
          expenses: {
            with: {
              paidBy: {
                columns: {
                  id: true,
                  name: true,
                  avatarUrl: true,
                },
              },
              category: {
                columns: {
                  id: true,
                  name: true,
                  color: true,
                  icon: true,
                },
              },
              splits: {
                with: {
                  user: {
                    columns: {
                      id: true,
                      name: true,
                      avatarUrl: true,
                    },
                  },
                },
              },
            },
            orderBy: [desc(expenses.createdAt)],
          },
        },
      });

      if (!event) {
        throw new Error('Event not found');
      }

      // Check if user is a participant or creator
      const isParticipant = event.participants.some(
        (p) => p.user.id === ctx.session.user.id
      );
      const isCreator = event.createdBy.id === ctx.session.user.id;

      if (!isParticipant && !isCreator) {
        throw new Error('Not authorized to view this event');
      }

      return event;
    }),

  // Create a new event
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, 'Event name is required'),
        participantIds: z.array(z.string()).min(1, 'At least one participant is required'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Create the event
      const newEvent = await ctx.db
        .insert(events)
        .values({
          name: input.name,
          createdBy: ctx.session.user.id,
        })
        .returning();

      // Add participants (including the creator)
      const allParticipantIds = [ctx.session.user.id, ...input.participantIds];
      const uniqueParticipantIds = [...new Set(allParticipantIds)];

      const participants = await ctx.db
        .insert(eventParticipants)
        .values(
          uniqueParticipantIds.map((userId) => ({
            eventId: newEvent[0]!.id,
            userId,
          }))
        )
        .returning();

      return {
        ...newEvent[0],
        participants: participants.map((p) => ({
          id: p.id,
          userId: p.userId,
          createdAt: p.createdAt,
        })),
      };
    }),

  // Update an event (only creator can update)
  update: protectedProcedure
    .input(
      z.object({
        eventId: z.string(),
        name: z.string().min(1, 'Event name is required'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user is the creator
      const event = await ctx.db.query.events.findFirst({
        where: and(
          eq(events.id, input.eventId),
          eq(events.createdBy, ctx.session.user.id)
        ),
      });

      if (!event) {
        throw new Error('Event not found or not authorized to update');
      }

      // Update the event
      const updatedEvent = await ctx.db
        .update(events)
        .set({
          name: input.name,
        })
        .where(eq(events.id, input.eventId))
        .returning();

      return updatedEvent[0];
    }),

  // Delete an event (only creator can delete)
  delete: protectedProcedure
    .input(
      z.object({
        eventId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user is the creator
      const event = await ctx.db.query.events.findFirst({
        where: and(
          eq(events.id, input.eventId),
          eq(events.createdBy, ctx.session.user.id)
        ),
      });

      if (!event) {
        throw new Error('Event not found or not authorized to delete');
      }

      // Delete the event (participants and expenses will be deleted by cascade)
      await ctx.db.delete(events).where(eq(events.id, input.eventId));

      return { success: true };
    }),

  // Add participants to an event (only creator can add)
  addParticipants: protectedProcedure
    .input(
      z.object({
        eventId: z.string(),
        participantIds: z.array(z.string()).min(1, 'At least one participant is required'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user is the creator
      const event = await ctx.db.query.events.findFirst({
        where: and(
          eq(events.id, input.eventId),
          eq(events.createdBy, ctx.session.user.id)
        ),
      });

      if (!event) {
        throw new Error('Event not found or not authorized to add participants');
      }

      // Check which participants are not already in the event
      const existingParticipants = await ctx.db.query.eventParticipants.findMany({
        where: eq(eventParticipants.eventId, input.eventId),
        columns: {
          userId: true,
        },
      });

      const existingUserIds = existingParticipants.map((p) => p.userId);
      const newParticipantIds = input.participantIds.filter(
        (id) => !existingUserIds.includes(id)
      );

      if (newParticipantIds.length === 0) {
        throw new Error('All participants are already in the event');
      }

      // Add new participants
      const newParticipants = await ctx.db
        .insert(eventParticipants)
        .values(
          newParticipantIds.map((userId) => ({
            eventId: input.eventId,
            userId,
          }))
        )
        .returning();

      return newParticipants;
    }),

  // Remove participants from an event (only creator can remove)
  removeParticipants: protectedProcedure
    .input(
      z.object({
        eventId: z.string(),
        participantIds: z.array(z.string()).min(1, 'At least one participant is required'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user is the creator
      const event = await ctx.db.query.events.findFirst({
        where: and(
          eq(events.id, input.eventId),
          eq(events.createdBy, ctx.session.user.id)
        ),
      });

      if (!event) {
        throw new Error('Event not found or not authorized to remove participants');
      }

      // Don't allow removing the creator
      const filteredParticipantIds = input.participantIds.filter(
        (id) => id !== ctx.session.user.id
      );

      if (filteredParticipantIds.length === 0) {
        throw new Error('Cannot remove the event creator');
      }

      // Remove participants
      await ctx.db
        .delete(eventParticipants)
        .where(
          and(
            eq(eventParticipants.eventId, input.eventId),
            inArray(eventParticipants.userId, filteredParticipantIds)
          )
        );

      return { success: true };
    }),

  // Get event balance (who owes what to whom)
  getBalance: protectedProcedure
    .input(
      z.object({
        eventId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Get all expenses for this event with their splits
      const eventExpenses = await ctx.db.query.expenses.findMany({
        where: eq(expenses.eventId, input.eventId),
        with: {
          paidBy: {
            columns: {
              id: true,
              name: true,
              avatarUrl: true,
            },
          },
          splits: {
            with: {
              user: {
                columns: {
                  id: true,
                  name: true,
                  avatarUrl: true,
                },
              },
            },
          },
        },
      });

      // Calculate balances
      const balances: Record<string, { user: any; totalPaid: number; totalOwed: number; netBalance: number }> = {};

      // Initialize balances for all participants
      const allUserIds = new Set<string>();
      eventExpenses.forEach((expense) => {
        allUserIds.add(expense.paidBy.id);
        expense.splits.forEach((split) => {
          allUserIds.add(split.user.id);
        });
      });

      allUserIds.forEach((userId) => {
        balances[userId] = {
          user: null,
          totalPaid: 0,
          totalOwed: 0,
          netBalance: 0,
        };
      });

      // Calculate total paid and owed for each user
      eventExpenses.forEach((expense) => {
        const paidBy = expense.paidBy.id;
        const amount = parseFloat(expense.amount);

        if (!balances[paidBy]) {
          balances[paidBy] = {
            user: expense.paidBy,
            totalPaid: 0,
            totalOwed: 0,
            netBalance: 0,
          };
        }

        balances[paidBy].totalPaid += amount;
        balances[paidBy].user = expense.paidBy;

        expense.splits.forEach((split) => {
          const userId = split.user.id;
          const share = parseFloat(split.share);

          if (!balances[userId]) {
            balances[userId] = {
              user: split.user,
              totalPaid: 0,
              totalOwed: 0,
              netBalance: 0,
            };
          }

          balances[userId].totalOwed += share;
          balances[userId].user = split.user;
        });
      });

      // Calculate net balance
      Object.values(balances).forEach((balance) => {
        balance.netBalance = balance.totalPaid - balance.totalOwed;
      });

      return Object.values(balances);
    }),
});