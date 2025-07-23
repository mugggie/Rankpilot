# RankPilot Production Deployment Guide

## 🚀 Quick Start

### 1. Prerequisites
- Docker and Docker Compose installed
- Domain name (e.g., rankpilot.com)
- SSL certificate
- Stripe account for billing
- PostgreSQL database (or use Docker)
- Redis instance (or use Docker)

### 2. Environment Variables
Create a `.env` file in the root directory:

```bash
# Database
DATABASE_URL="postgresql://username:password@host:5432/rankpilot"

# JWT Secret (generate with: openssl rand -base64 32)
JWT_SECRET="your-super-secret-jwt-key-here"

# Stripe Configuration
STRIPE_SECRET_KEY="sk_live_your_stripe_secret_key_here"
STRIPE_WEBHOOK_SECRET="whsec_your_stripe_webhook_secret_here"

# Redis Configuration
REDIS_URL="redis://host:6379"
REDIS_HOST="host"
REDIS_PORT="6379"

# NextAuth Configuration
NEXTAUTH_URL="https://rankpilot.com"
NEXTAUTH_SECRET="your-nextauth-secret-here"

# Google OAuth (optional)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Server Configuration
NODE_ENV="production"
PORT="4001"
```

### 3. SSL Certificate Setup
```bash
# Create SSL directory
mkdir -p ssl

# Generate self-signed certificate for testing
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ssl/rankpilot.key \
  -out ssl/rankpilot.crt \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=rankpilot.com"
```

### 4. Database Setup
```bash
# Run migrations
cd packages/prisma
npx prisma migrate deploy

# Seed initial data
npx prisma db seed
```

### 5. Deploy with Docker Compose
```bash
# Development
docker-compose up -d

# Production
docker-compose --profile production up -d
```

## 🔧 Advanced Configuration

### Nginx Configuration
The `nginx.conf` file includes:
- SSL/TLS termination
- Rate limiting
- Gzip compression
- Security headers
- Load balancing
- Static asset caching

### Monitoring Setup
```bash
# Install monitoring tools
docker run -d \
  --name prometheus \
  -p 9090:9090 \
  prom/prometheus

docker run -d \
  --name grafana \
  -p 3001:3000 \
  grafana/grafana
```

### Backup Strategy
```bash
# Database backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump $DATABASE_URL > backup_$DATE.sql
gzip backup_$DATE.sql
```

## 🚀 Deployment Options

### Option 1: Docker Compose (Recommended)
```bash
# Start all services
docker-compose --profile production up -d

# View logs
docker-compose logs -f

# Scale services
docker-compose up -d --scale api=3
```

### Option 2: Kubernetes
```bash
# Apply Kubernetes manifests
kubectl apply -f k8s/

# Check deployment status
kubectl get pods
kubectl get services
```

### Option 3: Cloud Platforms

#### AWS ECS
```bash
# Deploy to ECS
aws ecs create-cluster --cluster-name rankpilot
aws ecs register-task-definition --cli-input-json file://task-definition.json
aws ecs create-service --cluster rankpilot --service-name rankpilot-service --task-definition rankpilot
```

#### Google Cloud Run
```bash
# Deploy to Cloud Run
gcloud run deploy rankpilot-api --source .
gcloud run deploy rankpilot-web --source .
```

#### DigitalOcean App Platform
```bash
# Deploy to DigitalOcean
doctl apps create --spec app.yaml
```

## 🔒 Security Checklist

- [ ] SSL certificate installed and configured
- [ ] Environment variables secured
- [ ] Database credentials rotated
- [ ] API rate limiting enabled
- [ ] Security headers configured
- [ ] Regular backups scheduled
- [ ] Monitoring and alerting set up
- [ ] Access logs enabled
- [ ] Firewall rules configured
- [ ] DDoS protection enabled

## 📊 Performance Optimization

### Database Optimization
```sql
-- Create indexes for better performance
CREATE INDEX idx_audit_user_id ON audit(user_id);
CREATE INDEX idx_usage_log_user_id ON usage_log(user_id);
CREATE INDEX idx_audit_created_at ON audit(created_at);
```

### Caching Strategy
```bash
# Redis caching configuration
redis-cli CONFIG SET maxmemory 256mb
redis-cli CONFIG SET maxmemory-policy allkeys-lru
```

### CDN Setup
```bash
# Configure Cloudflare or similar CDN
# Add DNS records pointing to your server
# Enable caching for static assets
```

## 🚨 Troubleshooting

### Common Issues

1. **Database Connection Failed**
   ```bash
   # Check database status
   docker-compose logs postgres
   
   # Test connection
   psql $DATABASE_URL -c "SELECT 1;"
   ```

2. **Redis Connection Failed**
   ```bash
   # Check Redis status
   docker-compose logs redis
   
   # Test connection
   redis-cli ping
   ```

3. **SSL Certificate Issues**
   ```bash
   # Check certificate validity
   openssl x509 -in ssl/rankpilot.crt -text -noout
   
   # Test SSL connection
   curl -I https://rankpilot.com
   ```

4. **Queue Processing Issues**
   ```bash
   # Check queue status
   docker-compose logs api | grep "audit"
   
   # Restart queue worker
   docker-compose restart api
   ```

### Health Checks
```bash
# API health check
curl https://rankpilot.com/health

# Database health check
curl https://rankpilot.com/api/health

# Queue health check
docker-compose exec api redis-cli ping
```

## 📈 Scaling Considerations

### Horizontal Scaling
```bash
# Scale API instances
docker-compose up -d --scale api=3

# Load balancer configuration
# Update nginx.conf upstream blocks
```

### Database Scaling
```bash
# Read replicas
# Configure Prisma with read replicas
# Update DATABASE_URL for read/write separation
```

### Monitoring and Alerting
```bash
# Set up monitoring
docker run -d --name prometheus prom/prometheus
docker run -d --name grafana grafana/grafana

# Configure alerts for:
# - High CPU/memory usage
# - Database connection issues
# - Queue processing delays
# - SSL certificate expiration
```

## 🎯 Go-Live Checklist

- [ ] Domain DNS configured
- [ ] SSL certificate installed
- [ ] Environment variables set
- [ ] Database migrated and seeded
- [ ] Stripe webhooks configured
- [ ] Monitoring enabled
- [ ] Backups scheduled
- [ ] Security audit completed
- [ ] Performance testing done
- [ ] Documentation updated
- [ ] Team access configured
- [ ] Support channels ready

## 🚀 Launch Commands

```bash
# Final deployment
docker-compose --profile production up -d

# Verify deployment
curl -I https://rankpilot.com
curl -I https://rankpilot.com/health

# Monitor logs
docker-compose logs -f

# Your RankPilot platform is now live! 🎉
```

---

**🎯 Your RankPilot platform is now production-ready with Docker, CI/CD, monitoring, and security best practices!** 