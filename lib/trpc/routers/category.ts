import { z } from 'zod';
import { eq, and, isNull, desc, or, ne } from 'drizzle-orm';
import { router, protectedProcedure } from '../init';
import { categories, expenses } from '@/lib/db';

export const categoryRouter = router({
  // Get all categories (default + user's custom categories)
  getAll: protectedProcedure.query(async ({ ctx }) => {
    const allCategories = await ctx.db.query.categories.findMany({
      where: or(
        isNull(categories.userId), // Default categories
        eq(categories.userId, ctx.session.user.id) // User's custom categories
      ),
      orderBy: [
        categories.type, // Default categories first
        desc(categories.createdAt) // Then by creation date
      ],
    });

    return allCategories;
  }),

  // Get only default categories
  getDefaults: protectedProcedure.query(async ({ ctx }) => {
    const defaultCategories = await ctx.db.query.categories.findMany({
      where: and(
        eq(categories.type, 'default'),
        isNull(categories.userId)
      ),
      orderBy: [categories.name],
    });

    return defaultCategories;
  }),

  // Get only user's custom categories
  getCustom: protectedProcedure.query(async ({ ctx }) => {
    const customCategories = await ctx.db.query.categories.findMany({
      where: and(
        eq(categories.type, 'custom'),
        eq(categories.userId, ctx.session.user.id)
      ),
      orderBy: [desc(categories.createdAt)],
    });

    return customCategories;
  }),

  // Create a new custom category
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, 'Category name is required'),
        description: z.string().optional(),
        color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format').default('#6B7280'),
        icon: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if category name already exists for this user
      const existingCategory = await ctx.db.query.categories.findFirst({
        where: and(
          eq(categories.name, input.name),
          eq(categories.userId, ctx.session.user.id)
        ),
      });

      if (existingCategory) {
        throw new Error('Category with this name already exists');
      }

      const newCategory = await ctx.db
        .insert(categories)
        .values({
          name: input.name,
          description: input.description,
          color: input.color,
          icon: input.icon,
          type: 'custom',
          userId: ctx.session.user.id,
        })
        .returning();

      return newCategory[0];
    }),

  // Update a custom category
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1, 'Category name is required'),
        description: z.string().optional(),
        color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format'),
        icon: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify the category belongs to the user
      const existingCategory = await ctx.db.query.categories.findFirst({
        where: and(
          eq(categories.id, input.id),
          eq(categories.userId, ctx.session.user.id),
          eq(categories.type, 'custom')
        ),
      });

      if (!existingCategory) {
        throw new Error('Category not found or not authorized');
      }

      // Check if another category with the same name exists
      const duplicateCategory = await ctx.db.query.categories.findFirst({
        where: and(
          eq(categories.name, input.name),
          eq(categories.userId, ctx.session.user.id),
          ne(categories.id, input.id)
        ),
      });

      if (duplicateCategory) {
        throw new Error('Category with this name already exists');
      }

      const updatedCategory = await ctx.db
        .update(categories)
        .set({
          name: input.name,
          description: input.description,
          color: input.color,
          icon: input.icon,
        })
        .where(eq(categories.id, input.id))
        .returning();

      return updatedCategory[0];
    }),

  // Delete a custom category
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify the category belongs to the user
      const existingCategory = await ctx.db.query.categories.findFirst({
        where: and(
          eq(categories.id, input.id),
          eq(categories.userId, ctx.session.user.id),
          eq(categories.type, 'custom')
        ),
      });

      if (!existingCategory) {
        throw new Error('Category not found or not authorized');
      }

      // Check if category is being used by any expenses
      const expensesUsingCategory = await ctx.db.query.expenses.findFirst({
        where: eq(expenses.categoryId, input.id),
      });

      if (expensesUsingCategory) {
        throw new Error('Cannot delete category that is being used by expenses');
      }

      await ctx.db.delete(categories).where(eq(categories.id, input.id));

      return { success: true };
    }),

  // Initialize default categories (run once during app setup)
  initializeDefaults: protectedProcedure.mutation(async ({ ctx }) => {
    const defaultCategories = [
      {
        name: 'Food & Dining',
        description: 'Restaurants, groceries, and food delivery',
        color: '#EF4444', // Red
        icon: '🍽️',
        type: 'default' as const,
        userId: null,
      },
      {
        name: 'Transportation',
        description: 'Gas, public transport, rideshare, parking',
        color: '#3B82F6', // Blue
        icon: '🚗',
        type: 'default' as const,
        userId: null,
      },
      {
        name: 'Entertainment',
        description: 'Movies, games, subscriptions, hobbies',
        color: '#8B5CF6', // Purple
        icon: '🎬',
        type: 'default' as const,
        userId: null,
      },
      {
        name: 'Shopping',
        description: 'Clothing, electronics, general shopping',
        color: '#F59E0B', // Amber
        icon: '🛍️',
        type: 'default' as const,
        userId: null,
      },
      {
        name: 'Health & Fitness',
        description: 'Medical, gym, pharmacy, wellness',
        color: '#10B981', // Emerald
        icon: '💊',
        type: 'default' as const,
        userId: null,
      },
      {
        name: 'Bills & Utilities',
        description: 'Electricity, water, internet, phone bills',
        color: '#6B7280', // Gray
        icon: '💡',
        type: 'default' as const,
        userId: null,
      },
      {
        name: 'Travel',
        description: 'Hotels, flights, vacation expenses',
        color: '#06B6D4', // Cyan
        icon: '✈️',
        type: 'default' as const,
        userId: null,
      },
      {
        name: 'Education',
        description: 'Courses, books, training, school supplies',
        color: '#84CC16', // Lime
        icon: '📚',
        type: 'default' as const,
        userId: null,
      },
      {
        name: 'Other',
        description: 'Miscellaneous expenses',
        color: '#9CA3AF', // Cool Gray
        icon: '📦',
        type: 'default' as const,
        userId: null,
      },
    ];

    // Check if default categories already exist
    const existingDefaults = await ctx.db.query.categories.findMany({
      where: and(
        eq(categories.type, 'default'),
        isNull(categories.userId)
      ),
    });

    if (existingDefaults.length > 0) {
      return { message: 'Default categories already initialized' };
    }

    // Insert default categories
    await ctx.db.insert(categories).values(defaultCategories);

    return { message: 'Default categories initialized successfully' };
  }),
});