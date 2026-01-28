# Setup Guide

This guide provides detailed instructions for setting up the Real Estate Management System for development.

## Prerequisites

### Required Software

1. **Node.js** (v18 or higher)
   - Download from [nodejs.org](https://nodejs.org/)
   - Verify installation: `node --version`

2. **npm** (v9 or higher)
   - Comes with Node.js
   - Verify installation: `npm --version`

3. **Supabase CLI** (for local development)
   - Install via npm: `npm install -g supabase`
   - Or via Homebrew (macOS): `brew install supabase/tap/supabase`
   - Verify installation: `supabase --version`

4. **Docker** (required for Supabase local development)
   - Download from [docker.com](https://www.docker.com/)
   - Ensure Docker Desktop is running before starting Supabase

## Step-by-Step Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd real-estate-management
```

### 2. Install Frontend Dependencies

```bash
cd frontend
npm install
```

This will install all required packages including:
- Vue 3 and Vue Router
- Pinia for state management
- Supabase JavaScript client
- TailwindCSS and related packages
- TypeScript and development tools

### 3. Set Up Environment Variables

```bash
# In the frontend directory
cp .env.example .env
```

Edit the `.env` file with your Supabase credentials:

```env
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Supabase Setup

You have two options for Supabase:

#### Option A: Local Development (Recommended for development)

1. **Start Docker Desktop** (ensure it's running)

2. **Initialize and start Supabase**
   ```bash
   cd ..  # Go to project root
   supabase start
   ```

3. **Apply database migrations**
   ```bash
   supabase db reset
   ```

4. **Get local credentials**
   ```bash
   supabase status
   ```
   Copy the `API URL` and `anon key` to your `.env` file.

5. **Access Supabase Studio**
   Open [http://127.0.0.1:54323](http://127.0.0.1:54323) in your browser.

#### Option B: Supabase Cloud

1. Create a project at [supabase.com](https://supabase.com)
2. Go to Project Settings > API
3. Copy the Project URL and `anon` public key to your `.env` file
4. Run the SQL from `supabase/migrations/20240101000000_initial_setup.sql` in the SQL Editor

### 5. Install shadcn-vue Components (Optional)

The project is configured for shadcn-vue. To add components:

```bash
cd frontend
npx shadcn-vue@latest add button
npx shadcn-vue@latest add card
npx shadcn-vue@latest add input
# Add more components as needed
```

### 6. Start the Development Server

```bash
cd frontend
npm run dev
```

The application will be available at [http://localhost:5173](http://localhost:5173).

## Verification

After setup, verify everything works:

### 1. Check the Application

- Open [http://localhost:5173](http://localhost:5173)
- You should see the login page
- Navigate to [http://localhost:5173/](http://localhost:5173/) to see the dashboard
- Check that navigation between views works

### 2. Check Supabase (if using local)

- Open [http://127.0.0.1:54323](http://127.0.0.1:54323)
- Go to Table Editor
- Verify the `profiles` table exists

### 3. Check for Console Errors

- Open browser DevTools (F12)
- Check the Console tab for errors
- Only expected warnings should appear (e.g., missing .env values if not configured)

## Common Issues

### Port Already in Use

If port 5173 is in use:
```bash
# Find the process
netstat -ano | findstr :5173  # Windows
lsof -i :5173                 # macOS/Linux

# Or change the port in vite.config.ts
```

### Supabase Won't Start

1. Ensure Docker Desktop is running
2. Try stopping and restarting:
   ```bash
   supabase stop
   supabase start
   ```

### TypeScript Errors

If you see TypeScript errors after installation:
```bash
# Restart VS Code or run:
npm run build
```

### Missing Dependencies

If imports fail:
```bash
rm -rf node_modules
npm install
```

## Development Workflow

1. **Start Supabase** (if using local)
   ```bash
   supabase start
   ```

2. **Start the dev server**
   ```bash
   cd frontend
   npm run dev
   ```

3. **Make changes** - Vite provides hot module replacement

4. **Stop when done**
   ```bash
   # Stop dev server: Ctrl+C
   # Stop Supabase:
   supabase stop
   ```

## Next Steps

Once setup is complete, you can start implementing features. See [TODO.md](TODO.md) for the list of pending implementations.
