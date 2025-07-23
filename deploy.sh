#!/bin/bash

# RankPilot Production Deployment Script
set -e

echo "🚀 Starting RankPilot deployment..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Please create one based on .env.example"
    exit 1
fi

# Create SSL directory if it doesn't exist
mkdir -p ssl

# Generate self-signed certificate if it doesn't exist
if [ ! -f ssl/rankpilot.crt ]; then
    echo "🔐 Generating SSL certificate..."
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout ssl/rankpilot.key \
        -out ssl/rankpilot.crt \
        -subj "/C=US/ST=State/L=City/O=RankPilot/CN=rankpilot.com"
fi

# Build and start services
echo "🏗️ Building and starting services..."
docker-compose --profile production up -d --build

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 30

# Check service health
echo "🔍 Checking service health..."

# Check API health
if curl -f http://localhost/health > /dev/null 2>&1; then
    echo "✅ API is healthy"
else
    echo "❌ API health check failed"
    docker-compose logs api
    exit 1
fi

# Check database connection
if docker-compose exec -T postgres pg_isready -U postgres > /dev/null 2>&1; then
    echo "✅ Database is healthy"
else
    echo "❌ Database health check failed"
    exit 1
fi

# Check Redis connection
if docker-compose exec -T redis redis-cli ping > /dev/null 2>&1; then
    echo "✅ Redis is healthy"
else
    echo "❌ Redis health check failed"
    exit 1
fi

echo "🎉 RankPilot deployment completed successfully!"
echo ""
echo "📊 Service Status:"
docker-compose ps
echo ""
echo "🌐 Access your application at:"
echo "   - Web App: http://localhost"
echo "   - API: http://localhost/api"
echo "   - Health Check: http://localhost/health"
echo ""
echo "📝 View logs with: docker-compose logs -f"
echo "🛑 Stop services with: docker-compose down" 