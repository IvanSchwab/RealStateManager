# Real Estate Management System

A full-stack Real Estate Management System built with Vue 3 and Supabase. This application helps property managers and landlords track properties, tenants, contracts, and payments.

## Tech Stack

### Frontend
- **Vue 3** - Progressive JavaScript framework with Composition API
- **TypeScript** - Type-safe JavaScript
- **Vite** - Next-generation build tool
- **Pinia** - State management for Vue
- **Vue Router** - Official router for Vue.js
- **TailwindCSS** - Utility-first CSS framework
- **shadcn-vue** - Re-usable UI components
- **Lucide Vue Next** - Beautiful icons

### Backend
- **Supabase** - Open source Firebase alternative
  - PostgreSQL database
  - Authentication
  - Row Level Security (RLS)
  - Storage (for documents)
  - Realtime subscriptions

## Prerequisites

Before you begin, ensure you have installed:
- [Node.js](https://nodejs.org/) (v18 or higher)
- [npm](https://www.npmjs.com/) (v9 or higher)
- [Supabase CLI](https://supabase.com/docs/guides/cli) (for local development)
- [Docker](https://www.docker.com/) (required for Supabase local development)

## Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd real-estate-management
   ```

2. **Install frontend dependencies**
   ```bash
   cd frontend
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your Supabase credentials
   ```

4. **Start Supabase local development** (optional, for local development)
   ```bash
   cd ..
   supabase start
   supabase db reset
   ```

5. **Start the development server**
   ```bash
   cd frontend
   npm run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:5173](http://localhost:5173)

## Project Structure

```
real-estate-management/
├── frontend/                 # Vue 3 frontend application
│   ├── src/
│   │   ├── components/       # Reusable Vue components
│   │   │   ├── ui/           # shadcn-vue components
│   │   │   └── layout/       # Layout components
│   │   ├── views/            # Page components
│   │   ├── composables/      # Vue composables (hooks)
│   │   ├── stores/           # Pinia stores
│   │   ├── types/            # TypeScript type definitions
│   │   ├── utils/            # Utility functions
│   │   ├── lib/              # Library configurations
│   │   └── router/           # Vue Router configuration
│   └── ...
├── supabase/                 # Supabase configuration
│   ├── migrations/           # Database migrations
│   └── config.toml           # Supabase local config
└── docs/                     # Documentation
```

## Available Scripts

### Root Directory
```bash
npm run dev          # Start frontend development server
npm run build        # Build frontend for production
npm run supabase:start   # Start local Supabase
npm run supabase:stop    # Stop local Supabase
npm run supabase:reset   # Reset database with migrations
```

### Frontend Directory
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run format       # Format code with Prettier
```

## Environment Variables

Create a `.env` file in the `frontend` directory:

```env
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

For local development with Supabase CLI, use:
```env
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<your-local-anon-key>
```

## Testing Authentication

### Create First Admin User

1. **Start Supabase and Frontend:**
   ```bash
   # Terminal 1 - Start Supabase
   supabase start

   # Terminal 2 - Start Frontend
   cd frontend
   npm run dev
   ```

2. **Create User via Supabase Studio:**
   - Open: http://127.0.0.1:54323
   - Navigate to: `Authentication` → `Users`
   - Click: `Add user`
   - Fill in:
     - Email: `admin@test.com`
     - Password: `password123`
     - **Check**: `Auto Confirm User` (important!)
   - Click: `Create user`

3. **Promote User to Admin:**
   - Open SQL Editor in Studio
   - Run:
     ```sql
     UPDATE profiles
     SET role = 'admin', full_name = 'Admin User'
     WHERE email = 'admin@test.com';
     ```

4. **Test Login:**
   - Open: http://localhost:5173
   - Should redirect to: `/login`
   - Login with:
     - Email: `admin@test.com`
     - Password: `password123`
   - Should redirect to: `/` (Dashboard)
   - Verify TopBar shows:
     - Email: admin@test.com
     - Badge: `admin`
     - Logout button works

### Authentication Flow Testing

**Protected Routes:**
- Try accessing `/properties` without login → redirects to `/login?redirect=/properties`
- Login → redirects back to `/properties`

**Logout:**
- Click user dropdown → Sign out
- Should redirect to `/login`
- Try accessing `/properties` → redirects to `/login`

**Role Checks:**
Currently all authenticated users can access all routes. Role-based route restrictions will be added in future phases.

## Project Status

### Implemented
- [x] Project structure and configuration
- [x] Vue 3 + TypeScript + Vite setup
- [x] TailwindCSS configuration
- [x] Router with all routes defined
- [x] Layout components (MainLayout, Sidebar, TopBar)
- [x] Placeholder views for all pages
- [x] Supabase client setup
- [x] Complete database schema with RLS policies
- [x] Type definitions
- [x] Authentication system (login, logout, session persistence)
- [x] Router guards for protected routes
- [x] Role-based user profiles (admin, manager, employee, agent)

### Pending Implementation
See [docs/TODO.md](docs/TODO.md) for the complete list of pending features.

## Contributing

1. Create a feature branch (`git checkout -b feature/amazing-feature`)
2. Commit your changes (`git commit -m 'Add some amazing feature'`)
3. Push to the branch (`git push origin feature/amazing-feature`)
4. Open a Pull Request

## License

This project is licensed under the MIT License.
