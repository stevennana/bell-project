# Bell Project - Admin Dashboard

This is the admin dashboard for managing restaurants in the Bell Project system.

## Features

- Restaurant CRUD operations (Create, Read, Update, Delete)
- Restaurant ID and name management
- Owner credentials management
- Activation code generation
- Status management (active/inactive)
- Real-time API integration with fallback to demo mode

## Development

### Prerequisites

- Python3 (for local development server)
- Backend API running on `http://localhost:3000`

### Running Locally

```bash
# Start the admin server (from project root)
./dev-local.sh

# Or manually start just the admin server
cd frontend/admin
npm run dev
# OR
python3 -m http.server 8080
```

### Access

- **URL**: http://localhost:8080
- **Login**: admin@bell.com / admin123

### Project Structure

```
frontend/admin/
├── package.json          # Project configuration
├── index.html            # Main admin dashboard
└── README.md            # This file
```

## API Integration

The admin dashboard connects to the backend API at `http://localhost:3000` with the following endpoints:

- `GET /restaurants` - Get all restaurants
- `POST /restaurants` - Create new restaurant  
- `GET /restaurants/{id}` - Get restaurant details
- `PUT /restaurants/{id}` - Update restaurant
- `DELETE /restaurants/{id}` - Delete restaurant
- `POST /restaurants/verify` - Verify owner credentials

### Authentication

Uses HTTP Basic Authentication:
- Username: `admin@bell.com`
- Password: `admin123`

### Fallback Mode

When the backend API is not available, the dashboard automatically switches to demo mode using mock data stored in localStorage.

## Building

This is a static HTML application, so no build process is required. Simply serve the files with any HTTP server.

## Production Deployment

For production, this admin dashboard can be:
1. Served from any static web server (nginx, Apache, etc.)
2. Deployed to AWS S3 + CloudFront
3. Integrated with your existing frontend build pipeline

Make sure to update the `API_BASE_URL` in `index.html` to point to your production API endpoint.