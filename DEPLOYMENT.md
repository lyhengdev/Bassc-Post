# Bassac CMS - Production Deployment Guide

## 🚀 Pre-Deployment Checklist

### ⚠️ CRITICAL - Security Configuration

1. **JWT Secrets** - MUST BE CHANGED!
   ```bash
   # Generate secure random strings (32+ characters)
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
   - Update `JWT_SECRET` in .env
   - Update `JWT_REFRESH_SECRET` in .env

2. **Database Configuration**
   - Set production MongoDB connection string
   - Consider MongoDB Atlas for cloud hosting
   - Enable authentication on MongoDB
   - Set up regular backups

3. **Redis Configuration** (Highly Recommended)
   - Required for caching with large datasets (1M+ articles)
   - Use Redis Cloud, Upstash, or self-hosted Redis
   - Update `REDIS_URL` in .env

4. **Email Configuration**
   - Set up SMTP credentials (Gmail, SendGrid, etc.)
   - For Gmail: Use App-Specific Passwords
   - Update all SMTP_* variables in .env

5. **File Storage**
   - **Production**: Use Cloudinary or AWS S3
   - **Not recommended**: Local storage for production
   - Configure CLOUDINARY_* or AWS_* variables

6. **OpenAI API** (Optional)
   - Only if using AI features
   - Get API key from platform.openai.com

---

## 📋 Deployment Steps

### 1. Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install MongoDB (if self-hosting)
# Or use MongoDB Atlas

# Install Redis (optional but recommended)
sudo apt install -y redis-server
sudo systemctl enable redis-server
sudo systemctl start redis-server

# Install Nginx (for reverse proxy)
sudo apt install -y nginx

# Install PM2 (process manager)
sudo npm install -g pm2
```

### 2. Project Setup

```bash
# Clone or upload the project
cd /var/www
git clone <your-repo> bassac-cms
# OR
scp -r bassac-cms-production user@server:/var/www/bassac-cms

cd /var/www/bassac-cms

# Setup Backend
cd backend
npm install --production
cp .env.example .env
nano .env  # Edit with production values

# Setup Frontend
cd ../frontend
npm install
cp .env.example .env
# If frontend and API are on different domains, set absolute API URL:
# VITE_API_URL=https://api.bassac.media/api
# VITE_SOCKET_URL=https://api.bassac.media
npm run build

# Set proper permissions
sudo chown -R www-data:www-data /var/www/bassac-cms
sudo chmod -R 755 /var/www/bassac-cms
```

### 3. Environment Configuration

Create `/var/www/bassac-cms/backend/.env` with production values:

```env
NODE_ENV=production
PORT=8888

# MongoDB
MONGODB_URI=mongodb://user:pass@localhost:27017/bassac_media_center

# JWT - GENERATE NEW SECRETS!
JWT_SECRET=<32+ character random string>
JWT_REFRESH_SECRET=<different 32+ character random string>

# Redis
REDIS_URL=redis://localhost:6379

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=your-email@gmail.com

# Storage (Choose one)
STORAGE_PROVIDER=cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# URLs
SITE_URL=https://bassac.media
FRONTEND_URL=https://bassac.media
API_BASE_URL=https://api.bassac.media

# Logging
LOG_LEVEL=WARN
LOG_TO_FILE=true
```

Create `/var/www/bassac-cms/frontend/.env`:

```env
# Same-domain setup (recommended when proxying /api from same host):
VITE_API_URL=/api

# OR split-domain setup:
# VITE_API_URL=https://api.bassac.media/api
# VITE_SOCKET_URL=https://api.bassac.media
```

### 4. Start Backend with PM2

```bash
cd /var/www/bassac-cms/backend

# Start the application
pm2 start src/server.js --name bassac-api

# Configure PM2 to start on boot
pm2 startup
pm2 save

# Monitor logs
pm2 logs bassac-api
```

### 5. Nginx Configuration

Create `/etc/nginx/sites-available/bassac-cms`:

```nginx
# API Server
server {
    listen 80;
    server_name api.bassac.media;

    # Increase upload size
    client_max_body_size 10M;

    location / {
        proxy_pass http://localhost:8888;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

# Frontend
server {
    listen 80;
    server_name bassac.media www.bassac.media;

    root /var/www/bassac-cms/frontend/dist;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_types text/plain text/css text/xml text/javascript 
               application/x-javascript application/xml+rss 
               application/json application/javascript;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/bassac-cms /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 6. SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificates
sudo certbot --nginx -d bassac.media -d www.bassac.media
sudo certbot --nginx -d api.bassac.media

# Auto-renewal is configured automatically
```

### 7. Database Setup

```bash
# If using MongoDB locally, create user
mongo
> use bassac_media_center
> db.createUser({
    user: "bassac_admin",
    pwd: "<strong-password>",
    roles: ["readWrite"]
  })
> exit

# Run initial setup (create admin user)
# Visit: https://bassac.media/register (first user becomes admin)
```

### 8. Firewall Setup

```bash
# Allow HTTP, HTTPS, SSH
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH
sudo ufw enable
```

---

## 🔧 Post-Deployment Configuration

### Monitor Application
```bash
pm2 status
pm2 logs bassac-api
pm2 monit
```

### Restart Application
```bash
pm2 restart bassac-api
```

### Update Application
```bash
cd /var/www/bassac-cms
git pull  # or upload new files
cd backend && npm install --production
cd ../frontend && npm install && npm run build
pm2 restart bassac-api
sudo systemctl reload nginx
```

### Database Backup
```bash
# Create backup script
#!/bin/bash
mongodump --uri="mongodb://user:pass@localhost/bassac_media_center" \
  --out="/backups/mongodb/$(date +%Y%m%d)"

# Add to crontab for daily backups
crontab -e
# Add: 0 2 * * * /path/to/backup-script.sh
```

---

## ⚠️ Important Notes

### Console Logs
- **321 console.log** statements in backend
- **44 console.log** statements in frontend
- **Recommendation**: Remove or wrap in `if (process.env.NODE_ENV !== 'production')` blocks
- Use proper logging library (Winston, Pino) for production

### Rate Limiting
- Default: 100 requests per 15 minutes
- Adjust `RATE_LIMIT_MAX` and `RATE_LIMIT_WINDOW_MS` based on traffic

### File Uploads
- Local uploads: Limited to server disk space
- **Recommended**: Use Cloudinary (easier) or AWS S3 (more control)
- Cloudinary free tier: 25GB storage, 25GB bandwidth/month

### Monitoring
Consider adding:
- **PM2 Plus** for advanced monitoring
- **Sentry** for error tracking
- **LogRocket** for user session replay
- **Google Analytics** for traffic analysis

### Performance
- Enable Redis caching for production
- Consider CDN for static assets (Cloudflare)
- Optimize images before upload
- Monitor MongoDB indexes

---

## 🆘 Troubleshooting

### Application won't start
```bash
pm2 logs bassac-api --lines 100
# Check for missing environment variables
# Verify MongoDB/Redis connections
```

### High memory usage
```bash
pm2 restart bassac-api
# Consider adding Redis if not using it
# Check for memory leaks in logs
```

### Database connection errors
```bash
# Check MongoDB status
sudo systemctl status mongod
# Verify connection string in .env
# Check firewall rules
```

### File upload errors
```bash
# Check permissions
sudo chown -R www-data:www-data /var/www/bassac-cms/backend/uploads
sudo chmod -R 755 /var/www/bassac-cms/backend/uploads
```

---

## 📞 Support

For issues or questions:
1. Check logs: `pm2 logs bassac-api`
2. Review Nginx logs: `sudo tail -f /var/log/nginx/error.log`
3. Check MongoDB logs: `sudo tail -f /var/log/mongodb/mongod.log`

---

## ✅ Production Checklist

- [ ] Changed JWT secrets to secure random strings
- [ ] Configured production MongoDB connection
- [ ] Set up Redis caching
- [ ] Configured email SMTP settings
- [ ] Set up Cloudinary or S3 for file storage
- [ ] Updated SITE_URL, FRONTEND_URL, API_BASE_URL
- [ ] Installed SSL certificates (HTTPS)
- [ ] Configured firewall (UFW)
- [ ] Set up PM2 for process management
- [ ] Configured Nginx reverse proxy
- [ ] Created admin user account
- [ ] Set up database backups
- [ ] Tested file uploads
- [ ] Tested email sending
- [ ] Reviewed and removed console.logs (optional)
- [ ] Set up monitoring/logging
- [ ] Configured DNS records
- [ ] Tested all critical features

---

Good luck with your deployment! 🚀
