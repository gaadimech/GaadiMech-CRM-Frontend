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
   This creates a static export in the `out/` directory.

## Railway Deployment

### Prerequisites
- Railway account (sign up at https://railway.app)
- GitHub account (for connecting repository)
- AWS backend deployed and accessible

### Deployment Steps

#### Option 1: Deploy via Railway Dashboard (Recommended)

1. **Create a new Git repository:**
   ```bash
   cd GaadiMech-CRM-Frontend
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/yourusername/GaadiMech-CRM-Frontend.git
   git push -u origin main
   ```

2. **Connect to Railway:**
   - Go to https://railway.app
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your `GaadiMech-CRM-Frontend` repository
   - Railway will automatically detect Next.js and configure the build

3. **Configure Environment Variables:**
   - In Railway dashboard, go to your project → Variables
   - Add the following variable:
     ```
     NEXT_PUBLIC_API_BASE_URL=https://your-aws-backend.elasticbeanstalk.com
     ```
   - Replace with your actual AWS Elastic Beanstalk backend URL

4. **Deploy:**
   - Railway will automatically build and deploy
   - The build process will:
     - Install dependencies (`npm install`)
     - Build the Next.js app (`npm run build`)
     - Serve the static files (`npm start`)

5. **Get your Railway URL:**
   - After deployment, Railway will provide a URL like `https://your-app.railway.app`
   - Update your AWS backend's `EB_ORIGIN` environment variable with this URL

#### Option 2: Deploy via Railway CLI

1. **Install Railway CLI:**
   ```bash
   npm i -g @railway/cli
   ```

2. **Login:**
   ```bash
   railway login
   ```

3. **Initialize and deploy:**
   ```bash
   railway init
   railway up
   ```

4. **Set environment variables:**
   ```bash
   railway variables set NEXT_PUBLIC_API_BASE_URL=https://your-aws-backend.elasticbeanstalk.com
   ```

### Configuration Files

- `railway.json`: Railway build and deploy configuration
- `railway.toml`: Alternative Railway configuration (TOML format)
- `next.config.ts`: Next.js configuration (static export mode)
- `.env.example`: Environment variable template

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_BASE_URL` | Backend API URL (AWS Elastic Beanstalk) | `https://your-app.elasticbeanstalk.com` |

**Important:** 
- For Railway deployment, set `NEXT_PUBLIC_API_BASE_URL` to your AWS backend URL
- The frontend will make API calls to this URL
- Ensure CORS is configured on the backend to allow requests from your Railway domain

### API Configuration

The frontend is configured to call the backend API at:
- **Local development:** `http://localhost:5000` (from `.env.local`)
- **Railway production:** Your AWS Elastic Beanstalk URL (from Railway environment variables)

### Connecting Frontend and Backend

1. **Backend CORS Configuration:**
   - In AWS Elastic Beanstalk, set the `EB_ORIGIN` environment variable to your Railway frontend URL
   - Example: `EB_ORIGIN=https://your-app.railway.app`

2. **Frontend API Configuration:**
   - In Railway, set `NEXT_PUBLIC_API_BASE_URL` to your AWS backend URL
   - Example: `NEXT_PUBLIC_API_BASE_URL=https://your-backend.elasticbeanstalk.com`

3. **Verify Connection:**
   - Test API calls from the frontend
   - Check browser console for CORS errors
   - Verify cookies/sessions work correctly

### Troubleshooting

- **Build failures:** Check Railway build logs for errors
- **API connection issues:** Verify `NEXT_PUBLIC_API_BASE_URL` is set correctly
- **CORS errors:** Ensure backend `EB_ORIGIN` includes your Railway domain
- **Static export issues:** Verify `next.config.ts` has `output: 'export'`

### Custom Domain (Optional)

1. In Railway dashboard, go to Settings → Domains
2. Add your custom domain
3. Update DNS records as instructed
4. Update backend `EB_ORIGIN` with your custom domain

### Monitoring

- Railway provides built-in monitoring and logs
- Access logs via Railway dashboard or CLI: `railway logs`
- Set up alerts for deployment failures
