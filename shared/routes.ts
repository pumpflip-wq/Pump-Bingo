
import { z } from 'zod';
import { insertUserSchema, users, rounds, participants } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  auth: {
    login: {
      method: 'POST' as const,
      path: '/api/auth/login',
      input: z.object({ username: z.string().min(1) }),
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        201: z.custom<typeof users.$inferSelect>(),
      },
    },
    me: {
        method: 'GET' as const,
        path: '/api/auth/me/:id',
        responses: {
            200: z.custom<typeof users.$inferSelect>(),
            404: errorSchemas.notFound
        }
    }
  },
  rounds: {
    list: {
      method: 'GET' as const,
      path: '/api/rounds',
      responses: {
        200: z.array(z.custom<typeof rounds.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/rounds/:id',
      responses: {
        200: z.object({
          round: z.custom<typeof rounds.$inferSelect>(),
          participantsCount: z.number(),
          participants: z.array(z.object({
            id: z.number(),
            username: z.string(),
            joinedAt: z.string()
          }))
        }),
        404: errorSchemas.notFound,
      },
    },
    join: {
      method: 'POST' as const,
      path: '/api/rounds/:id/join',
      input: z.object({ userId: z.number() }),
      responses: {
        200: z.object({
            participant: z.custom<typeof participants.$inferSelect>(),
            balance: z.number()
        }),
        400: errorSchemas.validation, // Insufficient funds or already joined
        404: errorSchemas.notFound,
      },
    },
    claim: {
        method: 'POST' as const,
        path: '/api/rounds/:id/claim',
        input: z.object({ userId: z.number() }),
        responses: {
            200: z.object({ valid: z.boolean(), message: z.string() }),
            400: errorSchemas.validation,
            404: errorSchemas.notFound
        }
    }
  },
  participants: {
      get: {
          method: 'GET' as const,
          path: '/api/rounds/:roundId/participants/:userId',
          responses: {
              200: z.custom<typeof participants.$inferSelect>(),
              404: errorSchemas.notFound
          }
      }
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
