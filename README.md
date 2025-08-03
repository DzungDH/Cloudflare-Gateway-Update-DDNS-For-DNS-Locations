# Cloudflare DDNS Updater

A Cloudflare Worker that automatically updates DNS records based on dynamic IP changes.

## Features

- Automatic IP address detection using Google DNS
- Updates Cloudflare Zero Trust Gateway location with new IP
- Runs on a schedule (every 15 minutes by default)
- TypeScript support for better code quality and maintainability
- Built-in error handling and logging
- Request timeout protection

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables in your `.dev.vars` file:
```env
ACCOUNT_ID=your-account-id
API_TOKEN=your-api-token
DDNS_DOMAIN=your-domain.com
```

3. Update `wrangler.jsonc` with your settings:
- Adjust the cron schedule if needed (default is every 15 minutes)
- Change the LOCATION_NAME if different from "RouterZTE"

## Development

Run the worker locally:
```bash
npm run dev
```

## Deployment

Deploy to Cloudflare Workers:
```bash
npm run deploy
```

## Security Features

- Request timeout handling
- Error boundary implementation
- Proper error logging
- Type safety with TypeScript
- Secure headers management
- Environment variable configuration

## License

MIT
