# StockRakh - Inventory Management System

A production-grade internal inventory management system for automobile spare-parts business built with Next.js, MongoDB, and Cloudinary.

## Features

- **Secure Authentication**: Username/password login with session management
- **Dashboard**: Overview of total parts, inventory value, and recent activities
- **Parts Management**: Full CRUD operations for inventory items
- **Global Search**: Search across part name, number, brand, supplier, location, and description
- **Image & Bill Upload**: Cloudinary integration for storing part images and bills
- **Activity Tracking**: Automatic logging of all inventory changes
- **Responsive UI**: Business-friendly interface optimized for daily operations

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: MongoDB
- **Image Storage**: Cloudinary
- **Authentication**: Session-based with bcrypt password hashing
- **Styling**: Tailwind CSS
- **Language**: TypeScript

## Prerequisites

- Node.js 18+ and pnpm (or npm/yarn)
- MongoDB instance (local or cloud)
- Cloudinary account

## Setup Instructions

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory:

```env
# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB_NAME=stockrakh

# Authentication Credentials
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-plain-password

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Next.js
NODE_ENV=development
```

### 3. Set Your Password

Simply set `ADMIN_PASSWORD` to your desired password in plain text. For example:

```env
ADMIN_PASSWORD=mySecurePassword123
```

**Note:** The password is stored in plain text in the `.env.local` file. Keep this file secure and never commit it to version control.

### 4. Initialize Database Indexes

After starting the server, visit `/api/init-db` to create the necessary database indexes, or they will be created automatically on first use.

### 5. Run Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
stockrakh/
├── app/
│   ├── api/
│   │   ├── auth/          # Authentication endpoints
│   │   ├── dashboard/     # Dashboard stats
│   │   ├── parts/         # Parts CRUD and search
│   │   └── upload/        # Image upload
│   ├── dashboard/         # Dashboard page
│   ├── login/             # Login page
│   └── parts/             # Parts management page
├── components/
│   └── parts/             # Part modal component
├── lib/
│   ├── db/                # MongoDB connection
│   ├── models/            # Data models
│   ├── services/          # Cloudinary service
│   ├── middleware/        # Auth middleware
│   └── validators/        # Zod schemas
└── scripts/               # Utility scripts
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Check authentication status

### Parts
- `GET /api/parts` - Get all parts
- `POST /api/parts` - Create new part
- `GET /api/parts/[id]` - Get part by ID
- `PUT /api/parts/[id]` - Update part
- `DELETE /api/parts/[id]` - Delete part
- `GET /api/parts/search?q=query` - Search parts

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics

### Upload
- `POST /api/upload/image` - Upload image to Cloudinary

## Database Schema

### Inventory Collection

```typescript
{
  partName: string;           // Required
  partNumber: string;         // Required
  quantity: number;           // Required
  location: string;           // Required
  unitOfMeasure: string;     // Required
  partImages?: string[];      // Optional - Cloudinary URLs
  brand?: string;            // Optional
  description?: string;       // Optional
  buyingPrice?: number;      // Optional
  mrp?: number;              // Optional
  supplier?: string;         // Optional
  billingDate?: Date;        // Optional
  billImages?: string[];     // Optional - Cloudinary URLs
  createdAt: Date;
  updatedAt: Date;
}
```

## Security Features

- Password hashing with bcrypt
- Session-based authentication
- Protected API routes
- Server-side input validation
- Secure cookie handling

## Future Enhancements

The system is designed to easily extend with:
- Multi-user support with roles
- Low-stock alerts
- CSV import/export
- Advanced reporting
- Email notifications

## License

Private - Internal use only
