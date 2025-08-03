<!-- Use this file to provide workspace-specific custom instructions to Copilot. -->

This is a Cloudflare Worker project that implements a DDNS updater. The worker:
1. Resolves the current IP address of a domain using Google DNS
2. Updates a Cloudflare Zero Trust Gateway location with the new IP
3. Runs on a schedule and can also be triggered via HTTP request

Key security considerations:
- All sensitive data should be stored in environment variables
- API tokens should have minimal required permissions
- Proper error handling and logging is essential
- All HTTP requests should have timeouts
- Input validation is required for all external data

The project uses TypeScript for better type safety and maintainability.
