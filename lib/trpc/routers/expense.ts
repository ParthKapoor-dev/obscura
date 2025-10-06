import { z } from 'zod';
import { eq, desc, and, isNull, inArray } from 'drizzle-orm';
import { router, protectedProcedure } from '../init';
import { expenses, expenseSplits, users, categories, events, eventParticipants } from '@/lib/db';

export const expenseRouter = router({
  // Get all personal expenses for the current user
  getPersonalExpenses: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const userExpenses = await ctx.db.query.expenses.findMany({
        where: and(
          eq(expenses.paidBy, ctx.session.user.id),
          isNull(expenses.eventId) // Only personal expenses
        ),
        orderBy: [desc(expenses.createdAt)],
        limit: input.limit,
        offset: input.offset,
        with: {
          paidBy: {
            columns: {
              id: true,
              name: true,
              email: true,
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
      });

      return userExpenses;
    }),

  // Get expense by ID
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const expense = await ctx.db.query.expenses.findFirst({
        where: and(
          eq(expenses.id, input.id),
          eq(expenses.paidBy, ctx.session.user.id)
        ),
        with: {
          paidBy: {
            columns: {
              id: true,
              name: true,
              email: true,
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
                  email: true,
                  avatarUrl: true,
                },
              },
            },
          },
        },
      });

      if (!expense) {
        throw new Error('Expense not found');
      }

      return expense;
    }),

  // Create a new personal expense
  create: protectedProcedure
    .input(
      z.object({
        description: z.string().min(1, 'Description is required'),
        amount: z.number().positive('Amount must be positive'),
        categoryId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const newExpense = await ctx.db
        .insert(expenses)
        .values({
          description: input.description,
          amount: input.amount.toString(),
          paidBy: ctx.session.user.id,
          categoryId: input.categoryId || null,
          // eventId is null for personal expenses
        })
        .returning();

      // Create a split for the user who paid (they get 100% of the expense)
      await ctx.db.insert(expenseSplits).values({
        expenseId: newExpense[0]!.id,
        userId: ctx.session.user.id,
        share: input.amount.toString(),
      });

      return newExpense[0];
    }),

  // Update an existing expense
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        description: z.string().min(1, 'Description is required'),
        amount: z.number().positive('Amount must be positive'),
        categoryId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // First verify the expense belongs to the user
      const existingExpense = await ctx.db.query.expenses.findFirst({
        where: and(
          eq(expenses.id, input.id),
          eq(expenses.paidBy, ctx.session.user.id),
          isNull(expenses.eventId) // Only personal expenses
        ),
      });

      if (!existingExpense) {
        throw new Error('Expense not found or not authorized');
      }

      // Update the expense
      const updatedExpense = await ctx.db
        .update(expenses)
        .set({
          description: input.description,
          amount: input.amount.toString(),
          categoryId: input.categoryId || null,
        })
        .where(eq(expenses.id, input.id))
        .returning();

      // Update the split amount
      await ctx.db
        .update(expenseSplits)
        .set({
          share: input.amount.toString(),
        })
        .where(
          and(
            eq(expenseSplits.expenseId, input.id),
            eq(expenseSplits.userId, ctx.session.user.id)
          )
        );

      return updatedExpense[0];
    }),

  // Delete an expense
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // First verify the expense belongs to the user
      const existingExpense = await ctx.db.query.expenses.findFirst({
        where: and(
          eq(expenses.id, input.id),
          eq(expenses.paidBy, ctx.session.user.id),
          isNull(expenses.eventId) // Only personal expenses
        ),
      });

      if (!existingExpense) {
        throw new Error('Expense not found or not authorized');
      }

      // Delete the expense (splits will be deleted by cascade)
      await ctx.db.delete(expenses).where(eq(expenses.id, input.id));

      return { success: true };
    }),

  // Get expense summary/statistics
  getSummary: protectedProcedure
    .input(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const whereConditions = [
        eq(expenses.paidBy, ctx.session.user.id),
        isNull(expenses.eventId), // Only personal expenses
      ];

      if (input.startDate) {
        whereConditions.push(eq(expenses.createdAt, input.startDate));
      }

      const userExpenses = await ctx.db.query.expenses.findMany({
        where: and(...whereConditions),
        with: {
          splits: true,
        },
      });

      const totalAmount = userExpenses.reduce(
        (sum, expense) => sum + parseFloat(expense.amount),
        0
      );

      const totalExpenses = userExpenses.length;

      // Calculate average expense
      const averageExpense = totalExpenses > 0 ? totalAmount / totalExpenses : 0;

      // Get expenses by month for chart data
      const expensesByMonth = userExpenses.reduce((acc, expense) => {
        const month = new Date(expense.createdAt).toISOString().slice(0, 7); // YYYY-MM
        acc[month] = (acc[month] || 0) + parseFloat(expense.amount);
        return acc;
      }, {} as Record<string, number>);

      return {
        totalAmount,
        totalExpenses,
        averageExpense,
        expensesByMonth,
      };
    }),

  // Get recent expenses (for dashboard)
  getRecent: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(10).default(5) }))
    .query(async ({ ctx, input }) => {
      const recentExpenses = await ctx.db.query.expenses.findMany({
        where: and(
          eq(expenses.paidBy, ctx.session.user.id),
          isNull(expenses.eventId) // Only personal expenses
        ),
        orderBy: [desc(expenses.createdAt)],
        limit: input.limit,
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
      });

      return recentExpenses;
    }),

  // Get all event expenses for a specific event
  getEventExpenses: protectedProcedure
    .input(
      z.object({
        eventId: z.string(),
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      // Check if user is a participant of the event
      const event = await ctx.db.query.events.findFirst({
        where: eq(events.id, input.eventId),
        with: {
          participants: {
            where: eq(eventParticipants.userId, ctx.session.user.id),
          },
        },
      });

      if (!event || (event.createdBy !== ctx.session.user.id && event.participants.length === 0)) {
        throw new Error('Not authorized to view this event');
      }

      const eventExpenses = await ctx.db.query.expenses.findMany({
        where: eq(expenses.eventId, input.eventId),
        orderBy: [desc(expenses.createdAt)],
        limit: input.limit,
        offset: input.offset,
        with: {
          paidBy: {
            columns: {
              id: true,
              name: true,
              email: true,
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
                  email: true,
                  avatarUrl: true,
                },
              },
            },
          },
        },
      });

      return eventExpenses;
    }),

  // Create an event expense with splitting
  createEventExpense: protectedProcedure
    .input(
      z.object({
        eventId: z.string(),
        description: z.string().min(1, 'Description is required'),
        amount: z.number().positive('Amount must be positive'),
        categoryId: z.string().optional(),
        splits: z.array(
          z.object({
            userId: z.string(),
            share: z.number().positive('Share must be positive'),
          })
        ).min(1, 'At least one split is required'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user is a participant of the event
      const event = await ctx.db.query.events.findFirst({
        where: eq(events.id, input.eventId),
        with: {
          participants: {
            where: eq(eventParticipants.userId, ctx.session.user.id),
          },
        },
      });

      if (!event || (event.createdBy !== ctx.session.user.id && event.participants.length === 0)) {
        throw new Error('Not authorized to add expenses to this event');
      }

      // Validate that splits add up to the total amount
      const totalShares = input.splits.reduce((sum, split) => sum + split.share, 0);
      if (Math.abs(totalShares - input.amount) > 0.01) {
        throw new Error('Splits must add up to the total amount');
      }

      // Create the expense
      const newExpense = await ctx.db
        .insert(expenses)
        .values({
          eventId: input.eventId,
          description: input.description,
          amount: input.amount.toString(),
          paidBy: ctx.session.user.id,
          categoryId: input.categoryId || null,
        })
        .returning();

      // Create the splits
      await ctx.db.insert(expenseSplits).values(
        input.splits.map((split) => ({
          expenseId: newExpense[0]!.id,
          userId: split.userId,
          share: split.share.toString(),
        }))
      );

      return newExpense[0];
    }),

  // Update an event expense
  updateEventExpense: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        description: z.string().min(1, 'Description is required'),
        amount: z.number().positive('Amount must be positive'),
        categoryId: z.string().optional(),
        splits: z.array(
          z.object({
            userId: z.string(),
            share: z.number().positive('Share must be positive'),
          })
        ).min(1, 'At least one split is required'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user is authorized to update this expense
      const existingExpense = await ctx.db.query.expenses.findFirst({
        where: and(
          eq(expenses.id, input.id),
          eq(expenses.paidBy, ctx.session.user.id)
        ),
        with: {
          event: {
            with: {
              participants: {
                where: eq(eventParticipants.userId, ctx.session.user.id),
              },
            },
          },
        },
      });

      if (!existingExpense) {
        throw new Error('Expense not found or not authorized');
      }

      // If it's an event expense, check if user is a participant
      if (existingExpense.eventId && existingExpense.event) {
        const event = existingExpense.event;
        if (event.createdBy !== ctx.session.user.id && event.participants.length === 0) {
          throw new Error('Not authorized to update this expense');
        }
      }

      // Validate that splits add up to the total amount
      const totalShares = input.splits.reduce((sum, split) => sum + split.share, 0);
      if (Math.abs(totalShares - input.amount) > 0.01) {
        throw new Error('Splits must add up to the total amount');
      }

      // Update the expense
      const updatedExpense = await ctx.db
        .update(expenses)
        .set({
          description: input.description,
          amount: input.amount.toString(),
          categoryId: input.categoryId || null,
        })
        .where(eq(expenses.id, input.id))
        .returning();

      // Delete existing splits and create new ones
      await ctx.db.delete(expenseSplits).where(eq(expenseSplits.expenseId, input.id));

      await ctx.db.insert(expenseSplits).values(
        input.splits.map((split) => ({
          expenseId: input.id,
          userId: split.userId,
          share: split.share.toString(),
        }))
      );

      return updatedExpense[0];
    }),

  // Get all expenses (personal + event) for the current user
  getAllExpenses: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      // Get personal expenses
      const personalExpenses = await ctx.db.query.expenses.findMany({
        where: and(
          eq(expenses.paidBy, ctx.session.user.id),
          isNull(expenses.eventId)
        ),
        orderBy: [desc(expenses.createdAt)],
        with: {
          paidBy: {
            columns: {
              id: true,
              name: true,
              email: true,
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
      });

      // Get event expenses where user is a participant
      const userEventIds = await ctx.db
        .select({ eventId: eventParticipants.eventId })
        .from(eventParticipants)
        .where(eq(eventParticipants.userId, ctx.session.user.id));

      const eventExpenses = await ctx.db.query.expenses.findMany({
        where: inArray(
          expenses.eventId,
          userEventIds.map((e) => e.eventId)
        ),
        orderBy: [desc(expenses.createdAt)],
        with: {
          paidBy: {
            columns: {
              id: true,
              name: true,
              email: true,
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
          event: {
            columns: {
              id: true,
              name: true,
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

      // Combine and sort all expenses
      const allExpenses = [...personalExpenses, ...eventExpenses].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      return allExpenses.slice(input.offset, input.offset + input.limit);
    }),
});