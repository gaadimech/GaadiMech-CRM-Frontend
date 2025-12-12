# GaadiMech CRM - Frontend

Next.js frontend application for the GaadiMech CRM, configured for Railway deployment.

## Local Development Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   Create a `.env.local` file in this directory (see `.env.example` for reference):
   ```
   NEXT_PUBLIC_API_BASE_URL=http://localhost:5000
   ```

3. **Run development server:**
   ```bash
   npm run dev
   ```
   The application will start on `http://localhost:3000`

4. **Build for production:**
   ```bash
   npm run build
   ```
   This builds the Next.js app for production.

## Railway Deployment

### Quick Start

For a quick deployment guide, see **[DEPLOYMENT_QUICK_START.md](./DEPLOYMENT_QUICK_START.md)**

### Complete Deployment Guide

For detailed step-by-step instructions including custom domain setup (`crm.gaadimech.com`), see **[RAILWAY_DEPLOYMENT.md](./RAILWAY_DEPLOYMENT.md)**

### Prerequisites

- Railway account (sign up at https://railway.app)
- GitHub account (for connecting repository)
- AWS backend deployed and accessible
- GoDaddy account (for custom domain setup)

### Quick Deployment Steps

1. **Push code to GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/yourusername/GaadiMech-CRM-Frontend.git
   git push -u origin main
   ```

2. **Deploy to Railway:**
   - Go to https://railway.app → New Project → Deploy from GitHub
   - Select your repository
   - Railway will auto-detect Next.js and build

3. **Set Environment Variable:**
   - Railway → Variables → Add:
     ```
     NEXT_PUBLIC_API_BASE_URL=https://your-aws-backend.elasticbeanstalk.com
     ```

4. **Add Custom Domain:**
   - Railway → Settings → Domains → Add `crm.gaadimech.com`
   - Configure DNS in GoDaddy (see full guide)

5. **Update Backend CORS:**
   - AWS EB → Configuration → Software → Set:
     ```
     EB_ORIGIN=https://crm.gaadimech.com,http://crm.gaadimech.com
   ```

### Configuration Files

- `railway.json`: Railway build and deploy configuration
- `railway.toml`: Alternative Railway configuration (TOML format)
- `next.config.ts`: Next.js configuration (server mode for Railway)
- `.env.example`: Environment variable template

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_BASE_URL` | Backend API URL (AWS Elastic Beanstalk) | `https://your-app.elasticbeanstalk.com` |

**Important:** 
- For Railway deployment, set `NEXT_PUBLIC_API_BASE_URL` to your AWS backend URL
- The frontend will make API calls to this URL
- Ensure CORS is configured on the backend to allow requests from your Railway/custom domain

### API Configuration

The frontend is configured to call the backend API at:
- **Local development:** `http://localhost:5000` (from `.env.local`)
- **Railway production:** Your AWS Elastic Beanstalk URL (from Railway environment variables)

### Connecting Frontend and Backend

1. **Backend CORS Configuration:**
   - In AWS Elastic Beanstalk, set the `EB_ORIGIN` environment variable to include:
     - Your Railway default domain: `https://your-app.up.railway.app`
     - Your custom domain: `https://crm.gaadimech.com,http://crm.gaadimech.com`

2. **Frontend API Configuration:**
   - In Railway, set `NEXT_PUBLIC_API_BASE_URL` to your AWS backend URL
   - Example: `NEXT_PUBLIC_API_BASE_URL=https://your-backend.elasticbeanstalk.com`

3. **Verify Connection:**
   - Test both HTTP and HTTPS: `http://crm.gaadimech.com` and `https://crm.gaadimech.com`
   - Check browser console for CORS errors
   - Verify cookies/sessions work correctly

### Monitoring

- Railway provides built-in monitoring and logs
- Access logs via Railway dashboard or CLI: `railway logs`
- Set up alerts for deployment failures
