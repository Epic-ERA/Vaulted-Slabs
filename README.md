# VaultedSlabs

A production-ready **Universal Expo app** (iOS + Android + Web) for tracking Pokémon TCG collection and graded card inventory with PSA verification.

## 🎯 What This App Does

### Phase 1 (Current)
- **Collection Tracking**: Track owned Pokémon TCG cards (graded and raw)
- **Set Browsing**: Browse canonical Pokémon TCG sets with card checklists
- **PSA Verification**: Verify PSA-graded cards via certificate number lookup
- **Analytics**: View collection completion stats, estimated values, and breakdowns
- **Admin Tools**: Sync Pokémon TCG data, manage monthly pricing, and manage user roles

### Phase 2 (Scaffolded, UI Hidden)
- Database tables and RLS policies ready
- PSA-verified marketplace listings (buy now + offers)
- Seller fee: 7.5% (configuration constant)
- **Not visible** in UI until `EXPO_PUBLIC_PHASE2_MARKETPLACE_ENABLED=true`

### Phase 3 (Future)
- Auction functionality (not yet implemented)

---

## 🏗️ Tech Stack

### Frontend
- **Expo SDK 54** (React Native)
- **Expo Router** (universal file-based routing)
- **TypeScript** (strongly typed)
- **React Native StyleSheet** (no NativeWind)

### Backend
- **Supabase** (Auth, Postgres, Storage, Edge Functions)
- **Edge Functions**: Pokémon TCG sync, PSA verification, admin management
- **RLS**: Row-level security on all tables

### APIs
- Pokémon TCG API (pokemontcg.io)
- PSA Public API (cert verification)

---

## 📦 Environment Variables

### Client-Safe (`.env`)
```
EXPO_PUBLIC_SUPABASE_URL=<your-supabase-url>
EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
EXPO_PUBLIC_PHASE2_MARKETPLACE_ENABLED=false
```

### Server-Only (Supabase Edge Function Secrets)
**These are automatically configured in your Supabase project:**
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (admin operations)
- `POKEMONTCG_API_KEY` - Pokémon TCG API key (optional but recommended)
- `PSA_API_BASE_URL` - PSA API base URL (default: https://api.psacard.com/publicapi)
- `PSA_BEARER_TOKEN` - PSA API bearer token (required for verification)

---

## 🚀 Setup Instructions

### Prerequisites
- Node.js 18+
- npm or yarn
- Expo account (optional, for EAS builds)

### Installation

\`\`\`bash
# Install dependencies
npm install

# Start development server (Web + iOS/Android)
npm run dev

# Build for web
npm run build:web
\`\`\`

### Running on Platforms

#### Web
\`\`\`bash
npm run dev
# Press 'w' to open in browser
\`\`\`

#### iOS
\`\`\`bash
npm run dev
# Press 'i' to open in iOS Simulator
# Requires Xcode on macOS
\`\`\`

#### Android
\`\`\`bash
npm run dev
# Press 'a' to open in Android Emulator
# Requires Android Studio
\`\`\`

---

## 🔐 Admin System

### How Admin Roles Work

**Admin roles are now managed via Supabase Auth \`app_metadata\`** (not a separate \`user_roles\` table).

- Admin status: \`user.app_metadata.role === "admin"\`
- Default: All users are regular users unless explicitly promoted
- Admin users see an admin bar at the top with access to:
  - Admin Dashboard
  - Sync (Pokémon TCG data)
  - Pricing (monthly card values)
  - Users (manage admin roles)

### Making an Email Admin

There are two ways to grant admin access:

#### Method 1: Bootstrap (Recommended for First Admin)

1. The email \`metauogaming@gmail.com\` is automatically granted admin on first login
2. This is handled by the \`admin-bootstrap\` Edge Function
3. Called silently after every login
4. Only works for that specific email

**To change the bootstrap email:**
- Edit \`supabase/functions/admin-bootstrap/index.ts\`
- Update the email check: \`if (user.email === 'your-email@example.com')\`
- Redeploy the function

#### Method 2: Admin Dashboard (For Subsequent Admins)

1. Log in as an existing admin
2. Navigate to Admin → Users tab
3. Search for the user by email
4. Click "Promote" to grant admin access
5. Click "Demote" to revoke admin access

**Security:**
- All admin operations use Edge Functions with service role key
- Client never has direct access to admin API
- RLS policies prevent unauthorized access

---

## 🗄️ Database Schema

### Tables Overview

| Table | Purpose |
|-------|---------|
| \`tcg_sets\` | Canonical Pokémon TCG set metadata (cached from API) |
| \`tcg_cards\` | Canonical card metadata (cached from API) |
| \`set_logo_assets\` | Maps set IDs to local bundled logo assets |
| \`collection_items\` | User-owned card inventory (graded + raw) |
| \`collection_item_images\` | User-uploaded photos for collection items |
| \`admin_card_prices\` | Monthly average prices (admin-managed) |
| \`sync_logs\` | Audit log for Pokémon TCG API sync operations |
| \`listings\` | Marketplace listings (Phase 2, feature-flagged) |

**Note:** The \`user_roles\` table is deprecated. Admin roles are now stored in Supabase Auth \`app_metadata\`.

### Key Design Decisions

#### Canonical Cards
- Each Pokémon TCG API card entry is its own checklist item
- **Never merge entries**, even if they share the same number
- Rarity-based labels for duplicates:
  - \`Holo\` if rarity contains "Holo" (not "Non-Holo")
  - \`Non-Holo\` if rarity contains "Non-Holo"
  - \`Variant\` for everything else

#### Owned Copies
- Each \`collection_items\` row = one physical copy
- Multiple copies allowed (e.g., 3x PSA 10 Charizard)
- **Edition/printing stored on owned copies**, not canonical cards:
  - \`variant\` field: \`1st_edition\`, \`shadowless\`, \`unlimited\`, \`reverse_holo\`, \`other\`
  - Marked as "seller-declared" in UI

#### Smart Sorting
Cards are sorted by:
1. **Primary**: Numeric part of \`card.number\` (e.g., "1", "10", "H1")
2. **Secondary**: Full \`card.number\` string (alphanumeric)
3. **Tertiary**: Rarity order (Holo → Non-Holo → Variant)

#### Card Numbering Display
Format: \`number/total\`
- Uses \`tcg_sets.printed_total\` first, fallback to \`tcg_sets.total\`
- Example: "4/102" (like Pikawiz/PokeData)

#### Categorization by Supertype
Set detail screens group cards into sections:
- **Pokémon** (most cards)
- **Trainer** (supporter/item cards)
- **Energy** (basic/special energy)

---

## 🔒 Row Level Security (RLS)

### Public Read Tables
- \`tcg_sets\`, \`tcg_cards\`, \`set_logo_assets\`, \`admin_card_prices\`
- Anyone can read (no auth required)

### User-Owned Tables
- \`collection_items\`, \`collection_item_images\`
- Users can only see/modify their own data
- RLS policy: \`user_id = auth.uid()\`

### Admin-Only Operations
- User management (promote/demote)
- Must use Edge Functions with service role key
- Client-side admin checks use \`app_metadata.role\`

### Phase 2 Tables
- \`listings\`: Sellers manage their own; public read for active listings

---

## 🔄 Pokémon TCG Sync

### How It Works
1. Admin triggers sync from Admin screen
2. Edge Function \`pokemon-sync\` fetches data from Pokémon TCG API
3. Upserts sets into \`tcg_sets\`
4. Upserts cards into \`tcg_cards\` (paginated, 250 per page)
5. Logs results to \`sync_logs\`

### Sync Options
- **Starter Sets**: Default sync (8 sets: Base, Jungle, Fossil, etc.)
- **Full Sync**: All sets in Pokémon TCG API (can take several minutes)

### Starter Sets Included
- Base Set (\`base1\`)
- Jungle (\`base2\`)
- Fossil (\`base3\`)
- Base Set 2 (\`base4\`)
- Team Rocket (\`base5\`)
- Wizards Black Star Promos (\`basep\`)
- Gym Heroes (\`gym1\`)
- Gym Challenge (\`gym2\`)

### API Rate Limits
- Pokémon TCG API: 20,000 requests/day (free tier)
- Using \`X-Api-Key\` header (recommended but optional)

---

## ✅ PSA Verification

### How It Works
1. User creates a collection item with \`cert_number\` (PSA only)
2. User taps "Verify with PSA"
3. Edge Function \`psa-verify-cert\` calls PSA public API server-side
4. Matches returned data to expected card:
   - **Name match**: Case-insensitive, normalized punctuation
   - **Year match**: PSA year vs. set release year (when available)
5. Updates \`collection_items\`:
   - \`psa_verified\` = true/false
   - \`psa_verified_at\` = timestamp
   - \`psa_image_url\` = PSA-provided image (if available)
   - \`psa_payload\` = full PSA response (for audit)

### Verification Requirements
- PSA certificate number required
- PSA API bearer token must be configured (server-side)
- Verification is **optional** for collection tracking
- Verification is **required** for Phase 2 marketplace listings

### Security
- All PSA API calls happen server-side (Edge Function)
- PSA bearer token **never** exposed to client
- User must own the collection item to verify

---

## 📊 Admin Monthly Pricing

### Workflow
1. Admin searches for card by name/number
2. Selects card, grading company, grade, variant, month
3. Enters average price + source note (e.g., "eBay sold listings")
4. Saves (upserts with unique constraint)

### Analytics Usage
Collection value estimation uses best-match logic:
1. **Exact match**: card + company + grade + variant + latest month
2. **Company + grade**: Ignore variant
3. **Company only**: Ignore grade + variant
4. **Fallback**: ANY company, latest month

### Data Source Notes
- Admins manually enter pricing data (no auto-scraping)
- Common sources: eBay, TCGPlayer, auction houses
- Monthly snapshots recommended for trend tracking

---

## 📱 App Structure (Directory Tree)

\`\`\`
vaultedslabs/
├── app/
│   ├── _layout.tsx                  # Root layout (AuthProvider)
│   ├── +not-found.tsx               # 404 handler
│   ├── index.tsx                    # Public landing page
│   ├── (auth)/
│   │   ├── _layout.tsx              # Auth layout (Stack)
│   │   └── login.tsx                # Login/signup screen
│   └── (app)/
│       ├── _layout.tsx              # App layout (Tabs + Header + AdminBar)
│       ├── index.tsx                # Redirect to /sets
│       ├── sets/
│       │   ├── index.tsx            # Sets list screen
│       │   └── [setId].tsx          # Set detail + card list (categorized)
│       ├── collection/
│       │   └── index.tsx            # Collection inventory screen
│       ├── analytics/
│       │   └── index.tsx            # Analytics + completion stats
│       └── admin/
│           └── index.tsx            # Admin panel (sync + pricing + users)
├── assets/
│   └── images/
│       ├── vaultedslabs-background-image.jpg  # Global background
│       ├── pokeball-icon.jpg                  # Tab bar icon
│       ├── base-set-logo-january-8th-1999.png # Set logos (bundled)
│       ├── jungle-set-logo-june-15th-1999.png
│       ├── fossil-set-logo-october-9th-1999.png
│       └── team-rocket-logo-april-23rd-2000.png
├── components/                      # Reusable UI components (future)
├── contexts/
│   └── AuthContext.tsx              # Auth state (user, session, isAdmin, signOut)
├── hooks/
│   └── useFrameworkReady.ts         # Framework initialization
├── lib/
│   ├── supabase.ts                  # Supabase client singleton
│   └── constants.ts                 # App constants (sets, companies, etc.)
├── services/                        # Data access layer
│   ├── auth.ts                      # Auth operations
│   ├── sets.ts                      # TCG sets queries
│   ├── cards.ts                     # TCG cards queries + sorting + tags
│   ├── collection.ts                # Collection CRUD + PSA verification
│   ├── admin.ts                     # Admin sync logs + pricing
│   └── analytics.ts                 # Analytics calculations
├── types/
│   └── database.ts                  # TypeScript types for Supabase
├── supabase/
│   ├── migrations/                  # Database migrations
│   │   ├── 20260112022533_create_vaultedslabs_schema.sql
│   │   ├── 20260112022558_enable_rls_and_policies.sql
│   │   └── 20260112032130_fix_security_performance_issues.sql
│   └── functions/                   # Edge Functions (deployed)
│       ├── pokemon-sync/
│       │   └── index.ts             # Sync Pokémon TCG data
│       ├── psa-verify-cert/
│       │   └── index.ts             # Verify PSA certificates
│       ├── admin-bootstrap/
│       │   └── index.ts             # Auto-grant admin to metauogaming@gmail.com
│       └── admin-users/
│           └── index.ts             # List users + promote/demote admins
├── .env                             # Environment variables
├── app.json                         # Expo config
├── package.json                     # Dependencies
├── tsconfig.json                    # TypeScript config
└── README.md                        # This file
\`\`\`

---

## 🎨 Design System

### Theme
- **Dark Vault Theme**: Black background with semi-transparent dark cards
- **Global Background**: \`vaultedslabs-background-image.jpg\` with 0.55 opacity overlay
- **Primary Color**: \`#DC0A2D\` (VaultedSlabs red)
- **Success**: \`#34c759\` (green, for verified badges)
- **Warning**: \`#ff9500\` (orange, for seller-declared variants)
- **Error**: \`#ff3b30\` (red)
- **Text**: White with varying opacity (rgba(255,255,255,0.85))

### Typography
- **Headers**: 24-32px, bold
- **Body**: 14-16px, regular
- **Captions**: 11-12px, regular

### Navigation
- **Main Header**: Username + Log Out button (all users)
- **Admin Bar**: Admin Dashboard, Sync, Pricing, Users (admin only)
- **Bottom Tabs**: Pokeball icons, only Sets/Collection/Analytics visible

### Spacing
- 8px base unit (multiples of 8)

---

## 🔐 Security Best Practices

### What's Safe
✅ Supabase URL and anon key in client code
✅ Public read on canonical data tables
✅ RLS policies enforce user ownership
✅ Admin checks use \`app_metadata\` (read-only for client)

### What's Dangerous
❌ PSA bearer token in client code
❌ Pokémon TCG API key in client code
❌ Service role key in client code
❌ Hardcoding API keys anywhere

### How We Handle It
- All 3rd-party API calls go through Edge Functions
- Server-side secrets never exposed to client
- RLS prevents unauthorized data access
- Admin operations use service role key server-side only

---

## 🧪 Testing & Development

### Local Development
\`\`\`bash
npm run dev
\`\`\`

### TypeScript Checking
\`\`\`bash
npm run typecheck
\`\`\`

### Linting
\`\`\`bash
npm run lint
\`\`\`

### Production Build (Web)
\`\`\`bash
npm run build:web
\`\`\`

---

## 🚧 Known Limitations (Phase 1)

### Not Yet Implemented
- Card detail modal (tap card → show owned copies)
- Add/Edit collection item modal (with PSA scan + verify)
- Advanced filters (grading company, grade range, variant)
- Image uploads (Expo Camera + ImagePicker)
- Supabase Storage bucket policies
- Admin pricing UI (card search + price entry)

### Workarounds
- Create collection items via SQL for testing
- Manually upload logos for additional sets
- Run sync from Admin screen (requires admin role)

---

## 📝 Phase 2 Marketplace (Scaffolded)

### What's Ready
- \`listings\` table with RLS policies
- Sale types: \`buy_now\`, \`offer\`
- Status workflow: \`draft\` → \`active\` → \`sold\`/\`canceled\`
- \`requires_psa_verified\` flag (default: true)

### What's Not Ready
- UI screens (hidden behind feature flag)
- Offer submission/management
- Payment processing (Stripe integration)
- Buyer/seller messaging

### How to Enable (Testing Only)
\`\`\`bash
# In .env
EXPO_PUBLIC_PHASE2_MARKETPLACE_ENABLED=true
\`\`\`

---

## 🤝 Contributing

### Adding a New Screen
1. Create file in \`app/(app)/[screen]/index.tsx\`
2. Add tab in \`app/(app)/_layout.tsx\`
3. Use pokeball icon or custom icon from \`lucide-react-native\`

### Adding a Service
1. Create file in \`services/[domain].ts\`
2. Export typed functions
3. Use Supabase client from \`lib/supabase.ts\`

### Adding a Migration
1. Use Supabase dashboard or CLI
2. Follow naming: \`YYYYMMDDHHMMSS_description.sql\`
3. Include detailed comments

### Adding an Edge Function
1. Create directory in \`supabase/functions/[name]/\`
2. Add \`index.ts\` with CORS headers
3. Deploy using Supabase CLI or dashboard
4. Test with \`supabase.functions.invoke('[name]', { body: {} })\`

---

## 📄 License

MIT License - feel free to use this as a template for your own projects.

---

## 🙏 Acknowledgments

- **Pokémon TCG API** (pokemontcg.io) for canonical card data
- **PSA** (psacard.com) for grading verification
- **Supabase** for backend infrastructure
- **Expo** for universal app framework

---

## 📞 Support

For issues or questions:
1. Check the code comments for implementation details
2. Review Supabase logs for Edge Function errors
3. Verify RLS policies if you encounter permission errors
4. Ensure environment variables are set correctly

---

**Built with ❤️ for Pokémon TCG collectors**
