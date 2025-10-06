import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { router, protectedProcedure, publicProcedure } from '../init';
import { users } from '@/lib/db';

export const userRouter = router({
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, ctx.session.user.id),
    });

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }),

  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        avatarUrl: z.string().url().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const updatedUser = await ctx.db
        .update(users)
        .set({
          name: input.name,
          avatarUrl: input.avatarUrl,
        })
        .where(eq(users.id, ctx.session.user.id))
        .returning();

      return updatedUser[0];
    }),
});
