# AgroMitra Installation Guide

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (v4.4 or higher) or MongoDB Atlas
- npm or yarn package manager

### Step 1: Clone Repository
```bash
git clone <repository-url>
cd AgroMitra
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Configure Environment
```bash
# Copy example environment file
cp .env.example .env

# Edit the .env file with your configuration
nano .env  # or use your preferred editor
```

### Step 4: Set Up Database

#### Option A: Local MongoDB
```bash
# Start MongoDB service
mongod

# In another terminal, seed the database
npm run seed
```

#### Option B: MongoDB Atlas (Recommended)
1. Create a free account at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a new cluster
3. Get your connection string
4. Update `MONGODB_URI` in `.env` file
5. Seed the database:
```bash
npm run seed
```

### Step 5: Start Application

#### Development Mode
```bash
npm run dev
```

#### Production Mode
```bash
npm start
```

### Step 6: Access Application
Open your browser and navigate to `http://localhost:3000`

## 🔧 Configuration

### Required Environment Variables
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - Secret key for JWT tokens

### Optional Environment Variables
- `OPENAI_API_KEY` - For GPT integration
- `TWILIO_ACCOUNT_SID` - For SMS notifications
- `TWILIO_AUTH_TOKEN` - For SMS notifications
- `TWILIO_PHONE_NUMBER` - For SMS notifications
- `EMAIL_USER` - For email notifications
- `EMAIL_PASS` - For email notifications
- `WEATHER_API_KEY` - For weather integration

### Environment File Example
```env
# Database
MONGODB_URI=mongodb://localhost:27017/agromitra

# JWT
JWT_SECRET=your_jwt_secret_key_here

# OpenAI (Optional)
OPENAI_API_KEY=your_openai_api_key_here

# Application
NODE_ENV=development
PORT=3000
```

## 🐛 Troubleshooting

### Common Issues

#### 1. MongoDB Connection Error
```
Error: connect ECONNREFUSED 127.0.0.1:27017
```
**Solution**: Make sure MongoDB is running
```bash
# Start MongoDB
mongod

# Or check if it's running
brew services start mongodb-community  # macOS
sudo systemctl start mongod           # Linux
```

#### 2. Port Already in Use
```
Error: listen EADDRINUSE :::3000
```
**Solution**: Change the port in `.env` file
```env
PORT=3001
```

#### 3. Module Not Found
```
Error: Cannot find module 'express'
```
**Solution**: Install dependencies
```bash
npm install
```

#### 4. Permission Denied
```
Error: EACCES: permission denied
```
**Solution**: Fix npm permissions
```bash
sudo chown -R $(whoami) ~/.npm
```

### Database Issues

#### Reset Database
```bash
# Drop and recreate database
mongo agromitra --eval "db.dropDatabase()"
npm run seed
```

#### Check Database Connection
```bash
# Test MongoDB connection
mongo mongodb://localhost:27017/agromitra
```

## 📊 Verification

### Check Installation
1. **Server Status**: Visit `http://localhost:3000/api/health`
2. **Database**: Check if sample data is loaded
3. **API**: Test endpoints with Postman or curl

### Test API Endpoints
```bash
# Health check
curl http://localhost:3000/api/health

# Get crops
curl http://localhost:3000/api/crops

# Test training data
curl http://localhost:3000/api/training/stats
```

## 🚀 Production Deployment

### Using PM2
```bash
# Install PM2 globally
npm install -g pm2

# Start application
pm2 start server.js --name agromitra

# Save PM2 configuration
pm2 save
pm2 startup
```

### Using Nginx (Optional)
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 📝 Next Steps

1. **Configure APIs**: Add your API keys to `.env`
2. **Customize**: Modify crop data and translations
3. **Train Models**: Add custom training data
4. **Deploy**: Set up production environment
5. **Monitor**: Use PM2 or similar for process management

## 🆘 Support

If you encounter any issues:
1. Check the troubleshooting section above
2. Review the logs: `npm run dev` shows detailed logs
3. Check MongoDB connection and status
4. Verify all environment variables are set correctly

For additional help, refer to the main README.md file.
