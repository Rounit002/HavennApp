# Havenn Frontend Component & Page Catalog

## Overview
The Havenn frontend is a Vite-powered React + TypeScript application. This document inventories every shipped page component, shared component, and utility module so you can quickly locate and understand the building blocks that make up the UI.

---

## Entry Points & Global Styles
- **App.tsx** — `Frontend/src/App.tsx`
  - Root component that wires up routing, high-level layouts, and providers.
- **main.tsx** — `Frontend/src/main.tsx`
  - Vite bootstrap that mounts the React tree.
- **App.css** — `Frontend/src/App.css`
  - Global component-level styles referenced by the app shell.
- **index.css** — `Frontend/src/index.css`
  - Tailwind and base style resets.

---

## Application Pages (`Frontend/src/pages`)
- **ActiveHostelStudents.tsx** — Lists hostel students whose memberships are currently active.
- **ActiveStudents.tsx** — Library-focused view of active student memberships with filtering and actions.
- **AdminQueries.tsx** — Admin console for responding to submitted queries.
- **AdmissionRequests.tsx** — Workflow for reviewing and approving admission requests.
- **AdvancedPayment.tsx** — Handles library advance payment workflows and hosted invoice attachments.
- **AllStudents.tsx** — Comprehensive student index with advanced filtering, export, and actions.
- **Announcements.tsx** — Announcements management dashboard combining creation and list views.
- **Attendance.tsx** — Legacy attendance dashboard with branch and range filtering.
- **AttendancePage.tsx** — Simplified attendance landing page that links into detailed views.
- **BarcodePage.tsx** — Dedicated page for printing or scanning barcodes.
- **BranchStudentsPage.tsx** — Focused view scoped to a single branch's student roster.
- **CollectionDue.tsx** — Finance page tracking collections, dues, and payment breakdowns.
- **Dashboard.tsx** — Primary analytics dashboard aggregating KPIs, statuses, and quick links.
- **DeleteAccount.tsx** — Flow for account deletion confirmation and processing.
- **EditHostelStudent.tsx** — Form to edit hostel student details including assignments.
- **EnhancedAttendance.tsx** — Upgraded attendance experience with timeline visualisation.
- **Expenses.tsx** — Expense tracking grid with creation and categorisation tools.
- **ExpiredHostelMemberships.tsx** — List of hostel students whose memberships have lapsed.
- **ExpiredMemberships.tsx** — Library membership expiry management page with follow-up tooling.
- **ExpiringMembershipsPage.tsx** — Forecast of memberships approaching expiry.
- **HostelCollectionDue.tsx** — Finance tooling for hostel collections and dues.
- **HostelDashboard.tsx** — Hostel-specific dashboard summarising occupancy, dues, and alerts.
- **HostelPage.tsx** — Entry point for hostel student management.
- **HostelStudentDetails.tsx** — Detail profile view for a hostel student.
- **InactiveStudents.tsx** — View of students marked inactive with reactivation utilities.
- **Index.tsx** — Minimal wrapper that redirects to the primary app shell.
- **LandingPage.tsx** — Marketing-oriented landing page for the Havenn platform.
- **LockerManagement.tsx** — Interface for assigning and tracking lockers.
- **Login.tsx** — Staff login screen.
- **ManageBranches.tsx** — Branch administration including creation and edits.
- **ManagePublicRegistration.tsx** — Controls for toggling public registration availability.
- **NewQuery.tsx** — Form to submit new queries/support tickets.
- **NotFound.tsx** — 404 fallback page.
- **OwnerLogin.tsx** — Owner-specific authentication screen.
- **OwnerRegister.tsx** — Owner onboarding and registration flow.
- **ProductsPage.tsx** — Product inventory management interface.
- **ProfitLoss.tsx** — Profit & loss analytics with charts and summaries.
- **PublicQueries.tsx** — View of publicly submitted queries.
- **PublicRegistration.tsx** — Public self-registration flow for prospective students.
- **QueryDetail.tsx** — Detailed view for a single admin query thread.
- **QueryDetails.tsx** — Variant detail view (legacy support for earlier routing).
- **RegistrationStatus.tsx** — Status tracker for pending public registrations.
- **Root.tsx** — Layout wrapper used by React Router to nest routes.
- **Schedule.tsx** — Schedules and shift planning board.
- **SeatsPage.tsx** — Seat allocation and availability manager.
- **Settings.tsx** — Admin settings covering billing, appearance, and integrations.
- **ShiftList.tsx** — Shift catalogue with creation and editing capability.
- **ShiftStudents.tsx** — Attendance-focused roster grouped by shift.
- **StudentDashboard.tsx** — Comprehensive student analytics dashboard with cards, charts, and data tables.
- **StudentDetails.tsx** — Detailed student profile view with invoices and history.
- **StudentLogin.tsx** — Self-service login screen for students.
- **SubscriptionPlans.tsx** — Subscription plan selection and purchase workflow (Google Play billing aware).
- **TransactionsPage.tsx** — Transaction ledger with filtering, exports, and receipts.

> _Additional artefacts:_ `AdvancedPayment.tsx.backup` and the assorted `.jpg`/`.png` banner files under `src/pages` are retained assets for historic layouts and print collateral.

---

## Shared Components (`Frontend/src/components`)

### Layout & Navigation
- **MobileNav.tsx** — Compact navigation for handheld devices.
- **Navbar.tsx** — Top navigation bar showing subscription status and user menu.
- **Sidebar.tsx** — Permission-aware primary navigation with collapsible sections.
- **ResponsiveContainer.tsx** — Utility wrapper that constrains content width and paddings across breakpoints.

### Access, Workflow & Integration Helpers
- **AdminRoute.tsx** — Route guard that restricts access to admin-only areas.
- **BarcodeGenerator.tsx** — Generates printable QR/barcode cards.
- **BarcodeScanner.tsx** — Camera-powered barcode scanner component.
- **GooglePlaySubscription.tsx** — Wrapper for Google Play Billing purchase and status handling.
- **ManualTimeEntry.tsx** — Manual attendance editor for edge cases.
- **QRCodeTest.tsx** — Development helper for verifying QR code rendering.
- **RegistrationLinkCard.tsx** — Shareable card with public registration link and QR code.

### Forms & Data Management
- **AddBranchForm.tsx** — Form to create new branch records.
- **AddStudentForm.tsx** — Full-featured student enrollment wizard with seat/locker selection.
- **AddTransactionForm.tsx** — Form to record revenue transactions.
- **AddUserForm.tsx** — Staff account creation form with permission assignment.
- **AnnouncementForm.tsx** — Rich announcement composer.
- **HostelStudentForm.tsx** — Hostel student intake form handling allocations and payments.
- **InvoiceModal.tsx** — Modal dialog presenting invoice line items and download actions.
- **StaffManagement.tsx** — Staff admin console for permissions and branch access management.
- **ForgotPassword.tsx** — Password reset flow embedded within authentication screens.

### Data Displays & Widgets
- **AnnouncementList.tsx** — Stylised announcement feed with status indicators.
- **BranchList.tsx** — Card/grid view of existing branches.
- **EditStudentForm.tsx** — Rich form for editing an existing student (paired with detail page).
- **ExpiringMemberships.tsx** — Widget summarising expiring memberships.
- **HostelStudentList.tsx** — Tabular list of hostel students with filters.
- **InvoiceButton.tsx** — Trigger control that opens invoice modal/prints receipts.
- **PrintableProfile.tsx** — Print-friendly student profile layout.
- **StatCard.tsx** — KPI card component used across dashboards.
- **StudentAnnouncements.tsx** — Student-facing announcement list.
- **StudentList.tsx** — Paginated table of library students with actions.
- **TransactionRow.tsx** — Row renderer for transaction tables.

### Assets
Image assets living alongside components (e.g., `logo.jpg`, `MansaLogo.png`, `UdaanLibrary.jpg`, `archanalogo.png`, `sdf.jpg`) support branding within the shared components but do not export React code.

---

## UI Primitive Library (`Frontend/src/components/ui`)
Shadcn/Radix-inspired building blocks that power the shared components. Each file re-exports a styled primitive:
- **accordion.tsx** — Accordion primitives.
- **alert-dialog.tsx** — Alert dialog modal controls.
- **alert.tsx** — Banner and inline alert variants.
- **aspect-ratio.tsx** — Container enforcing element ratios.
- **avatar.tsx** — Avatar and fallback initials.
- **badge.tsx** — Status badge styles.
- **breadcrumb.tsx** — Breadcrumb trail component.
- **button.tsx** — Primary button styles and variants.
- **calendar.tsx** — Calendar/date picker wrapper.
- **card.tsx** — Card container system.
- **carousel.tsx** — Carousel/slider primitive.
- **chart.tsx** — Chart.js helper wrappers.
- **checkbox.tsx** — Styled checkbox component.
- **collapsible.tsx** — Collapsible content primitive.
- **command.tsx** — Command palette infrastructure.
- **context-menu.tsx** — Context menu primitives.
- **dialog.tsx** — Modal dialog primitives.
- **drawer.tsx** — Drawer/slide-over component.
- **dropdown-menu.tsx** — Dropdown menu primitives.
- **form.tsx** — Form context helpers.
- **hover-card.tsx** — Hover-triggered floating card.
- **input-otp.tsx** — OTP input group.
- **input.tsx** — Styled text input.
- **label.tsx** — Form label primitive.
- **menubar.tsx** — Menu bar navigation.
- **navigation-menu.tsx** — Mega navigation menu components.
- **pagination.tsx** — Pagination controls.
- **popover.tsx** — Popover primitives.
- **progress.tsx** — Progress bar component.
- **radio-group.tsx** — Styled radio group.
- **resizable.tsx** — Resizable panel container.
- **scroll-area.tsx** — Custom scroll area.
- **select.tsx** — Styled select dropdown.
- **separator.tsx** — Horizontal/vertical separators.
- **sheet.tsx** — Sliding sheet/dialog primitive.
- **sidebar.tsx** — Layout primitive for Shadcn sidebar patterns.
- **skeleton.tsx** — Skeleton loading state component.
- **slider.tsx** — Range slider.
- **sonner.tsx** — Toaster provider binding to Sonner.
- **switch.tsx** — Toggle switch.
- **table.tsx** — Table primitives.
- **tabs.tsx** — Tabs controller.
- **textarea.tsx** — Styled textarea.
- **toast.tsx** — Toast primitive bindings.
- **toaster.tsx** — Toast viewport provider.
- **toggle-group.tsx** — Toggle group primitive.
- **toggle.tsx** — Toggle button.
- **tooltip.tsx** — Tooltip primitive.
- **use-toast.ts** — Hook for triggering toasts.

---

## Utility Modules (`Frontend/src/utils`)
- **apiConfig.ts** — Centralised API base URL detection plus authenticated fetch helper.
- **attendanceUtils.ts** — Helpers for formatting attendance durations, dates, and status labels.
- **platformUtils.ts** — Platform detection utilities (Cordova vs web) and helper hooks.

---

## Supporting Modules
While not requested explicitly, these directories provide essential context:
- **context/AuthContext.tsx** — Authentication provider supplying user/session state.
- **hooks/use-mobile.tsx** — Media-query driven mobile detection hook.
- **hooks/use-toast.ts** — Domain hook wrapping the UI toast primitives.
- **services/api.ts** — Axios-like client for calling backend endpoints.
- **config/permission.ts** — Permission catalogue used throughout the app.
- **lib/utils.ts** — Helper for class name merging and utility functions.
- **types/cordova-plugin-purchase.d.ts** — Type definitions for the Cordova billing plugin.

---

_Last updated: 10 Jun 2026._
