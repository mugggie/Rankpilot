#!/bin/bash

# 🚀 RankPilot Production Deployment Script
# This script helps you deploy your RankPilot platform to production

set -e

echo "🚀 Starting RankPilot Production Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
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

# Check if required tools are installed
check_dependencies() {
    print_status "Checking dependencies..."
    
    if ! command -v git &> /dev/null; then
        print_error "Git is not installed. Please install Git first."
        exit 1
    fi
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js first."
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install npm first."
        exit 1
    fi
    
    print_success "All dependencies are installed!"
}

# Build the application
build_app() {
    print_status "Building the application..."
    
    # Install dependencies
    npm install
    
    # Build API
    print_status "Building API..."
    cd apps/api
    npm run build
    cd ../..
    
    # Build Web
    print_status "Building Web..."
    cd apps/web
    npm run build
    cd ../..
    
    print_success "Application built successfully!"
}

# Generate environment variables template
generate_env_template() {
    print_status "Generating environment variables template..."
    
    cat > .env.production.template << EOF
# Database
DATABASE_URL="postgresql://username:password@host:port/database"

# NextAuth.js
NEXTAUTH_URL="https://your-domain.vercel.app"
NEXTAUTH_SECRET="your-nextauth-secret-key"

# Stripe
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_PUBLISHABLE_KEY="pk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# API Configuration
API_BASE_URL="https://your-api-domain.railway.app"
NODE_ENV="production"
PORT="4001"

# Redis (optional)
REDIS_URL="redis://username:password@host:port"

# Email (optional)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
EOF
    
    print_success "Environment template created: .env.production.template"
    print_warning "Please update the values in .env.production.template with your actual production values"
}

# Run database migrations
run_migrations() {
    print_status "Running database migrations..."
    
    cd packages/prisma
    
    # Generate Prisma client
    npx prisma generate
    
    # Run migrations
    npx prisma migrate deploy
    
    # Seed database (optional)
    read -p "Do you want to seed the database with initial data? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        npx prisma db seed
    fi
    
    cd ../..
    
    print_success "Database migrations completed!"
}

# Deploy to Railway (API)
deploy_railway() {
    print_status "Deploying API to Railway..."
    
    if ! command -v railway &> /dev/null; then
        print_warning "Railway CLI is not installed. Please install it first:"
        echo "npm install -g @railway/cli"
        echo "Then run: railway login"
        return 1
    fi
    
    # Login to Railway
    railway login
    
    # Deploy
    railway up
    
    print_success "API deployed to Railway!"
}

# Deploy to Vercel (Frontend)
deploy_vercel() {
    print_status "Deploying frontend to Vercel..."
    
    if ! command -v vercel &> /dev/null; then
        print_warning "Vercel CLI is not installed. Please install it first:"
        echo "npm install -g vercel"
        echo "Then run: vercel login"
        return 1
    fi
    
    # Login to Vercel
    vercel login
    
    # Deploy
    vercel --prod
    
    print_success "Frontend deployed to Vercel!"
}

# Health check
health_check() {
    print_status "Running health checks..."
    
    # Get the deployed URLs (you'll need to update these)
    API_URL=${API_URL:-"https://your-api.railway.app"}
    WEB_URL=${WEB_URL:-"https://your-app.vercel.app"}
    
    # Check API health
    print_status "Checking API health..."
    if curl -f "$API_URL/health" > /dev/null 2>&1; then
        print_success "API is healthy!"
    else
        print_error "API health check failed!"
    fi
    
    # Check web health
    print_status "Checking web health..."
    if curl -f "$WEB_URL" > /dev/null 2>&1; then
        print_success "Web app is healthy!"
    else
        print_error "Web health check failed!"
    fi
}

# Main deployment function
main() {
    echo "🎯 RankPilot Production Deployment"
    echo "=================================="
    
    # Check dependencies
    check_dependencies
    
    # Build application
    build_app
    
    # Generate environment template
    generate_env_template
    
    # Ask user what they want to do
    echo ""
    echo "What would you like to do?"
    echo "1. Run database migrations"
    echo "2. Deploy to Railway (API)"
    echo "3. Deploy to Vercel (Frontend)"
    echo "4. Run health checks"
    echo "5. All of the above"
    echo "6. Exit"
    
    read -p "Enter your choice (1-6): " choice
    
    case $choice in
        1)
            run_migrations
            ;;
        2)
            deploy_railway
            ;;
        3)
            deploy_vercel
            ;;
        4)
            health_check
            ;;
        5)
            run_migrations
            deploy_railway
            deploy_vercel
            health_check
            ;;
        6)
            print_status "Exiting..."
            exit 0
            ;;
        *)
            print_error "Invalid choice. Please run the script again."
            exit 1
            ;;
    esac
    
    echo ""
    print_success "Deployment process completed!"
    echo ""
    echo "🎉 Next steps:"
    echo "1. Update your environment variables in the deployment platforms"
    echo "2. Configure your custom domain (optional)"
    echo "3. Set up monitoring and analytics"
    echo "4. Test all functionality"
    echo "5. Start marketing your platform!"
}

# Run main function
main "$@" 