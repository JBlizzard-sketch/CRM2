# Instructions for Next Agent

## 📋 Overview

This is a multi-channel CRM platform for Kenyan businesses supporting WhatsApp, SMS, Instagram, and TikTok communications. The project has been successfully imported and is fully functional with demo data.

## 🚀 Current State

**Application Status:** ✅ Running successfully on port 5000

**Features Working:**
- Dashboard with live metrics (messages, customers, orders, revenue)
- 4 demo businesses (Glam Beauty KE, Nairobi Skincare Co, Shades & Wigs Boutique, Chic Fashion Kenya)
- Customer management with tagging
- Multi-channel conversation tracking
- Product catalog with inventory
- Order management with multiple statuses
- 8 automation workflows
- Analytics dashboard with 60 days of data

**Data Storage:** In-memory with JSON file persistence at `.local/state/data/storage.json`

**API Keys Configured:** Supabase, Groq AI, Twilio (all in Replit Secrets)

**Database:** PostgreSQL created and schema pushed, but not actively used (in-memory storage is current implementation)

## 📁 Important Files to Review

1. **`IMPROVEMENT_ROADMAP.md`** - Comprehensive list of CRM improvements organized by priority and credit budget
2. **`SETUP_COMPLETE.md`** - Full setup documentation
3. **`replit.md`** - Project architecture and user preferences
4. **`server/demo-data-generator.ts`** - Demo data generation (optimized to 4 businesses)
5. **`shared/schema.ts`** - Complete database schema and types
6. **`server/storage.ts`** - Storage interface
7. **`server/memory-storage.ts`** - Current in-memory implementation

## 🎯 Next Development Phase

The user has provided a comprehensive analysis document with improvements. These have been organized into:

1. **Quick Wins** (under $1.50 in credits) - Immediate value features
2. **Foundation Tasks** ($1.50-$3.00) - Core infrastructure improvements
3. **Advanced Features** ($3.00-$4.50) - More complex enhancements

**See `IMPROVEMENT_ROADMAP.md` for the complete breakdown.**

## 🔧 How to Start Working

### 1. Review Current Application
```bash
# Application is already running
# View the dashboard at the webview URL
# Check logs with:
npm run dev
```

### 2. Understand the Codebase
```bash
# Key directories:
# - client/src/pages/ - All frontend pages
# - client/src/components/ - Reusable UI components (Shadcn)
# - server/ - Express backend with API routes
# - shared/ - Shared types and schemas
```

### 3. Check Demo Data
- 4 businesses in `storage.json`
- Each business has 30-50 customers, 10 products, 80-120 conversations, 40-80 orders
- Delete `.local/state/data/storage.json` and restart to regenerate

### 4. Work on Tasks
- Tasks are prioritized in `IMPROVEMENT_ROADMAP.md`
- Start with Quick Wins for immediate impact
- Each task includes time estimate and credit cost
- Test features after implementation

### 5. Database Migration (If Needed)
Currently using in-memory storage. To migrate to PostgreSQL:
- Schema is already pushed to database
- Update `server/storage.ts` to use `DatabaseStorage`
- Resolve camelCase/snake_case field mapping
- Test thoroughly before switching

## 🛠️ Development Commands

```bash
# Start dev server (already running)
npm run dev

# Push schema changes to database
npm run db:push

# Install new packages
# Use the packager_tool, NOT npm install manually

# Restart workflow after changes
# Use restart_workflow tool
```

## ⚠️ Important Guidelines

### DO:
- ✅ Test all changes using the screenshot tool
- ✅ Use Shadcn UI components from `client/src/components/ui/`
- ✅ Follow the design guidelines in the development instructions
- ✅ Keep tasks small and focused
- ✅ Update `replit.md` with any architectural changes
- ✅ Use TanStack Query for all data fetching
- ✅ Add `data-testid` attributes to interactive elements

### DON'T:
- ❌ Modify `vite.config.ts` or `server/vite.ts`
- ❌ Edit `package.json` directly (use packager_tool)
- ❌ Create huge files (split components appropriately)
- ❌ Use mock data in production code
- ❌ Implement features without testing them
- ❌ Change primary key types in database schema

## 🎨 Design System

**UI Library:** Shadcn UI with Radix primitives
**Styling:** Tailwind CSS with custom design tokens
**Theme:** Supports light/dark mode
**Icons:** Lucide React

**Key Components Available:**
- Button, Badge, Card, Avatar
- Dialog, Dropdown Menu, Popover
- Form, Input, Select, Textarea
- Table, Tabs, Tooltip
- Sidebar (for navigation)

## 📊 Current Demo Businesses

1. **Glam Beauty KE** - Makeup & cosmetics
2. **Nairobi Skincare Co** - Skincare products
3. **Shades & Wigs Boutique** - Hair products & wigs
4. **Chic Fashion Kenya** - Fashion & clothing

All businesses have complete data including customers, products, conversations, orders, automations, and 60 days of analytics.

## 🚦 Getting Started Checklist

- [ ] Read `IMPROVEMENT_ROADMAP.md` to see available tasks
- [ ] Take a screenshot to see current application state
- [ ] Review `replit.md` for architecture understanding
- [ ] Check `shared/schema.ts` for data models
- [ ] Look at existing pages in `client/src/pages/` for patterns
- [ ] Choose a task from the roadmap and start building!

## 💡 Tips for Success

1. **Start Small:** Pick Quick Wins first to deliver value fast
2. **Test Often:** Use screenshot tool and check logs frequently
3. **Follow Patterns:** Look at existing code for consistency
4. **Ask Questions:** If stuck, review the guidelines in this file
5. **Document Changes:** Update `replit.md` with significant changes

## 📞 Support Resources

- **Setup Documentation:** See `SETUP_COMPLETE.md`
- **Architecture Details:** See `replit.md`
- **Improvement Tasks:** See `IMPROVEMENT_ROADMAP.md`
- **Development Guidelines:** Check the system instructions in the agent context

---

**Ready to build? Start with `IMPROVEMENT_ROADMAP.md` to pick your first task!** 🚀
