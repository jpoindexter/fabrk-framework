/* eslint-disable @typescript-eslint/no-explicit-any */

export type MiddlewareFunction<TContext = any> = (
  context: TContext,
  next: () => Promise<void>
) => Promise<void>;

export interface Middleware<TContext = any> {
  use: (fn: MiddlewareFunction<TContext>) => Middleware<TContext>;
  run: (context: TContext) => Promise<void>;
}

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
        let called = false;
        await middleware(context, () => {
          if (called) throw new Error('next() called multiple times');
          called = true;
          return dispatch();
        });
      }

      await dispatch();
    },
  };
}

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
      let called = false;
      await middleware(context, () => {
        if (called) throw new Error('next() called multiple times');
        called = true;
        return dispatch();
      });
    }

    await dispatch();
  };
}
