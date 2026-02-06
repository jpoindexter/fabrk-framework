/**
 * Middleware utilities for FABRK framework
 *
 * Composable middleware system for chaining request/response handlers.
 */

export type MiddlewareFunction<TContext = any> = (
  context: TContext,
  next: () => Promise<void>
) => Promise<void>;

export interface Middleware<TContext = any> {
  use: (fn: MiddlewareFunction<TContext>) => Middleware<TContext>;
  run: (context: TContext) => Promise<void>;
}

/**
 * Create a middleware chain
 *
 * @example
 * ```ts
 * const middleware = createMiddleware()
 *   .use(async (ctx, next) => {
 *     console.log('Before')
 *     await next()
 *     console.log('After')
 *   })
 *   .use(async (ctx, next) => {
 *     // Auth check
 *     if (!ctx.user) throw new Error('Unauthorized')
 *     await next()
 *   })
 *
 * await middleware.run({ user: null })
 * ```
 */
export function createMiddleware<TContext = any>(): Middleware<TContext> {
  const middlewares: MiddlewareFunction<TContext>[] = [];

  return {
    use(fn: MiddlewareFunction<TContext>) {
      middlewares.push(fn);
      return this;
    },

    async run(context: TContext) {
      let index = 0;

      async function dispatch(): Promise<void> {
        if (index >= middlewares.length) return;

        const middleware = middlewares[index++];
        await middleware(context, dispatch);
      }

      await dispatch();
    },
  };
}

/**
 * Compose multiple middleware functions into one
 *
 * @example
 * ```ts
 * const combined = compose(authMiddleware, loggingMiddleware, validationMiddleware)
 * ```
 */
export function compose<TContext = any>(
  ...middlewares: MiddlewareFunction<TContext>[]
): MiddlewareFunction<TContext> {
  return async (context: TContext, next: () => Promise<void>) => {
    let index = 0;

    async function dispatch(): Promise<void> {
      if (index >= middlewares.length) {
        await next();
        return;
      }

      const middleware = middlewares[index++];
      await middleware(context, dispatch);
    }

    await dispatch();
  };
}
