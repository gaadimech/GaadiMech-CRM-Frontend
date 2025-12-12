# Troubleshooting: Service Temporarily Unavailable

## Issue Fixed

**Problem:** Next.js server was starting but then receiving SIGTERM and stopping.

**Solution:** Created custom `server.js` to properly handle Railway's PORT environment variable (8080).

**Status:** Fix has been pushed. Railway will auto-deploy.

## What Was Changed

1. **Created `server.js`** - Custom server that explicitly uses Railway's PORT env var
2. **Updated `package.json`** - Changed start command to use `node server.js`
3. **Updated `railway.toml`** - Removed hardcoded PORT (let Railway set it)

## Next Steps

### 1. Wait for Deployment (2-5 minutes)

Railway will automatically:
- Detect the new commit
- Rebuild the application
- Redeploy with the new server.js

### 2. Check Railway Logs

After deployment, check Railway → Deployments → Latest → Logs:
- Should see: `> Ready on http://0.0.0.0:8080`
- Should NOT see: `SIGTERM` or `command failed`

### 3. Verify Environment Variable

In Railway → Variables, ensure:
- `NEXT_PUBLIC_API_BASE_URL` = `http://GaadiMech-CRM-Backend-env.eba-vhhjmtea.ap-south-1.elasticbeanstalk.com`
- (Must include `http://` protocol)

### 4. Test Access

After deployment completes:
- Test: `https://crm.gaadimech.com`
- Should see login page (not "Service Temporarily Unavailable")

## If Still Not Working

### Check Health Check

Railway might be killing the container if health check fails:
1. Railway → Settings → Check healthcheckPath: `/`
2. Verify healthcheckTimeout is reasonable (100ms might be too short)
3. Consider increasing timeout or checking if `/` route works

### Check Application Errors

1. Railway → Deployments → Latest → Logs
2. Look for any error messages
3. Check if Next.js is building correctly
4. Verify all dependencies are installed

### Check Port Configuration

1. Railway → Settings → Networking
2. Verify port is detected correctly (should be 8080)
3. If not, Railway should auto-detect it

### Verify Environment Variables

1. Railway → Variables
2. Ensure all required variables are set:
   - `NEXT_PUBLIC_API_BASE_URL` (with `http://`)
   - `NODE_ENV=production` (auto-set by Railway)

## Expected Logs (After Fix)

```
Starting Container
 ✓ Starting...
   - Local:         http://localhost:8080
> node server.js
   - Network:       http://10.175.218.227:8080
 ▲ Next.js 16.0.8
> Ready on http://0.0.0.0:8080
```

Should NOT see:
- `SIGTERM`
- `command failed`
- `npm error`

## Additional Checks

### DNS Status
- Verify DNS is still pointing correctly: `dig crm.gaadimech.com CNAME`
- Should return: `xs0wrx3w.up.railway.app.`

### SSL Certificate
- Railway → Settings → Domains
- Check if `crm.gaadimech.com` shows SSL as "Active"
- If not, wait 10-30 minutes for SSL provisioning

### Backend Connection
- Verify backend CORS includes: `https://crm.gaadimech.com,http://crm.gaadimech.com`
- Test backend directly: `curl http://GaadiMech-CRM-Backend-env.eba-vhhjmtea.ap-south-1.elasticbeanstalk.com`

## Quick Test Commands

```bash
# Test DNS
dig crm.gaadimech.com CNAME

# Test HTTP (should redirect to HTTPS)
curl -I http://crm.gaadimech.com

# Test HTTPS (after SSL is provisioned)
curl -I https://crm.gaadimech.com

# Test Railway domain directly
curl -I https://xs0wrx3w.up.railway.app
```

## Contact Points

If issues persist:
1. Check Railway status page: https://status.railway.app
2. Review Railway documentation: https://docs.railway.app
3. Check Next.js deployment docs: https://nextjs.org/docs/deployment

