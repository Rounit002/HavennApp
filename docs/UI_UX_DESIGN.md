# UI/UX Design

This document describes the design system, interaction patterns, and UX guidelines for Havenn.

## Principles
- Clarity over density
- Fast first interaction (optimize for task completion)
- Consistency across web and mobile WebView
- Accessible by default (aim WCAG AA)

## Design System
- Framework: React + TypeScript + Vite
- Components: shadcn/ui and Radix primitives
- Styling: Tailwind CSS (with tailwind-merge), typography plugin when helpful
- Icons: lucide-react
- State: React Query for server state, `react-hot-toast`/`sonner` for notifications

### Tokens & Layout
- Spacing: Tailwind scale (4/8px increments)
- Radius: subtle rounding for inputs/cards
- Elevation: minimal shadows; avoid heavy elevations in data views
- Breakpoints: mobile-first, verify at 360px, 768px, 1024px, 1280px
- Theme: light/dark via `next-themes` or equivalent

## Navigation
- HashRouter-based navigation for WebView compatibility
- Top-level areas: Dashboard, Students, Attendance/QR, Hostel, Transactions, Advance Payments, Collections, Expenses, Reports, Products, Lockers, Announcements, Admission Requests, Settings, Subscription
- Use ProtectedRoute/AdminRoute wrappers for gated areas

## Forms & Data Tables
- Validation: zod + react-hook-form (errors inline below fields)
- Inputs: label + helper text; clear error state and success toasts
- Tables: sticky headers on long lists; pagination when needed

## Feedback & States
- Loading: skeletons or spinner in primary region
- Empty states: actionable copy with CTAs (e.g., “Add student”)
- Notifications: toasts for success/info; inline error text for recoverable issues
- Confirmations: modal for destructive actions

## Accessibility
- Keyboard focus styles visible; tab order intuitive
- ARIA labels for icons-only controls
- Sufficient color contrast; test dark mode

## Mobile WebView Constraints
- Avoid blocking modals; prefer bottom sheets/drawers for small screens
- Reduce network round-trips; batch requests where possible
- QR scanning flows should work reliably with camera permissions

## Content & Copy
- Use short, action-oriented labels
- Keep system messages consistent (title + sentence; avoid jargon)

## Visual References
- Components are derived from shadcn/ui; keep overrides minimal and consistent

## QA Checklist (per screen)
- [ ] Works at 360px width
- [ ] Keyboard-only navigation
- [ ] Clear empty/loading/error states
- [ ] Accessible labels for inputs and interactive icons
