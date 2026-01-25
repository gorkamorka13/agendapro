# Agenda Stable - Home Care Scheduling & Payroll Management System

A comprehensive web application for managing home care services for elderly patients. This system handles scheduling, assignments, time tracking, and payroll calculations for healthcare workers (intervenants) providing in-home assistance.

## 🎯 What This Application Does

**Agenda Stable** is a full-stack scheduling and payroll management platform designed specifically for home care agencies. It streamlines the entire workflow from scheduling patient visits to calculating worker compensation.

### Core Features

#### 📅 **Interactive Calendar Management**
- Visual calendar interface powered by FullCalendar
- Schedule assignments for healthcare workers (intervenants)
- Multiple calendar views: Month, Week, and Day
- Click-to-create appointments directly on the calendar
- Edit existing appointments by clicking on events
- Real-time calendar updates

#### 👥 **User & Patient Management**
- **User Roles**: Administrators and healthcare workers (intervenants)
- **Patient Profiles**: Store patient information including name, address, and contact details
- **Authentication**: Secure login system using NextAuth.js with credential-based authentication
- **User Settings**: Configure hourly rates and travel costs per worker

#### 📊 **Assignment Tracking**
- Create and manage patient visit assignments
- Track assignment status: Planned, Completed, or Cancelled
- Record actual worked hours for completed visits
- Link assignments to specific patients and workers
- Add notes and details for each assignment

#### 💰 **Payroll & Reporting System**
- Generate detailed payroll reports by worker and month
- Automatic calculation of:
  - Total hours worked
  - Hourly rate compensation
  - Travel costs per visit
  - Total payment due
- **PDF Export**: Generate professional PDF reports with detailed breakdowns
- View worked hours with patient details, start/end times, and durations

#### 🧾 **Invoice Management** (Database Schema Ready)
- Invoice generation for patients or organizations
- Line-item billing with customizable descriptions
- Track invoice status: Draft, Sent, or Paid
- Unique invoice numbering system

## 🛠️ Technology Stack

### Frontend
- **Framework**: [Next.js 14](https://nextjs.org) (App Router)
- **UI Library**: React 18
- **Styling**: Tailwind CSS
- **Calendar**: FullCalendar (with day grid, time grid, and interaction plugins)
- **PDF Generation**: jsPDF with jsPDF-AutoTable

### Backend
- **Runtime**: Node.js
- **API**: Next.js API Routes
- **Authentication**: NextAuth.js v4
- **Password Hashing**: bcrypt

### Database
- **ORM**: Prisma
- **Database**: PostgreSQL
- **Schema**: Comprehensive relational model with:
  - Users (with NextAuth integration)
  - Patients
  - Assignments
  - Worked Hours
  - Invoices & Invoice Line Items
  - NextAuth tables (Accounts, Sessions, Verification Tokens)

## 📁 Project Structure

```
agenda-stable/
├── app/
│   ├── (app)/              # Main application pages (protected)
│   │   ├── page.tsx        # Calendar dashboard
│   │   └── reports/        # Payroll reports page
│   ├── api/                # API routes
│   │   ├── assignments/    # Assignment CRUD operations
│   │   ├── auth/           # NextAuth configuration
│   │   ├── patients/       # Patient management
│   │   ├── reports/        # Report generation
│   │   └── users/          # User management
│   └── login/              # Login page
├── components/
│   ├── AssignmentCalendar.tsx  # Main calendar component
│   ├── AssignmentModal.tsx     # Create/Edit assignment modal
│   └── layout/                 # Layout components
├── prisma/
│   ├── schema.prisma       # Database schema definition
│   ├── migrations/         # Database migrations
│   └── seed.ts             # Database seeding script
└── lib/                    # Utility functions
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v20 or higher)
- PostgreSQL database
- npm, yarn, pnpm, or bun

### Installation

1. **Clone the repository**
   ```bash
   cd agenda-stable
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**

   Create a `.env` file in the root directory:
   ```env
   DATABASE_URL="postgresql://username:password@localhost:5432/database_name?schema=public"
   NEXTAUTH_SECRET="your-secret-key-here"
   NEXTAUTH_URL="http://localhost:3000"
   ```

4. **Set up the database**
   ```bash
   # Initialize Prisma
   npx prisma generate

   # Run migrations
   npx prisma migrate dev --name "create-full-project-schema"

   # Seed the database (optional)
   npx prisma db seed
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open the application**

   Navigate to [http://localhost:3000](http://localhost:3000) in your browser

### Database Management

- **Prisma Studio**: Visual database browser
  ```bash
  npx prisma studio
  ```

- **Reset Database**: Clear all data and re-run migrations
  ```bash
  npx prisma migrate reset
  ```

## 📖 Usage Guide

### For Administrators

1. **Login** with admin credentials
2. **Manage Users**: Add healthcare workers with their hourly rates and travel costs
3. **Manage Patients**: Create patient profiles with contact information
4. **Schedule Assignments**: Click on the calendar to create new appointments
5. **Generate Reports**: Navigate to Reports page, select worker and month, generate payroll reports
6. **Export PDFs**: Download professional PDF reports for record-keeping

### For Healthcare Workers

1. **Login** with worker credentials
2. **View Schedule**: See assigned appointments on the calendar
3. **Update Assignments**: Mark visits as completed or cancelled
4. **Track Hours**: Record actual worked hours for each visit

## 🔐 Security Features

- Secure password hashing with bcrypt
- Session-based authentication via NextAuth.js
- Role-based access control (Admin vs User)
- Protected API routes
- Database-level cascade deletion for data integrity

## 📝 Key Database Models

- **User**: Healthcare workers and administrators
- **Patient**: Elderly individuals receiving care
- **Assignment**: Scheduled visits linking users and patients
- **WorkedHours**: Actual time worked for payroll calculation
- **Invoice**: Billing documents for patients/organizations
- **InvoiceLineItem**: Detailed billing entries

## 🤝 Contributing

This is a private project. For questions or support, please contact the development team.

## 📄 License

Private and proprietary.
