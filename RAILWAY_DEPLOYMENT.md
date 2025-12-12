# Railway Deployment Guide for GaadiMech CRM Frontend

Complete step-by-step guide to deploy the frontend on Railway and connect it to AWS backend with custom domain `crm.gaadimech.com`.

## Prerequisites

- ✅ Railway account (sign up at https://railway.app)
- ✅ GitHub account
- ✅ AWS backend deployed and accessible (Elastic Beanstalk)
- ✅ GoDaddy account with domain `gaadimech.com`
- ✅ AWS backend URL (e.g., `http://your-app.elasticbeanstalk.com`)

## Step 1: Prepare the Repository

### 1.1 Initialize Git Repository (if not already done)

```bash
cd GaadiMech-CRM-Frontend

# Check if git is already initialized
git status

# If not initialized, run:
git init
git add .
git commit -m "Initial commit - Railway deployment ready"
git branch -M main
```

### 1.2 Create GitHub Repository

1. Go to https://github.com/new
2. Create a new repository named `GaadiMech-CRM-Frontend`
3. **DO NOT** initialize with README, .gitignore, or license
4. Copy the repository URL

### 1.3 Push to GitHub

```bash
# Add remote (replace with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/GaadiMech-CRM-Frontend.git

# Push to GitHub
git push -u origin main
```

## Step 2: Deploy to Railway

### 2.1 Create Railway Project

1. Go to https://railway.app
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Authorize Railway to access your GitHub account (if first time)
5. Select the `GaadiMech-CRM-Frontend` repository
6. Railway will automatically detect Next.js and start building

### 2.2 Configure Environment Variables

1. In Railway dashboard, go to your project
2. Click on the service (your frontend service)
3. Go to **"Variables"** tab
4. Add the following environment variable:

```
NEXT_PUBLIC_API_BASE_URL=https://your-aws-backend.elasticbeanstalk.com
```

**Important:** 
- Replace `your-aws-backend.elasticbeanstalk.com` with your actual AWS Elastic Beanstalk URL
- Use `https://` if your backend supports HTTPS, otherwise use `http://`
- Get your backend URL from AWS Elastic Beanstalk console or by running `eb status` in your backend directory

### 2.3 Wait for Deployment

- Railway will automatically:
  - Install dependencies (`npm install`)
  - Build the Next.js app (`npm run build`)
  - Start the server (`npm start`)
- Wait for the build to complete (usually 2-5 minutes)
- Check the **"Deployments"** tab for build logs

### 2.4 Get Railway URL

1. After successful deployment, go to **"Settings"** → **"Networking"**
2. Railway will provide a default URL like: `https://your-app.up.railway.app`
3. **Note this URL** - you'll need it for backend CORS configuration

## Step 3: Configure Custom Domain (crm.gaadimech.com)

### 3.1 Add Custom Domain in Railway

1. In Railway dashboard, go to your service
2. Click on **"Settings"** tab
3. Scroll down to **"Domains"** section
4. Click **"Add Domain"** or **"Custom Domain"**
5. Enter: `crm.gaadimech.com`
6. Railway will provide DNS configuration instructions

### 3.2 Configure DNS in GoDaddy

1. Log in to your GoDaddy account
2. Go to **"My Products"** → **"DNS"** (or **"Domains"** → **"DNS"**)
3. Find your domain `gaadimech.com`
4. Click **"Manage DNS"** or **"DNS Management"**

#### Option A: CNAME Record (Recommended)

1. Click **"Add"** to create a new record
2. Select **"CNAME"** as the record type
3. Configure:
   - **Name/Host:** `crm`
   - **Value/Points to:** `your-app.up.railway.app` (your Railway default domain)
   - **TTL:** `600` (or default)
4. Click **"Save"**

#### Option B: A Record (If CNAME doesn't work)

1. Railway will provide an IP address in the domain settings
2. Click **"Add"** to create a new record
3. Select **"A"** as the record type
4. Configure:
   - **Name/Host:** `crm`
   - **Value/Points to:** [IP address from Railway]
   - **TTL:** `600` (or default)
5. Click **"Save"**

### 3.3 Verify DNS Configuration

1. Wait 5-15 minutes for DNS propagation
2. Check DNS propagation using:
   - https://www.whatsmydns.net/#CNAME/crm.gaadimech.com
   - Or run: `nslookup crm.gaadimech.com` in terminal
3. Railway will automatically provision SSL certificate (HTTPS)
4. Check Railway dashboard - domain status should show "Active" with SSL enabled

## Step 4: Connect Frontend to AWS Backend

### 4.1 Update Backend CORS Configuration

Your AWS backend needs to allow requests from your Railway frontend domain.

#### Option A: Using AWS Console

1. Go to AWS Elastic Beanstalk Console
2. Select your environment
3. Go to **"Configuration"** → **"Software"** → **"Edit"**
4. Find or add environment property:
   - **Name:** `EB_ORIGIN`
   - **Value:** `https://crm.gaadimech.com,http://crm.gaadimech.com,https://your-app.up.railway.app`
5. Click **"Apply"** and wait for environment update (5-10 minutes)

#### Option B: Using AWS CLI

```bash
cd GaadiMech-CRM-Backend

# Update CORS origin to include both custom domain and Railway domain
eb setenv EB_ORIGIN="https://crm.gaadimech.com,http://crm.gaadimech.com,https://your-app.up.railway.app"
```

**Important:** Include both HTTP and HTTPS versions, plus the Railway default domain for testing.

### 4.2 Verify Backend CORS Configuration

Check your backend `application.py` to ensure CORS is configured correctly:

```python
# Should allow origins from EB_ORIGIN environment variable
CORS(app, origins=os.getenv('EB_ORIGIN', '').split(','), supports_credentials=True)
```

## Step 5: Update Frontend Environment Variables

### 5.1 Update Railway Environment Variables

1. In Railway dashboard, go to your service → **"Variables"**
2. Update `NEXT_PUBLIC_API_BASE_URL` if needed:
   - If your backend uses HTTPS: `https://your-backend.elasticbeanstalk.com`
   - If your backend uses HTTP: `http://your-backend.elasticbeanstalk.com`
3. Railway will automatically redeploy when variables change

### 5.2 Verify Environment Variables

After deployment, verify the environment variable is set:
1. Go to Railway dashboard → **"Deployments"**
2. Check build logs to confirm `NEXT_PUBLIC_API_BASE_URL` is being used

## Step 6: Test Deployment

### 6.1 Test HTTP Access

1. Open browser and go to: `http://crm.gaadimech.com`
2. You should see the login page
3. Check browser console (F12) for any errors
4. Try logging in with test credentials

### 6.2 Test HTTPS Access

1. Open browser and go to: `https://crm.gaadimech.com`
2. You should see the login page with SSL certificate (lock icon)
3. Check browser console (F12) for any errors
4. Verify API calls are working:
   - Open Network tab in browser DevTools
   - Try logging in
   - Check if API requests are successful

### 6.3 Test API Connection

1. Log in to the application
2. Navigate through different pages (Dashboard, Followups, etc.)
3. Verify data is loading from AWS backend
4. Check for CORS errors in browser console

### 6.4 Test Both Domains

- Railway default domain: `https://your-app.up.railway.app` (should work)
- Custom domain HTTP: `http://crm.gaadimech.com` (should work)
- Custom domain HTTPS: `https://crm.gaadimech.com` (should work with SSL)

## Step 7: Final Configuration

### 7.1 Force HTTPS Redirect (Optional but Recommended)

To ensure all traffic uses HTTPS:

1. In Railway dashboard → **"Settings"** → **"Domains"**
2. Enable **"Force HTTPS"** or **"Redirect HTTP to HTTPS"** if available
3. Alternatively, configure in GoDaddy to redirect HTTP to HTTPS

### 7.2 Update Backend CORS (Final)

Once everything is working, you can update backend CORS to only allow your custom domain:

```bash
eb setenv EB_ORIGIN="https://crm.gaadimech.com,http://crm.gaadimech.com"
```

## Troubleshooting

### Build Failures

**Issue:** Railway build fails
- **Solution:** Check Railway build logs
- Verify `package.json` has all dependencies
- Ensure Node.js version is compatible (Railway auto-detects)

### DNS Not Resolving

**Issue:** `crm.gaadimech.com` doesn't load
- **Solution:** 
  - Wait 15-30 minutes for DNS propagation
  - Verify DNS records in GoDaddy are correct
  - Check Railway domain status shows "Active"
  - Use `nslookup crm.gaadimech.com` to verify DNS

### SSL Certificate Issues

**Issue:** HTTPS shows certificate error
- **Solution:**
  - Wait 5-10 minutes after adding domain (Railway provisions SSL automatically)
  - Verify domain is correctly configured in Railway
  - Check Railway domain status shows SSL as "Active"

### API Connection Errors

**Issue:** Frontend can't connect to backend
- **Solution:**
  - Verify `NEXT_PUBLIC_API_BASE_URL` is set correctly in Railway
  - Check backend CORS includes your frontend domain
  - Verify backend is accessible (test backend URL directly)
  - Check browser console for specific error messages

### CORS Errors

**Issue:** Browser shows CORS errors
- **Solution:**
  - Verify `EB_ORIGIN` in AWS includes your frontend domain
  - Include both HTTP and HTTPS versions
  - Restart backend after updating CORS: `eb deploy`
  - Check backend logs: `eb logs`

### Mixed Content Warnings

**Issue:** HTTPS frontend trying to connect to HTTP backend
- **Solution:**
  - Use HTTPS for backend URL in `NEXT_PUBLIC_API_BASE_URL`
  - Or configure AWS backend to use HTTPS/SSL

## Environment Variables Summary

### Frontend (Railway)

```
NEXT_PUBLIC_API_BASE_URL=https://your-backend.elasticbeanstalk.com
NODE_ENV=production
PORT=3000 (automatically set by Railway)
```

### Backend (AWS Elastic Beanstalk)

```
EB_ORIGIN=https://crm.gaadimech.com,http://crm.gaadimech.com
RDS_HOST=your-rds-endpoint.region.rds.amazonaws.com
RDS_DB=your_database_name
RDS_USER=your_database_user
RDS_PASSWORD=your_secure_password
RDS_PORT=5432
SECRET_KEY=your-super-secret-key
FLASK_ENV=production
```

## Post-Deployment Checklist

- [ ] Repository pushed to GitHub
- [ ] Railway project created and connected
- [ ] Environment variables configured in Railway
- [ ] Initial deployment successful
- [ ] Custom domain added in Railway
- [ ] DNS records configured in GoDaddy
- [ ] DNS propagation verified
- [ ] SSL certificate active (HTTPS working)
- [ ] Backend CORS updated with frontend domain
- [ ] HTTP access working: `http://crm.gaadimech.com`
- [ ] HTTPS access working: `https://crm.gaadimech.com`
- [ ] API calls working from frontend
- [ ] Login functionality working
- [ ] All pages loading correctly
- [ ] No console errors in browser

## Maintenance

### Updating Frontend

1. Make changes to code
2. Commit and push to GitHub:
   ```bash
   git add .
   git commit -m "Your update message"
   git push origin main
   ```
3. Railway will automatically detect changes and redeploy
4. Monitor deployment in Railway dashboard

### Monitoring

- **Railway Dashboard:** View logs, metrics, and deployment status
- **Railway CLI:** `railway logs` for real-time logs
- **Browser DevTools:** Check for frontend errors
- **AWS CloudWatch:** Monitor backend logs

## Support Resources

- Railway Documentation: https://docs.railway.app
- Next.js Deployment: https://nextjs.org/docs/deployment
- GoDaddy DNS Help: https://www.godaddy.com/help
- AWS Elastic Beanstalk: https://docs.aws.amazon.com/elasticbeanstalk

## Quick Reference Commands

```bash
# Check Railway deployment status
railway status

# View Railway logs
railway logs

# Update Railway environment variable
railway variables set NEXT_PUBLIC_API_BASE_URL=https://your-backend.elasticbeanstalk.com

# Check DNS propagation
nslookup crm.gaadimech.com
dig crm.gaadimech.com

# Test backend connectivity
curl https://your-backend.elasticbeanstalk.com/api/health
```

---

**Deployment Complete!** 🎉

Your frontend should now be accessible at:
- **HTTPS:** https://crm.gaadimech.com
- **HTTP:** http://crm.gaadimech.com
- **Railway Default:** https://your-app.up.railway.app

