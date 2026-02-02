import { z } from 'zod';
import { 
  insertBookingSchema, 
  insertMatchSchema, 
  insertProfileSchema,
  insertVenueSchema,
  insertCourtSchema,
  insertPostSchema,
  insertGroupSchema,
  bookings, 
  matches, 
  venues, 
  courts,
  profiles,
  matchPlayers,
  users,
  posts,
  groups
} from './schema';

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
  unauthorized: z.object({
    message: z.string(),
  }),
};

export const api = {
  profiles: {
    me: {
      method: 'GET' as const,
      path: '/api/profiles/me',
      responses: {
        200: z.custom<typeof profiles.$inferSelect & { user: typeof users.$inferSelect }>(),
        404: errorSchemas.notFound,
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/profiles/me',
      input: insertProfileSchema.partial(),
      responses: {
        200: z.custom<typeof profiles.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
  },
  venues: {
    list: {
      method: 'GET' as const,
      path: '/api/venues',
      responses: {
        200: z.array(z.custom<typeof venues.$inferSelect & { courts: typeof courts.$inferSelect[] }>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/venues/:id',
      responses: {
        200: z.custom<typeof venues.$inferSelect & { courts: typeof courts.$inferSelect[] }>(),
        404: errorSchemas.notFound,
      },
    },
    // Venue owner endpoints
    myVenues: {
      method: 'GET' as const,
      path: '/api/venues/my',
      responses: {
        200: z.array(z.custom<typeof venues.$inferSelect & { courts: typeof courts.$inferSelect[] }>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/venues',
      input: insertVenueSchema,
      responses: {
        201: z.custom<typeof venues.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    addCourt: {
      method: 'POST' as const,
      path: '/api/venues/:id/courts',
      input: insertCourtSchema.omit({ venueId: true }),
      responses: {
        201: z.custom<typeof courts.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    venueBookings: {
      method: 'GET' as const,
      path: '/api/venues/bookings',
      responses: {
        200: z.array(z.custom<typeof bookings.$inferSelect & { 
          court: typeof courts.$inferSelect, 
          venue: typeof venues.$inferSelect,
          user: typeof users.$inferSelect
        }>()),
      },
    },
  },
  users: {
    updateRole: {
      method: 'PATCH' as const,
      path: '/api/users/role',
      input: z.object({ role: z.enum(['player', 'venue']) }),
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
  },
  bookings: {
    list: {
      method: 'GET' as const,
      path: '/api/bookings',
      responses: {
        200: z.array(z.custom<typeof bookings.$inferSelect & { court: typeof courts.$inferSelect & { venue: typeof venues.$inferSelect } }>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/bookings',
      input: insertBookingSchema,
      responses: {
        201: z.custom<typeof bookings.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
  },
  matches: {
    list: {
      method: 'GET' as const,
      path: '/api/matches',
      responses: {
        200: z.array(z.custom<typeof matches.$inferSelect & { 
          court: typeof courts.$inferSelect & { venue: typeof venues.$inferSelect }, 
          creator: typeof users.$inferSelect,
          players: (typeof matchPlayers.$inferSelect & { user: typeof users.$inferSelect })[] 
        }>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/matches',
      input: insertMatchSchema,
      responses: {
        201: z.custom<typeof matches.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    join: {
      method: 'POST' as const,
      path: '/api/matches/:id/join',
      responses: {
        200: z.custom<typeof matchPlayers.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    leave: {
      method: 'POST' as const,
      path: '/api/matches/:id/leave',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
  posts: {
    list: {
      method: 'GET' as const,
      path: '/api/posts',
      responses: {
        200: z.array(z.custom<typeof posts.$inferSelect & { user: typeof users.$inferSelect }>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/posts',
      input: insertPostSchema,
      responses: {
        201: z.custom<typeof posts.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
  },
  groups: {
    list: {
      method: 'GET' as const,
      path: '/api/groups',
      responses: {
        200: z.array(z.custom<typeof groups.$inferSelect & { memberCount: number }>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/groups',
      input: insertGroupSchema,
      responses: {
        201: z.custom<typeof groups.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
  },
  followers: {
    stats: {
      method: 'GET' as const,
      path: '/api/followers/stats/:userId',
      responses: {
        200: z.object({
          followers: z.number(),
          following: z.number(),
        }),
      },
    },
  },
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
