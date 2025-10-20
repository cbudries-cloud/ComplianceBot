# ComplianceBot Production Deployment Guide

## 🚀 **Complete Autonomous Deployment Plan**

### **Phase 1: Choose Your Deployment Platform**

#### **Option A: Google Cloud Run (Recommended)**
- ✅ **Serverless** - No server management
- ✅ **Auto-scaling** - Handles traffic spikes
- ✅ **Pay-per-use** - Cost effective
- ✅ **Easy deployment** - Docker-based

#### **Option B: AWS ECS/Fargate**
- ✅ **AWS ecosystem** - Good for enterprise
- ✅ **Container orchestration** - Scalable
- ✅ **Managed infrastructure** - Less ops overhead

#### **Option C: Railway/Render/Heroku**
- ✅ **Simple deployment** - Git-based
- ✅ **Quick setup** - Good for smaller scale
- ✅ **Managed databases** - Less configuration

---

## 🐳 **Docker Deployment (Google Cloud Run)**

### **Step 1: Prepare Your Code**

```bash
# Ensure all files are ready
ls -la
# Should see: Dockerfile, package.json, src/, tsconfig.json
```

### **Step 2: Build and Deploy**

```bash
# Set your project ID
export PROJECT_ID="your-gcp-project-id"
export SERVICE_NAME="compliancebot"

# Build the Docker image
docker build -t gcr.io/$PROJECT_ID/$SERVICE_NAME .

# Push to Google Container Registry
docker push gcr.io/$PROJECT_ID/$SERVICE_NAME

# Deploy to Cloud Run
gcloud run deploy $SERVICE_NAME \
  --image gcr.io/$PROJECT_ID/$SERVICE_NAME \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars="HUBSPOT_TOKEN=your_token_here" \
  --set-env-vars="OPENAI_API_KEY=your_key_here" \
  --set-env-vars="SLACK_WEBHOOK_URL=your_webhook_here" \
  --set-env-vars="POLL_INTERVAL=300000" \
  --memory=2Gi \
  --cpu=2 \
  --timeout=3600
```

### **Step 3: Configure Environment Variables**

In Google Cloud Console:
1. Go to **Cloud Run** → **compliancebot**
2. Click **Edit & Deploy New Revision**
3. Go to **Variables & Secrets** tab
4. Add all required environment variables:

```
HUBSPOT_TOKEN=pat-na1-your-token-here
OPENAI_API_KEY=sk-your-openai-key-here
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
PROPERTY_LANDING_URL=landing_page_url
POLL_INTERVAL=300000
```

---

## ⚙️ **Automated Operation Modes**

### **Mode 1: Scheduler (Fully Autonomous)**
```bash
# Runs continuously, polls HubSpot once per day
npm run scheduler
```

**What it does:**
- 🔍 **Searches HubSpot** for tickets with `landing_page_url` modified in last 24h
- 🚀 **Processes automatically** - no manual intervention needed
- 📊 **Logs everything** to CSV and Slack
- ♻️ **Prevents duplicates** with 24h caching
- 🔄 **Runs daily** - checks once per day

### **Mode 2: API Service (On-Demand)**
```bash
# Runs as API server for manual/triggered processing
npm run polling
```

**What it does:**
- 🌐 **Exposes API endpoints** for manual ticket processing
- 📞 **Responds to requests** like `curl http://localhost:3000/process-ticket/123`
- 🔧 **Good for testing** and manual operations

### **Mode 3: Webhook Service (Real-time)**
```bash
# Runs as webhook receiver for real-time processing
npm run dev
```

**What it does:**
- 📡 **Receives HubSpot webhooks** in real-time
- ⚡ **Processes immediately** when tickets are updated
- 🔐 **Verifies signatures** for security

---

## 📊 **Monitoring & Observability**

### **Health Checks**
```bash
# Check if service is running
curl https://your-service-url/healthz
# Should return: "ok"
```

### **Logs**
```bash
# View logs in Google Cloud Run
gcloud logs read --service=compliancebot --limit=50

# Or view in Cloud Console
# Cloud Run → compliancebot → Logs tab
```

### **Metrics**
- **CSV Log**: `results.csv` contains all processing history
- **Slack Notifications**: Real-time alerts for violations
- **Console Logs**: Detailed processing information

---

## 🔧 **Configuration Options**

### **Environment Variables**

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `HUBSPOT_TOKEN` | HubSpot API token | - | ✅ |
| `OPENAI_API_KEY` | OpenAI API key | - | ✅ |
| `SLACK_WEBHOOK_URL` | Slack webhook URL | - | ✅ |
| `PROPERTY_LANDING_URL` | HubSpot property name | `landing_page_url` | ❌ |
| `POLL_INTERVAL` | Polling interval (ms) | `86400000` (24 hours) | ❌ |
| `PORT` | Server port | `3000` | ❌ |

### **Polling Intervals**
- **24 hours** (`86400000`) - **Recommended** for compliance checking
- **12 hours** (`43200000`) - For more frequent monitoring
- **6 hours** (`21600000`) - For high-volume needs
- **1 hour** (`3600000`) - For real-time monitoring

---

## 🚨 **Production Checklist**

### **Before Deployment**
- [ ] **Environment variables** configured
- [ ] **HubSpot token** has proper permissions
- [ ] **OpenAI API key** has sufficient credits
- [ ] **Slack webhook** points to correct channel
- [ ] **Docker image** builds successfully
- [ ] **Health check** endpoint works

### **After Deployment**
- [ ] **Service starts** without errors
- [ ] **Health check** returns "ok"
- [ ] **Test ticket processing** works
- [ ] **Slack notifications** arrive
- [ ] **CSV logging** functions
- [ ] **Monitoring** is set up

### **Ongoing Operations**
- [ ] **Monitor logs** for errors
- [ ] **Check CSV file** for processing history
- [ ] **Verify Slack notifications** are working
- [ ] **Update compliance guide** as needed
- [ ] **Scale resources** if needed

---

## 💰 **Cost Optimization**

### **Google Cloud Run**
- **CPU**: Only charged when processing
- **Memory**: Scale based on usage
- **Requests**: Pay per request
- **Estimated cost**: $10-50/month for typical usage

### **Resource Sizing**
```bash
# Light usage (1-10 tickets/day)
--memory=1Gi --cpu=1

# Medium usage (10-100 tickets/day)  
--memory=2Gi --cpu=2

# Heavy usage (100+ tickets/day)
--memory=4Gi --cpu=4
```

---

## 🔄 **Deployment Commands**

### **Quick Deploy Script**
```bash
#!/bin/bash
# deploy.sh

PROJECT_ID="your-gcp-project-id"
SERVICE_NAME="compliancebot"

echo "🚀 Deploying ComplianceBot to Google Cloud Run..."

# Build and push
docker build -t gcr.io/$PROJECT_ID/$SERVICE_NAME .
docker push gcr.io/$PROJECT_ID/$SERVICE_NAME

# Deploy
gcloud run deploy $SERVICE_NAME \
  --image gcr.io/$PROJECT_ID/$SERVICE_NAME \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory=2Gi \
  --cpu=2 \
  --timeout=3600

echo "✅ Deployment complete!"
echo "🌐 Service URL: https://$SERVICE_NAME-xxx-uc.a.run.app"
```

### **Environment Update**
```bash
# Update environment variables without redeploying
gcloud run services update compliancebot \
  --set-env-vars="POLL_INTERVAL=600000" \
  --region us-central1
```

---

## 🎯 **Next Steps**

1. **Choose deployment platform** (Google Cloud Run recommended)
2. **Set up environment variables** in your chosen platform
3. **Deploy using Docker** with the provided Dockerfile
4. **Test with a few tickets** to ensure everything works
5. **Monitor logs and Slack** for ongoing operation
6. **Scale resources** based on usage patterns

The ComplianceBot will then run **completely autonomously**, processing new tickets every 5 minutes and sending compliance reports to Slack! 🎉

