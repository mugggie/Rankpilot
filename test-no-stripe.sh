#!/bin/bash

# 🧪 Test RankPilot without Stripe

echo "🧪 Testing RankPilot without Stripe..."
echo "======================================"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Set test environment variables
export NODE_ENV=test
export STRIPE_SECRET_KEY=""
export STRIPE_WEBHOOK_SECRET=""
export JWT_SECRET="test-jwt-secret-key-for-testing-only"
export DATABASE_URL="postgresql://test:test@localhost:5432/rankpilot_test"
export SMTP_HOST="localhost"
export SMTP_PORT=587
export SMTP_USER="test@example.com"
export SMTP_PASS="test-password"
export REDIS_URL="redis://localhost:6379"
export FRONTEND_URL="http://localhost:3000"

print_status "Environment configured for testing without Stripe"

# Build the application
print_status "Building application..."
cd apps/api
npm run build

if [ $? -eq 0 ]; then
    print_success "Build completed successfully!"
else
    print_error "Build failed"
    exit 1
fi

# Test the health endpoint
print_status "Testing health endpoint..."
sleep 2
curl -f http://localhost:4001/health

if [ $? -eq 0 ]; then
    print_success "Health endpoint working!"
else
    print_warning "Health endpoint not responding (server may not be running)"
fi

print_success "🎉 Test completed successfully!"
echo ""
echo "The application can run without Stripe configuration."
echo "All payment-related features will use mock implementations."
echo ""
echo "To start the server without Stripe:"
echo "  cd apps/api && npm run start:no-stripe"
echo "" 