import { router } from './init';
import { userRouter } from './routers/user';
import { expenseRouter } from './routers/expense';
import { categoryRouter } from './routers/category';
import { friendRouter } from './routers/friend';
import { eventRouter } from './routers/event';

export const appRouter = router({
  user: userRouter,
  expense: expenseRouter,
  category: categoryRouter,
  friend: friendRouter,
  event: eventRouter,
});

export type AppRouter = typeof appRouter;