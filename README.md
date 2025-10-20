# ComplianceBot Webhook Service

A Node.js service that receives HubSpot ticket property updates, crawls landing pages, reviews content for compliance violations using OpenAI, and notifies via Slack.

## Features

- **HubSpot Integration**: Webhook endpoint for ticket property changes
- **Page Crawling**: Playwright-based page fetching with retry logic
- **Compliance Review**: AI-powered content analysis for medical claims and HSA/FSA violations
- **Slack Notifications**: Real-time alerts with violation details and quotes
- **CSV Logging**: Historical record of all processed tickets
- **Idempotency**: 24-hour deduplication to prevent duplicate processing

## Setup

### 1. Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Required variables:
- `HUBSPOT_APP_SECRET`: Your HubSpot app secret for signature verification
- `OPENAI_API_KEY`: OpenAI API key for content review
- `SLACK_WEBHOOK_URL`: Slack webhook URL for notifications
- `PROPERTY_LANDING_URL`: HubSpot property name to monitor (default: `landing_page_url`)

Optional:
- `PORT`: Server port (default: 3000)
- `OPENAI_MODEL`: OpenAI model to use (default: `gpt-4o-mini`)

### 2. Install Dependencies

```bash
npm install
```

### 3. HubSpot Webhook Configuration

1. In HubSpot, go to Settings → Integrations → Webhooks
2. Create a new webhook with:
   - **Object**: Tickets
   - **Event**: propertyChange
   - **Property**: `landing_page_url` (or your configured property name)
   - **Endpoint**: `POST https://your-domain.com/webhooks/hubspot`
   - **Signature**: v3
   - **Secret**: Use the same value as `HUBSPOT_APP_SECRET`

### 4. Local Development

```bash
npm run dev
```

For testing with HubSpot webhooks locally, use a tunnel service:

```bash
# Install ngrok (if not already installed)
npm install -g ngrok

# In another terminal, expose your local server
ngrok http 3000

# Use the ngrok URL in your HubSpot webhook configuration
```

## Deployment

### Docker

```bash
# Build the image
docker build -t compliancebot .

# Run the container
docker run -p 3000:3000 --env-file .env compliancebot
```

### Cloud Deployment

The service can be deployed to any cloud platform that supports Node.js:

- **Google Cloud Run**: Use the provided Dockerfile
- **Heroku**: Add `Procfile` with `web: npm run dev`
- **Railway/Render**: Direct Node.js deployment

Make sure to:
1. Set all environment variables in your deployment platform
2. Ensure the webhook endpoint is publicly accessible
3. Configure your HubSpot webhook to point to the deployed URL

## API Endpoints

### POST /webhooks/hubspot
HubSpot webhook endpoint. Processes ticket property changes and triggers compliance checks.

### GET /healthz
Health check endpoint. Returns "ok" if the service is running.

## File Outputs

### results.csv
CSV file containing all processed tickets with columns:
- `timestamp`: ISO timestamp of processing
- `ticket_id`: HubSpot ticket ID
- `url`: Original URL from ticket
- `final_url`: Final URL after redirects
- `http_status`: HTTP response status code
- `decision`: Compliance decision (violation/needs_review/clean/error)
- `confidence`: AI confidence score (0-1)
- `violations_json`: JSON array of violations with quotes

### data.db
SQLite database for idempotency tracking. Contains a `seen` table with:
- `ticket_id`: HubSpot ticket ID
- `url_hash`: SHA-256 hash of the URL
- `day`: Date in YYYY-MM-DD format

## Compliance Rules

The AI reviews content for:
- Prohibited medical claims (diagnose/treat/cure/prevent disease)
- Misleading HSA/FSA eligibility claims
- Missing qualifiers for health benefits
- Absolute guarantees without proper disclaimers

## Error Handling

- **Page Fetch Errors**: Retries once, then logs error to CSV and Slack
- **AI Review Errors**: Logs error and continues processing
- **Signature Verification**: Returns 401 for invalid signatures
- **Idempotency**: Skips processing if same ticket+URL processed in last 24h

## Monitoring

- Check `/healthz` endpoint for service health
- Monitor `results.csv` for processing history
- Slack notifications provide real-time alerts
- Logs are output to console (use a logging service for production)

## Security

- HubSpot signature v3 verification on all webhook requests
- Environment variables for sensitive configuration
- No data written back to HubSpot (read-only webhook processing)

