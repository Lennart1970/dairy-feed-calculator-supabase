# 🐄 Dairy Feed Calculator

A professional web application for calculating dairy cattle feed rations with VEM (Voeder Eenheid Melk), DVE (Darm Verteerbaar Eiwit), and OEB (Onbestendig Eiwit Balans) nutritional values.

## Features

- **Feed Library**: Comprehensive database of feedstuffs with nutritional values
- **Animal Profiles**: Create and manage profiles for different cattle types
- **Ration Calculator**: Calculate optimal feed rations based on nutritional requirements
- **Simple Authentication**: Secure login system with user management
- **Cloud Database**: Persistent data storage with Supabase

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite + TailwindCSS
- **Backend**: Express.js + tRPC
- **Database**: Supabase (PostgreSQL)
- **UI Components**: Radix UI + shadcn/ui

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm
- Supabase account (for database)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/YOUR_USERNAME/dairy-feed-calculator.git
cd dairy-feed-calculator
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
# Edit .env.local with your Supabase credentials
```

4. Run database migrations:
```bash
pnpm run db:push
```

5. Start the development server:
```bash
pnpm run dev
```

### Environment Variables

Create a `.env.local` file with the following variables:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key

# App Settings
NODE_ENV=development
PORT=3000
```

## Database Schema

### Tables

1. **users** - User authentication
   - username, password_hash, name, email, role

2. **animal_profiles** - Animal nutritional requirements
   - name, weight_kg, vem_target, dve_target_grams, max_bds_kg

3. **feeds** - Feed library
   - name, display_name, vem_per_unit, dve_per_unit, oeb_per_unit

## Scripts

```bash
pnpm run dev      # Start development server
pnpm run build    # Build for production
pnpm run start    # Start production server
pnpm run db:push  # Push database schema
```

## Default Credentials

| Username | Password | Role |
|----------|----------|------|
| admin | admin123 | Admin |
| user | user123 | User |

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/login` | POST | Authenticate user |
| `/api/auth/logout` | POST | Log out user |
| `/api/auth/status` | GET | Check auth status |

## License

MIT License

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
