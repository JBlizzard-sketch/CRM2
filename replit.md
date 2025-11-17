# Multi-Channel CRM System

## Overview

This is a multi-channel CRM (Customer Relationship Management) system designed for small businesses to manage customer communications across WhatsApp, SMS, Instagram, and TikTok. The platform provides comprehensive tools for tracking conversations, managing products and orders, creating automations, and analyzing business metrics.

The application enables businesses to centralize their customer interactions, streamline order management, and gain insights through analytics dashboards. It supports multiple business accounts within a single deployment and includes AI-powered features for sentiment analysis and natural language processing.

## Recent Changes

**Date:** November 15, 2025

**Import & Setup Completed:**
- Successfully imported project from Replit Agent to Replit environment
- All dependencies installed and configured
- Demo data optimized to 4 active businesses (removed 8 unused templates)
- All API keys configured as environment secrets (Supabase, Groq, Twilio)
- PostgreSQL database created and schema pushed (ready for future migration)
- Application fully functional with in-memory storage + file persistence

**Current Status:**
- ✅ Application running on port 5000
- ✅ 4 demo businesses with complete datasets
- ✅ All features operational (dashboard, customers, conversations, products, orders, automations, analytics)
- ✅ Data persisted in `.local/state/data/storage.json`

**Next Development Phase:**
- Comprehensive improvement roadmap created in `IMPROVEMENT_ROADMAP.md`
- Features organized by priority and $4.50 credit budget
- Next agent instructions prepared in `NEXT_AGENT_INSTRUCTIONS.md`
- Ready for feature development

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React with TypeScript using Vite as the build tool

**UI Component Library**: Shadcn UI with Radix UI primitives
- Uses the "new-york" style variant with customized design tokens
- Tailwind CSS for styling with custom color system supporting light/dark themes
- Design system inspired by Material Design, Linear, Intercom, and Notion for data-dense applications

**Routing**: Wouter for lightweight client-side routing

**State Management**: 
- TanStack Query (React Query) for server state management and data fetching
- Local React state for UI-specific state
- Custom theme context for dark/light mode switching

**Key Frontend Patterns**:
- Business-scoped views where all data is filtered by selected business ID
- Responsive design with mobile-first approach
- Component composition using Radix UI primitives for accessibility
- Centralized API request handling through query client

### Backend Architecture

**Runtime**: Node.js with Express.js framework

**Language**: TypeScript with ESM modules

**API Design**: RESTful endpoints organized by resource type
- `/api/businesses` - Business management
- `/api/customers/:businessId` - Customer data scoped to business
- `/api/conversations/:businessId` - Multi-channel conversations
- `/api/messages/:conversationId` - Message threads
- `/api/products/:businessId` - Product catalog
- `/api/orders/:businessId` - Order management
- `/api/automations/:businessId` - Business automations
- `/api/analytics/:businessId` - Daily analytics data

**Data Isolation**: All endpoints enforce business-level data isolation through businessId parameters, preparing for future RLS (Row Level Security) implementation

**Development Setup**: 
- Hot module reloading via Vite in development
- Modular route registration system
- Request/response logging middleware
- Demo data auto-generation on first run

### Data Storage

**Primary Database**: PostgreSQL (configured for use with Neon serverless)

**ORM**: Drizzle ORM for type-safe database queries
- Schema-first approach with TypeScript types generated from database schema
- Support for migrations via drizzle-kit
- Zod schemas for runtime validation derived from Drizzle schemas

**Fallback Storage**: In-memory storage implementation with file persistence
- Implements same interface as database storage (IStorage)
- Automatically saves to JSON file for persistence across restarts
- Used when database connection is unavailable

**Data Models**:
- **businesses**: Multi-tenant business accounts with unique slugs
- **customers**: Customer records with contact info, tags, and metadata
- **conversations**: Multi-channel conversation threads (WhatsApp, SMS, Instagram, TikTok)
- **messages**: Individual messages with direction (inbound/outbound) and channel
- **products**: Product catalog with pricing and inventory
- **orders**: Order records with status tracking
- **order_items**: Line items linking orders to products
- **automations**: Configurable automation rules with triggers and actions
- **automation_logs**: Execution history for automations
- **nlp_results**: NLP analysis results for messages
- **analytics_daily**: Daily aggregated metrics per business

**Relationships**:
- All core entities are scoped to a business via foreign keys
- Customers linked to conversations and orders
- Conversations contain multiple messages
- Orders contain multiple order_items referencing products

### Authentication and Authorization

**Current State**: No authentication implemented - placeholder for future implementation

**Planned Architecture**: 
- Supabase Auth integration (credentials available but not yet wired)
- Row Level Security (RLS) policies for business-level data isolation
- Service role key for admin operations
- Anonymous key for client-side operations

**Business Isolation**: Currently enforced at application level through businessId filtering; designed to work with future RLS policies

### External Dependencies

**Supabase**: 
- Primary database provider (PostgreSQL via Neon)
- Auth service (configured but not yet integrated)
- Connection via `@supabase/supabase-js` client
- Environment variables: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

**Twilio**:
- Multi-channel messaging (WhatsApp, SMS)
- Accessed via Replit Connectors API for credential management
- Gracefully degrades if not configured
- Environment variables retrieved dynamically: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`

**Groq AI**:
- Natural language processing and sentiment analysis
- Optional integration - system works without it
- Used for analyzing message sentiment, confidence scoring, and intent detection
- Environment variable: `GROQ_API_KEY`

**Google Fonts**:
- Inter font family via CDN for consistent typography
- Preconnected for performance optimization

**Development Tools**:
- Replit-specific plugins for development environment
- Runtime error modal overlay
- Cartographer for code navigation
- Development banner

**Key Design Decisions**:

1. **Modular External Services**: All third-party integrations (Twilio, Groq) are optional and fail gracefully when credentials are missing, allowing core functionality to work independently

2. **Dual Storage Strategy**: Fallback to memory storage ensures the application can run even without database connectivity, useful for development and testing

3. **Business Multi-tenancy**: Architecture supports multiple businesses in single deployment, with strict data isolation preparing for production RLS implementation

4. **Type Safety**: End-to-end TypeScript with shared types between client and server, Zod validation for runtime safety, and Drizzle for database type safety

5. **Demo Data Generation**: Automatic demo data population on first run provides immediate usability and testing capabilities with realistic Kenyan business scenarios

6. **Design System Consistency**: Shadcn UI components provide a cohesive design language while remaining customizable through Tailwind configuration