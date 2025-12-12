# Complete Verification Checklist

## ✅ Configuration Verification

### 1. Railway Configuration

**File: `railway.json`**
- ✅ Builder: NIXPACKS
- ✅ Build command: `npm run build`
- ✅ Start command: `npm start`
- ✅ Health check path: `/`
- ✅ Health check timeout: **10000ms (10 seconds)** - FIXED
- ✅ Restart policy: ON_FAILURE

**File: `railway.toml`**
- ✅ Same as railway.json
- ✅ Health check timeout: **10000ms** - FIXED

### 2. Server Configuration

**File: `server.js`**
- ✅ Uses Railway's PORT environment variable
- ✅ Listens on `0.0.0.0` (all interfaces)
- ✅ Handles SIGTERM gracefully
- ✅ Logs ready status

**File: `package.json`**
- ✅ Start script: `node server.js`
- ✅ Node.js version: >=20.9.0
- ✅ All dependencies listed

### 3. Environment Variables (Railway)

**Required Variable:**
- `NEXT_PUBLIC_API_BASE_URL` = `http://GaadiMech-CRM-Backend-env.eba-vhhjmtea.ap-south-1.elasticbeanstalk.com`
  - ✅ Must include `http://` protocol
  - ✅ No trailing slash
  - ✅ Points to correct backend

**Auto-set by Railway:**
- `NODE_ENV` = `production`
- `PORT` = `8080` (or Railway's assigned port)

### 4. Backend Configuration (AWS)

**CORS Configuration:**
- `EB_ORIGIN` = `https://crm.gaadimech.com,http://crm.gaadimech.com`
  - ✅ Includes HTTPS version
  - ✅ Includes HTTP version
  - ✅ Matches custom domain

**Backend URL:**
- `http://GaadiMech-CRM-Backend-env.eba-vhhjmtea.ap-south-1.elasticbeanstalk.com`
  - ✅ Accessible (test with curl)
  - ✅ HTTP only (no HTTPS)

### 5. DNS Configuration (GoDaddy)

**CNAME Record:**
- Name: `crm`
- Value: `xs0wrx3w.up.railway.app.`
  - ✅ Points to Railway (not backend)
  - ✅ Has trailing dot (correct)
  - ✅ DNS propagated globally

**Verification:**
```bash
dig crm.gaadimech.com CNAME
# Should return: xs0wrx3w.up.railway.app.
```

### 6. Custom Domain (Railway)

**Domain:**
- `crm.gaadimech.com`
  - ✅ Added in Railway
  - ✅ DNS configured correctly
  - ⏳ SSL certificate provisioning (10-30 minutes)

## 🔍 What to Check in Railway Dashboard

### Railway → Variables Tab

1. **Check `NEXT_PUBLIC_API_BASE_URL`:**
   - Value should be: `http://GaadiMech-CRM-Backend-env.eba-vhhjmtea.ap-south-1.elasticbeanstalk.com`
   - Must start with `http://`
   - No trailing slash

### Railway → Settings Tab

1. **Check Health Check:**
   - Path: `/`
   - Timeout: Should be 10000ms (10 seconds) after fix
   - If still 100ms, the fix hasn't been applied yet

2. **Check Networking:**
   - Port: Should be detected as 8080
   - Custom domain: `crm.gaadimech.com` should be listed
   - SSL status: Should show "Active" or "Provisioning"

### Railway → Deployments Tab

1. **Check Latest Deployment:**
   - Status: Should be "Active" or "Building"
   - Build logs: Should show successful build
   - Deploy logs: Should show `> Ready on http://0.0.0.0:8080`
   - Should NOT show: `SIGTERM` or `command failed`

### Railway → Logs Tab

1. **Check for Errors:**
   - Look for any error messages
   - Check if server is starting correctly
   - Verify health check responses

## 🧪 Testing Steps

### 1. Test Backend Connection

```bash
curl http://GaadiMech-CRM-Backend-env.eba-vhhjmtea.ap-south-1.elasticbeanstalk.com
```

Should return HTML or JSON response (not error).

### 2. Test DNS

```bash
dig crm.gaadimech.com CNAME
nslookup crm.gaadimech.com
```

Should resolve to `xs0wrx3w.up.railway.app`.

### 3. Test Railway Domain

```bash
curl -I https://xs0wrx3w.up.railway.app
```

Should return 200 OK or redirect.

### 4. Test Custom Domain HTTP

```bash
curl -I http://crm.gaadimech.com
```

Should return 301 redirect to HTTPS.

### 5. Test Custom Domain HTTPS

```bash
curl -I https://crm.gaadimech.com
```

Should return 200 OK (after SSL is provisioned).

## 🐛 Common Issues & Solutions

### Issue 1: Health Check Timeout Too Short

**Symptom:** Server starts but gets SIGTERM immediately

**Solution:** ✅ FIXED - Increased timeout to 10000ms

### Issue 2: Environment Variable Missing Protocol

**Symptom:** API calls fail, CORS errors

**Solution:** Ensure `NEXT_PUBLIC_API_BASE_URL` starts with `http://`

### Issue 3: Backend CORS Not Configured

**Symptom:** CORS errors in browser console

**Solution:** Verify `EB_ORIGIN` in AWS includes `https://crm.gaadimech.com,http://crm.gaadimech.com`

### Issue 4: DNS Not Propagated

**Symptom:** Domain doesn't resolve

**Solution:** Wait 15-30 minutes, verify DNS records in GoDaddy

### Issue 5: SSL Certificate Not Ready

**Symptom:** HTTPS shows certificate error

**Solution:** Wait 10-30 minutes for Railway to provision SSL

## ✅ Final Checklist

Before considering setup complete:

- [ ] Railway deployment shows "Active" (not "Building" or "Failed")
- [ ] Logs show `> Ready on http://0.0.0.0:8080` without SIGTERM
- [ ] Environment variable `NEXT_PUBLIC_API_BASE_URL` is set correctly
- [ ] Health check timeout is 10000ms (not 100ms)
- [ ] Backend CORS includes `https://crm.gaadimech.com,http://crm.gaadimech.com`
- [ ] DNS resolves correctly: `dig crm.gaadimech.com CNAME`
- [ ] HTTP redirects to HTTPS: `curl -I http://crm.gaadimech.com`
- [ ] HTTPS works: `curl -I https://crm.gaadimech.com`
- [ ] Browser shows login page (not error)
- [ ] No CORS errors in browser console
- [ ] API calls work (test login)

## 📝 Summary

**Current Status:**
- ✅ DNS: Correct
- ✅ Backend CORS: Configured
- ✅ Server code: Fixed
- ⚠️ Health check timeout: Fixed (needs deployment)
- ⏳ SSL certificate: Provisioning

**Action Required:**
1. Wait for new deployment with health check fix
2. Verify environment variable is correct
3. Test after deployment completes

