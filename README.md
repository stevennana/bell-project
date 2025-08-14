# Bell Project - QR-based Restaurant Ordering System

A serverless restaurant ordering and payment system built with AWS Lambda, DynamoDB, and API Gateway. Customers scan QR codes to access menus, place orders, and make payments via NaverPay/KakaoPay, while restaurant owners manage orders through a dashboard with POS printer integration.

## Architecture

- **Frontend**: Static site (S3 + CloudFront)
- **Backend**: AWS Lambda + API Gateway (TypeScript)
- **Database**: DynamoDB with GSI for querying
- **Authentication**: Cognito (production) or JWT (development)
- **Payments**: NaverPay & KakaoPay integration
- **POS Integration**: ESC/POS printer support
- **Automation**: EventBridge for auto-completion

## Features

### Customer Features
- QR code menu access
- Real-time menu browsing with options/pricing
- Cart management with TTL expiration
- NaverPay/KakaoPay payment integration
- Order status tracking
- Pickup notifications

### Owner Features
- Menu version management
- Real-time order processing
- POS printer integration (kitchen tickets/receipts)
- Order status management
- Sales reporting by date
- Automated order completion

### Business Logic
- Menu versioning with historical snapshots
- Order auto-completion after 30 minutes
- Cart expiration after 10 minutes
- Refund caps (5% after cooking starts)
- Price validation and menu synchronization

## Project Structure

```
/
├── src/
│   ├── handlers/          # Lambda function handlers
│   │   ├── menu.ts       # GET/POST /menu
│   │   ├── order.ts      # POST/GET/DELETE /order
│   │   ├── pos.ts        # POS printing operations
│   │   ├── payment-callback.ts  # Payment webhooks
│   │   └── auto-complete.ts     # Scheduled completion
│   ├── lib/              # Shared libraries
│   │   ├── dynamodb.ts   # Database operations
│   │   ├── payment.ts    # Payment provider integrations
│   │   ├── pos-printer.ts # ESC/POS formatting
│   │   ├── validation.ts # Request validation
│   │   └── auth.ts       # JWT/Cognito authentication
│   └── types/            # TypeScript definitions
│       ├── api.ts        # API request/response types
│       ├── database.ts   # DynamoDB entity types
│       └── payment.ts    # Payment provider types
├── template.yaml         # SAM infrastructure template
├── samconfig.toml        # SAM deployment configuration
└── package.json          # Dependencies and scripts
```

## Quick Start

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- AWS CLI configured (for production deployment only)
- AWS SAM CLI installed

### Installation

1. **Clone and install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment variables**:
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

3. **Build the project**:
   ```bash
   npm run build
   ```

### Local Development

1. **Start local development environment**:
   ```bash
   ./dev-local.sh
   ```
   This will:
   - Start DynamoDB Local on port 8000
   - Start DynamoDB Admin UI on port 8001
   - Create all required tables
   - Build the SAM application

2. **Start the API server**:
   ```bash
   sam local start-api --port 3000 --env-vars env-local.json
   ```

3. **Test API endpoints**:
   ```bash
   curl http://localhost:3000/menu?restaurantId=test-restaurant
   ```

4. **View DynamoDB tables**:
   Open http://localhost:8001 in your browser

5. **Stop local environment**:
   ```bash
   ./dev-stop.sh
   ```

### Production Deployment

⚠️ **Only after local development and testing is complete**

1. **Deploy to development**:
   ```bash
   ./deploy.sh dev
   ```

2. **Deploy to production**:
   ```bash
   ./deploy.sh prod
   ```

### Local Development Scripts

- `./dev-local.sh` - Start complete local environment
- `./dev-stop.sh` - Stop and cleanup local environment  
- `scripts/create-tables-local.sh` - Create DynamoDB tables locally

## API Reference

### Menu Management
- `GET /menu?restaurantId=<id>` - Get latest menu version
- `POST /menu?restaurantId=<id>&confirm=true` - Create/confirm menu version

### Order Management  
- `POST /order` - Create new order
- `GET /order/{orderId}?restaurantId=<id>` - Get order status
- `DELETE /order/{orderId}?restaurantId=<id>` - Cancel order

### POS Printing
- `POST /pos/print` - Print order to POS
- `GET /pos/print/{jobId}` - Get print job status
- `POST /pos/reprint` - Reprint existing order

### Payment Callbacks
- `POST /payment/callback/naverpay` - NaverPay webhook
- `POST /payment/callback/kakaopay` - KakaoPay webhook

## Configuration

### Environment Variables

Key configuration options in `.env`:

```bash
# Business Rules
AUTO_COMPLETE_MINUTES=30    # Auto-complete orders after N minutes
CART_TTL_MINUTES=10        # Cart expiration time
REFUND_CAP_PERCENT=5       # Max refund % after cooking

# Payment Providers
NAVERPAY_CLIENT_ID=your_client_id
KAKAOPAY_CID=your_cid

# POS Integration
POS_PRINTER_ENDPOINT=http://printer-ip
POS_PRINT_TYPE=kitchen     # receipt|kitchen|both
```

### DynamoDB Tables

The system uses 4 main tables:

1. **bell-menus-{env}**: Menu versions with items
2. **bell-orders-{env}**: Order lifecycle and payment info  
3. **bell-users-{env}**: Owner authentication
4. **bell-pos-jobs-{env}**: Print job tracking

## Payment Integration

### NaverPay Setup
1. Register at NaverPay Partner Center
2. Obtain client ID and secret
3. Configure webhook URLs
4. Set environment variables

### KakaoPay Setup  
1. Register KakaoPay service
2. Get CID and secret key
3. Configure callback URLs
4. Update environment variables

## POS Printer Integration

Supports ESC/POS compatible printers:

```typescript
// Kitchen ticket format
formatKitchenTicket(order) // -> ESC/POS commands
formatOrderReceipt(order)  // -> Customer receipt
```

Configure printer endpoint in environment variables.

## Testing

### 🔧 Interactive API Testing with Swagger UI (Recommended)

Start Swagger UI using Docker:
```bash
docker run --rm -p 8080:8080 \
  -e SWAGGER_JSON=/app/swagger.yaml \
  -v "$PWD/swagger.yaml:/app/swagger.yaml" \
  swaggerapi/swagger-ui
```

Then open: http://localhost:8080

**Features:**
- Interactive API documentation
- Try-it-out functionality for all endpoints
- Built-in request/response validation
- Pre-configured test data generators
- Real-time API testing

### 🗄️ DynamoDB Testing

Test DynamoDB operations directly:
```bash
./test-dynamodb.sh
```

This script will:
- Verify table structures
- Test CRUD operations on all tables
- Test Global Secondary Index queries
- Validate data integrity
- Clean up test data automatically

### 📋 Manual API Testing Examples

**Create a menu:**
```bash
curl -X POST "http://localhost:3000/menu?restaurantId=rest_001&confirm=true" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "id": "burger_001",
        "name": "Classic Burger",
        "price": 12.99,
        "description": "Juicy beef patty with fresh vegetables",
        "category": "burgers",
        "available": true,
        "options": [
          {
            "id": "size",
            "name": "Size",
            "required": true,
            "choices": [
              {"id": "regular", "name": "Regular", "priceModifier": 0},
              {"id": "large", "name": "Large", "priceModifier": 2.00}
            ]
          }
        ]
      }
    ]
  }'
```

**Get menu:**
```bash
curl "http://localhost:3000/menu?restaurantId=rest_001"
```

**Create an order:**
```bash
curl -X POST "http://localhost:3000/order" \
  -H "Content-Type: application/json" \
  -d '{
    "restaurantId": "rest_001",
    "items": [
      {
        "menuItemId": "burger_001",
        "quantity": 1,
        "price": 14.99,
        "selectedOptions": [
          {
            "optionId": "size",
            "choiceId": "large",
            "priceModifier": 2.00
          }
        ]
      }
    ],
    "customerInfo": {
      "name": "John Doe",
      "phone": "010-1234-5678",
      "email": "john@example.com"
    }
  }'
```

### 🏃 Complete Testing Workflow

1. **Start development environment:**
   ```bash
   ./dev-local.sh
   ```

2. **Start API server:**
   ```bash
   sam local start-api --port 3000 --env-vars env-local.json
   ```

3. **Test with Swagger UI:**
   ```bash
   docker run --rm -p 8080:8080 \
     -e SWAGGER_JSON=/app/swagger.yaml \
     -v "$PWD/swagger.yaml:/app/swagger.yaml" \
     swaggerapi/swagger-ui
   ```
   Open: http://localhost:8080

4. **Test DynamoDB:**
   ```bash
   ./test-dynamodb.sh
   ```

5. **Access DynamoDB Admin:**
   Visit: http://localhost:8001

### Unit Tests
```bash
# Run unit tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

### Available Test URLs
- **API Server**: http://localhost:3000
- **Swagger UI**: http://localhost:8080
- **DynamoDB Admin**: http://localhost:8001
- **DynamoDB Local**: http://localhost:8000

## Monitoring

- CloudWatch logs for all Lambda functions
- X-Ray tracing enabled
- Custom metrics for orders/payments
- Error alerting via SNS

## Security

- All requests validated with Joi schemas
- Payment signatures verified
- JWT/Cognito authentication for owners
- CORS properly configured
- Secrets managed via AWS Systems Manager

## Contributing

1. Follow TypeScript strict mode
2. Add tests for new features
3. Update API documentation
4. Follow existing code patterns
5. Test locally before deployment

## License

MIT License - see LICENSE file for details.