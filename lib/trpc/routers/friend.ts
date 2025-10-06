import { z } from 'zod';
import { eq, and, or, desc } from 'drizzle-orm';
import { router, protectedProcedure } from '../init';
import { friends, users } from '@/lib/db';

export const friendRouter = router({
  // Get all friends for the current user
  getAll: protectedProcedure.query(async ({ ctx }) => {
    const userFriends = await ctx.db.query.friends.findMany({
      where: eq(friends.userId, ctx.session.user.id),
      with: {
        friend: {
          columns: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: [desc(friends.createdAt)],
    });

    return userFriends;
  }),

  // Add a friend by email
  addByEmail: protectedProcedure
    .input(
      z.object({
        email: z.string().email('Invalid email address'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if the friend exists
      const friendUser = await ctx.db.query.users.findFirst({
        where: eq(users.email, input.email),
        columns: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
        },
      });

      if (!friendUser) {
        throw new Error('User with this email not found');
      }

      // Check if trying to add self
      if (friendUser.id === ctx.session.user.id) {
        throw new Error('Cannot add yourself as a friend');
      }

      // Check if friendship already exists
      const existingFriendship = await ctx.db.query.friends.findFirst({
        where: or(
          and(
            eq(friends.userId, ctx.session.user.id),
            eq(friends.friendUserId, friendUser.id)
          ),
          and(
            eq(friends.userId, friendUser.id),
            eq(friends.friendUserId, ctx.session.user.id)
          )
        ),
      });

      if (existingFriendship) {
        throw new Error('Friendship already exists');
      }

      // Create the friendship (bidirectional)
      const newFriendship = await ctx.db
        .insert(friends)
        .values({
          userId: ctx.session.user.id,
          friendUserId: friendUser.id,
        })
        .returning();

      return {
        id: newFriendship[0]!.id,
        friend: friendUser,
        createdAt: newFriendship[0]!.createdAt,
      };
    }),

  // Remove a friend
  remove: protectedProcedure
    .input(
      z.object({
        friendId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Find and delete the friendship (bidirectional)
      const friendship = await ctx.db.query.friends.findFirst({
        where: or(
          and(
            eq(friends.userId, ctx.session.user.id),
            eq(friends.friendUserId, input.friendId)
          ),
          and(
            eq(friends.userId, input.friendId),
            eq(friends.friendUserId, ctx.session.user.id)
          )
        ),
      });

      if (!friendship) {
        throw new Error('Friendship not found');
      }

      // Delete the friendship
      await ctx.db.delete(friends).where(eq(friends.id, friendship.id));

      return { success: true };
    }),

  // Search for users by email (for adding friends)
  searchByEmail: protectedProcedure
    .input(
      z.object({
        email: z.string().email('Invalid email address'),
      })
    )
    .query(async ({ ctx, input }) => {
      const user = await ctx.db.query.users.findFirst({
        where: eq(users.email, input.email),
        columns: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
        },
      });

      if (!user) {
        return null;
      }

      // Check if already friends
      const existingFriendship = await ctx.db.query.friends.findFirst({
        where: or(
          and(
            eq(friends.userId, ctx.session.user.id),
            eq(friends.friendUserId, user.id)
          ),
          and(
            eq(friends.userId, user.id),
            eq(friends.friendUserId, ctx.session.user.id)
          )
        ),
      });

      return {
        ...user,
        isAlreadyFriend: !!existingFriendship,
        isSelf: user.id === ctx.session.user.id,
      };
    }),

  // Get friend by ID
  getById: protectedProcedure
    .input(
      z.object({
        friendId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const friendship = await ctx.db.query.friends.findFirst({
        where: or(
          and(
            eq(friends.userId, ctx.session.user.id),
            eq(friends.friendUserId, input.friendId)
          ),
          and(
            eq(friends.userId, input.friendId),
            eq(friends.friendUserId, ctx.session.user.id)
          )
        ),
        with: {
          friend: {
            columns: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
        },
      });

      if (!friendship) {
        throw new Error('Friend not found');
      }

      return friendship;
    }),
});