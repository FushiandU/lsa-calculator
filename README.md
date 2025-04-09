# LSA Calculator API

This is a Local Services Ads Calculator API that helps estimate advertising budgets for various industries using Google's LSA platform.

## Features

- Calculate estimated budget ranges for Local Service Ads
- Support for multiple industries
- ZIP code-based targeting
- Monthly lead estimation
- Cost per lead calculation

## Tech Stack

- Node.js
- Express.js
- Playwright for data collection
- CORS enabled

## Setup

1. Clone the repository:
```bash
git clone [your-repo-url]
```

2. Install dependencies:
```bash
npm install
```

3. Start the server:
```bash
npm start
```

The server will start on port 3000 by default.

## API Endpoints

### POST /calculate-budget

Calculate the estimated budget for Local Service Ads.

**Request Body:**
```json
{
  "zipCode": "string",
  "industry": "string",
  "leadsPerMonth": number
}
```

**Response:**
```json
{
  "success": true,
  "budget": {
    "min": number,
    "max": number,
    "currency": "USD",
    "frequency": "monthly"
  },
  "leads": {
    "requested": number,
    "estimated": number,
    "costPerLead": number
  },
  "location": {
    "zipCode": "string",
    "available": boolean
  },
  "industry": "string"
}
```

### GET /health

Health check endpoint to verify API status.

## License

ISC 