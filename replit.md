# PicklePal - Pickleball Court Booking & Match Platform

## Overview

PicklePal is a full-stack web application for pickleball players to discover courts, book playing time, and organize matches with other players. The platform supports two user roles: players who can book courts and join matches, and venue owners who can manage their facilities and courts.

Key features include:
- Court discovery with comprehensive filters (type, size, features, price, area, duration)
- Court booking system with time slot selection
- Community match creation and joining
- Social feed with posts and groups
- Instagram-style player profiles with followers/following
- Player statistics with rating progression
- Player preferences (hand, court position, match type)
- Venue owner dashboard for managing courts and viewing bookings
- Replit Auth integration for authentication

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight client-side routing)
- **State Management**: TanStack React Query for server state, local React state for UI
- **Styling**: Tailwind CSS with custom theme extending CSS variables for theming
- **UI Components**: shadcn/ui component library (Radix primitives + Tailwind)
- **Build Tool**: Vite with path aliases (@/, @shared/, @assets/)

The frontend follows a component-based architecture with:
- Pages in `client/src/pages/` for route-level components
- Reusable components in `client/src/components/`
- Custom hooks in `client/src/hooks/` for data fetching and auth
- Shared API route definitions imported from `@shared/routes`

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript with ES modules
- **API Design**: RESTful endpoints defined in `shared/routes.ts` with Zod validation
- **Database ORM**: Drizzle ORM with PostgreSQL
- **Authentication**: Replit Auth (OpenID Connect) with Passport.js and session storage

The server structure:
- `server/index.ts` - Express app setup and middleware
- `server/routes.ts` - API route handlers
- `server/storage.ts` - Database access layer implementing IStorage interface
- `server/db.ts` - Drizzle database connection
- `server/replit_integrations/auth/` - Authentication handling

### Data Storage
- **Database**: PostgreSQL via Drizzle ORM
- **Schema Location**: `shared/schema.ts` (main) and `shared/models/auth.ts` (auth tables)
- **Migrations**: Drizzle Kit with `drizzle-kit push` for schema sync

Core tables:
- `users` - User accounts (managed by Replit Auth)
- `sessions` - Session storage for authentication
- `profiles` - Extended player profiles with ratings, reliability scores, preferences
- `venues` - Court facilities owned by venue operators
- `courts` - Individual courts within venues
- `bookings` - Court reservations
- `matches` - Community-organized games
- `matchPlayers` - Players registered for matches
- `matchResults` - Match outcomes with scores and player teams
- `ratingHistory` - Historical rating changes after competitive matches

### Rating System
- **Algorithm**: Playtomic-style rating using team averages and reliability dampening
- **Location**: `server/rating.ts` implements the competitive rating logic
- **Key Concepts**:
  - Team averages determine expected outcome
  - Reliability percentage (0-100%) dampens rating swings for new players
  - Score margin affects rating adjustment magnitude
  - Ratings recorded in history after each competitive match
- **API Endpoints**:
  - `POST /api/matches/:id/result` - Record match result with automatic rating updates
  - `GET /api/ratings/history/:userId` - Get player's rating history for charts

### Authentication Flow
- Uses Replit Auth (OpenID Connect) for user authentication
- Sessions stored in PostgreSQL via connect-pg-simple
- Protected routes check `req.isAuthenticated()` and access user via `req.user.claims.sub`
- Role-based access: "player" or "venue" stored in users table

## External Dependencies

### Database
- PostgreSQL (required, connection via DATABASE_URL environment variable)
- Drizzle ORM for queries and schema management

### Authentication
- Replit Auth (OpenID Connect provider)
- Required environment variables: `ISSUER_URL`, `REPL_ID`, `SESSION_SECRET`, `DATABASE_URL`

### Third-Party Libraries
- **UI**: Radix UI primitives, Lucide React icons, class-variance-authority
- **Forms**: React Hook Form with Zod resolver
- **Dates**: date-fns for date formatting
- **Animations**: Framer Motion (referenced in requirements)
- **Carousel**: Embla Carousel React

### Build & Development
- Vite for frontend bundling with HMR
- esbuild for production server bundling
- TypeScript for type checking across full stack