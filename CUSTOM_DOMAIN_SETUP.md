# Setting Up crm.gaadimech.com for Railway Frontend

## Current Situation

- ✅ Frontend is deployed on Railway (currently deploying)
- ⚠️ GoDaddy DNS `crm` CNAME is pointing to **BACKEND**: `gaadimech-production.eba-xbusfdtj.ap-south-1.elasticbeanstalk.com`
- ❌ Need to point `crm.gaadimech.com` to Railway frontend instead

## Step-by-Step Setup

### Step 1: Add Custom Domain in Railway (5 minutes)

1. **Wait for deployment to complete**
   - Check Railway dashboard - service should show "Online" (not "Building" or "Deploying")
   - If still deploying, wait for it to finish

2. **Add Custom Domain in Railway:**
   - Go to Railway Dashboard → Your Service → **Settings** tab
   - Scroll to **"Public Networking"** section
   - Click **"+ Custom Domain"** button
   - In the input field, enter: `crm.gaadimech.com`
   - Click **"Add Domain"**
   - Railway will show you DNS instructions

3. **Get Railway Domain:**
   - After adding the domain, Railway will provide you with a domain to point to
   - It will look like: `crm.gaadimech.com.c.railway.app` or similar
   - **Note this domain** - you'll need it for GoDaddy DNS

### Step 2: Update GoDaddy DNS (5 minutes)

1. **Go to GoDaddy DNS Management:**
   - Log in to GoDaddy
   - Go to **"My Products"** → **"DNS"** (or **"Domains"** → **"DNS"**)
   - Find `gaadimech.com` and click **"Manage DNS"**

2. **Update the CNAME Record:**
   - Find the existing `crm` CNAME record (currently pointing to backend)
   - Click **"Edit"** on that record
   - **Current value:** `gaadimech-production.eba-xbusfdtj.ap-south-1.elasticbeanstalk.com.`
   - **Change to:** The Railway domain from Step 1 (e.g., `crm.gaadimech.com.c.railway.app`)
   - **TTL:** Keep as `1 Hour` or set to `600 seconds`
   - Click **"Save"**

3. **Verify DNS Record:**
   - The `crm` CNAME should now point to Railway, not the backend
   - Wait 5-15 minutes for DNS propagation

### Step 3: Update Environment Variable in Railway (2 minutes)

1. **Go to Railway → Variables tab**
2. **Update `NEXT_PUBLIC_API_BASE_URL`:**
   - Current backend URL: `GaadiMech-CRM-Backend-env.eba-vhhjmtea.ap-south-1.elasticbeanstalk.com`
   - **Should be:** `http://GaadiMech-CRM-Backend-env.eba-vhhjmtea.ap-south-1.elasticbeanstalk.com`
   - (Add `http://` at the beginning - backend only supports HTTP)
   - Save - Railway will auto-redeploy

### Step 4: Update Backend CORS (5 minutes)

The backend needs to allow requests from your custom domain.

**Option A: Via AWS Console**
1. Go to AWS Elastic Beanstalk → Your Environment
2. **Configuration** → **Software** → **Edit**
3. Find or add `EB_ORIGIN` environment variable
4. Set value to: `https://crm.gaadimech.com,http://crm.gaadimech.com`
5. Click **Apply** and wait for environment update (5-10 minutes)

**Option B: Via CLI**
```bash
cd GaadiMech-CRM-Backend
eb setenv EB_ORIGIN="https://crm.gaadimech.com,http://crm.gaadimech.com"
```

### Step 5: Wait for SSL Certificate (5-10 minutes)

- Railway will automatically provision an SSL certificate for `crm.gaadimech.com`
- This happens automatically after DNS is configured
- Check Railway → Settings → Domains to see SSL status
- Wait until it shows "Active" or "SSL Active"

### Step 6: Test Access (2 minutes)

1. **Wait for DNS propagation** (5-15 minutes after Step 2)
2. **Test HTTP:** Open `http://crm.gaadimech.com` in browser
3. **Test HTTPS:** Open `https://crm.gaadimech.com` in browser
4. **Check for errors:**
   - Open browser console (F12)
   - Look for CORS errors
   - Verify API calls are working

## Important Notes

### DNS Record Summary

**Before (Current - Wrong):**
```
crm → gaadimech-production.eba-xbusfdtj.ap-south-1.elasticbeanstalk.com (BACKEND)
```

**After (Correct):**
```
crm → [Railway domain from Step 1] (FRONTEND)
```

### Backend Access

Since `crm.gaadimech.com` will now point to the frontend, you'll need a different way to access the backend directly if needed:
- Use the direct AWS URL: `http://GaadiMech-CRM-Backend-env.eba-vhhjmtea.ap-south-1.elasticbeanstalk.com`
- Or create a different subdomain for backend (e.g., `api.gaadimech.com` or `backend.gaadimech.com`)

### Environment Variables Summary

**Frontend (Railway):**
```
NEXT_PUBLIC_API_BASE_URL=http://GaadiMech-CRM-Backend-env.eba-vhhjmtea.ap-south-1.elasticbeanstalk.com
```

**Backend (AWS):**
```
EB_ORIGIN=https://crm.gaadimech.com,http://crm.gaadimech.com
```

## Troubleshooting

### DNS Not Working
- Wait 15-30 minutes for DNS propagation
- Check DNS propagation: https://www.whatsmydns.net/#CNAME/crm.gaadimech.com
- Verify GoDaddy DNS record is correct

### SSL Certificate Issues
- Wait 5-10 minutes after DNS is configured
- Check Railway → Settings → Domains for SSL status
- Verify DNS is pointing correctly

### CORS Errors
- Verify `EB_ORIGIN` in AWS includes `https://crm.gaadimech.com,http://crm.gaadimech.com`
- Restart backend after updating CORS: `eb deploy` or wait for auto-update

### API Connection Errors
- Verify `NEXT_PUBLIC_API_BASE_URL` has `http://` protocol
- Check backend is accessible: `curl http://GaadiMech-CRM-Backend-env.eba-vhhjmtea.ap-south-1.elasticbeanstalk.com`
- Check browser console for specific errors

## Quick Checklist

- [ ] Railway deployment completed (status: "Online")
- [ ] Custom domain `crm.gaadimech.com` added in Railway
- [ ] Railway domain noted (for GoDaddy DNS)
- [ ] GoDaddy DNS `crm` CNAME updated to Railway domain
- [ ] Environment variable `NEXT_PUBLIC_API_BASE_URL` updated with `http://`
- [ ] Backend CORS updated with `https://crm.gaadimech.com,http://crm.gaadimech.com`
- [ ] Waited 5-15 minutes for DNS propagation
- [ ] Waited 5-10 minutes for SSL certificate
- [ ] Tested `http://crm.gaadimech.com` - works
- [ ] Tested `https://crm.gaadimech.com` - works
- [ ] No CORS errors in browser console
- [ ] API calls working

## Expected Timeline

- **Step 1-3:** 10-15 minutes (immediate)
- **Step 4:** 5-10 minutes (AWS environment update)
- **Step 5:** 5-10 minutes (SSL provisioning)
- **Step 6:** 5-15 minutes (DNS propagation)
- **Total:** ~30-50 minutes from start to fully working

---

**Once complete, your application will be accessible at:**
- ✅ `https://crm.gaadimech.com` (HTTPS - recommended)
- ✅ `http://crm.gaadimech.com` (HTTP - will work but should redirect to HTTPS)

