# Design Guidelines: Multi-Channel CRM System

## Design Approach

**Selected Approach**: Design System + Reference Hybrid
- **Primary System**: Material Design for data-dense applications with strong component hierarchy
- **References**: Linear (modern SaaS aesthetic), Intercom (messaging interface), Notion (flexible data views)
- **Principles**: Information clarity, workflow efficiency, visual hierarchy through spacing and typography

## Typography

**Font Family**: Inter (via Google Fonts CDN)
- **Headings**: 
  - H1: text-3xl font-semibold (Dashboard titles)
  - H2: text-2xl font-semibold (Section headers)
  - H3: text-xl font-medium (Card headers, table headers)
  - H4: text-lg font-medium (Subsections)
- **Body Text**:
  - Primary: text-base font-normal (General content, table cells)
  - Secondary: text-sm font-normal (Meta info, timestamps, helper text)
  - Tiny: text-xs font-normal (Labels, badges, status indicators)
- **Monospace**: Use `font-mono` for IDs, phone numbers, technical data

## Layout System

**Spacing Primitives**: Tailwind units of 2, 4, 6, 8, 12, 16
- **Component Padding**: p-4 to p-6 for cards, p-8 for main containers
- **Section Margins**: mb-6 to mb-8 between major sections
- **Element Gaps**: gap-4 for grids, gap-2 for inline elements
- **Container Max-Width**: max-w-7xl for main dashboard content

**Grid System**:
- **Main Layout**: Sidebar (w-64) + Content Area (flex-1)
- **Dashboard Cards**: grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6
- **Data Tables**: Full-width with horizontal scroll on mobile
- **Conversation View**: 2-column split on desktop (conversations list + message thread)

## Component Library

### Navigation
**Sidebar Navigation**:
- Fixed left sidebar (w-64) with company logo at top
- Navigation items with icons (Heroicons via CDN)
- Active state: slightly emphasized background
- Collapsed mobile state with hamburger menu
- Include sections: Dashboard, Customers, Conversations, Products, Orders, Automations, Analytics

**Top Bar**:
- Business switcher dropdown (left)
- Search bar (center, w-96)
- User profile + notifications (right)
- Height: h-16, border-b

### Data Display

**Tables**:
- Sticky header row with font-medium text-sm
- Row height: h-12 to h-14 with hover state
- Alternating row backgrounds for readability
- Action buttons in last column (icon-only, visible on hover)
- Pagination controls at bottom (previous/next + page numbers)
- Column sorting indicators (up/down arrows)

**Cards (Metrics/Stats)**:
- Rounded corners (rounded-lg)
- Padding: p-6
- Shadow: shadow-sm with hover:shadow-md transition
- Header with icon + title
- Large number display (text-3xl font-bold)
- Subtitle/change indicator (text-sm with arrow icon)

**Conversation Thread**:
- Left panel: List of conversations with customer avatar, name, last message preview, timestamp
- Right panel: Full message thread with message bubbles
- Inbound messages: align-left with subtle background
- Outbound messages: align-right with distinct background
- Message metadata: timestamp (text-xs), channel badge (WhatsApp/SMS icon)
- Input box at bottom with send button (fixed position)

### Forms & Inputs

**Text Inputs**:
- Height: h-10 for single-line, auto-height for textarea
- Border: border with focus:ring-2 focus:ring-offset-0
- Rounded: rounded-md
- Padding: px-3 py-2
- Labels: block mb-2 text-sm font-medium

**Buttons**:
- Primary: px-4 py-2 rounded-md font-medium
- Secondary: Similar styling with outline variant
- Icon buttons: p-2 rounded-md (for actions, filters)
- Button groups: Join borders with rounded-l/rounded-r on edges

**Filters & Search**:
- Filter bar: Sticky below header with flex gap-2 layout
- Filter pills: Removable tags with X icon
- Date range picker: Calendar dropdown
- Status toggles: Pill-style toggle buttons

### Status & Badges

**Status Indicators**:
- Dot + text format (flex items-center gap-2)
- Conversation status: Open (green dot), Closed (gray dot)
- Message direction: Inbound/Outbound badges
- Channel badges: Icon + text (WhatsApp, SMS, Instagram, TikTok)

**Data Badges**:
- Rounded-full px-2.5 py-0.5 text-xs font-medium
- Use for: Order status, automation status, priority levels

### Overlays & Modals

**Modals**:
- Max width: max-w-2xl for forms, max-w-4xl for data previews
- Backdrop: Semi-transparent overlay
- Modal content: rounded-lg p-6
- Header with close button (top-right X icon)
- Footer with action buttons (right-aligned)

**Dropdowns**:
- Rounded-md shadow-lg
- Max height with scroll: max-h-96 overflow-y-auto
- List items: px-4 py-2 with hover background
- Dividers between sections

**Toast Notifications**:
- Fixed position (top-right)
- Rounded-lg shadow-lg p-4
- Auto-dismiss after 5 seconds
- Success/error/info variants with appropriate icons

## Specific Views

### Dashboard Overview
- Top: Metrics cards in 4-column grid (messages today, active conversations, orders today, revenue)
- Middle: Recent conversations table + Recent orders table (2-column grid)
- Bottom: Daily analytics chart (full-width)

### Customers View
- Filter bar with search, date range, tags
- Data table with columns: Name, Phone, Email, Tags, Last Contact, Total Orders, Actions
- Click row to open customer detail sidebar

### Conversations View
- Split view: Conversation list (w-80) + Message thread (flex-1)
- Filter by: Open/Closed, Channel, Date range
- Search conversations by customer name or message content
- Mark as open/closed toggle in thread header

### Products & Orders
- Products: Card grid view OR table view toggle
- Orders: Table with expandable rows showing order_items
- Quick edit inline for stock, price, status

### Automations
- List of automations with: Name, Trigger, Status (Active/Inactive), Last Run
- Manual trigger button per automation
- Execution logs expandable below each automation
- Create/Edit modal with form fields

### Analytics
- Date range selector at top
- Metrics overview cards
- Charts: Line chart for messages over time, Bar chart for orders by channel
- Data table with daily breakdowns

## Icons
**Library**: Heroicons (via CDN) - use outline variant for navigation, solid for actions
- Navigation: Home, Users, MessageSquare, Package, ShoppingCart, Zap, ChartBar
- Actions: Edit, Trash, Send, Filter, Search, Plus, X
- Status: Check, Clock, AlertCircle, Info

## Accessibility
- Consistent focus states on all interactive elements (focus:ring-2)
- Semantic HTML (nav, main, section, article)
- ARIA labels for icon-only buttons
- Keyboard navigation support for tables and modals
- Sufficient contrast ratios throughout

## Performance Considerations
- Virtual scrolling for long conversation lists (100+ items)
- Paginated tables (50 items per page)
- Lazy load message history (load more on scroll)
- Debounced search inputs (300ms)
- Optimistic UI updates for instant feedback