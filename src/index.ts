/// <reference types="@cloudflare/workers-types" />

interface Env {
    ACCOUNT_ID: string;
    API_TOKEN: string;
    DDNS_DOMAIN: string;
    LOCATION_NAME: string;
}

interface CloudflareLocation {
    id: string;
    name: string;
    networks: Array<{ network: string }>;
    created_at: string;
    updated_at: string;
    client_default: boolean;
    ecs_support: boolean;
}

interface DNSResponse {
    Status: number;
    Answer?: Array<{
        name: string;
        type: number;
        TTL: number;
        data: string;
    }>;
}

export default {
    async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
        ctx.waitUntil(handleRequest(env));
    },

    async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
        try {
            await handleRequest(env);
            return new Response('DDNS update completed successfully', { status: 200 });
        } catch (error) {
            console.error('Error in fetch handler:', error);
            return new Response('Internal server error', { status: 500 });
        }
    }
};

async function handleRequest(env: Env): Promise<void> {
    try {
        const ip = await resolveDomain(env.DDNS_DOMAIN);
        if (!ip) {
            throw new Error(`Failed to resolve IP address for ${env.DDNS_DOMAIN}`);
        }

        console.log(`Current IP address for ${env.DDNS_DOMAIN}: ${ip}`);

        const location = await getLocationId(env);
        if (!location) {
            throw new Error('No location found in Cloudflare Zero Trust');
        }

        const currentIp = location.networks[0]?.network.split('/')[0];
        if (currentIp === ip) {
            console.log('IP address unchanged, skipping update');
            return;
        }

        console.log(`IP address changed from ${currentIp} to ${ip}, updating...`);
        const updateResult = await updateLocation(env, location.id, ip);
        if (!updateResult) {
            throw new Error('Failed to update location');
        }

        console.log(`Successfully updated location ${updateResult.name}:`, {
            id: updateResult.id,
            ip: updateResult.networks[0].network,
            subnet: updateResult.networks[0].network.split('/')[1],
            updatedAt: updateResult.updated_at
        });

    } catch (error) {
        console.error('Error in handleRequest:', error);
        throw error;
    }
}

async function resolveDomain(domain: string): Promise<string | null> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
        const response = await fetch(
            `https://dns.google.com/resolve?name=${encodeURIComponent(domain)}&type=A`,
            { signal: controller.signal }
        );

        if (!response.ok) {
            throw new Error(`DNS resolution failed with status: ${response.status}`);
        }

        const data: DNSResponse = await response.json();

        if (data.Status !== 0 || !data.Answer?.length) {
            return null;
        }

        const ipAddresses = data.Answer
            .filter(answer => answer.type === 1)
            .map(answer => answer.data);

        return ipAddresses[0] || null;

    } catch (error) {
        if (error instanceof Error) {
            console.error('Error resolving domain:', error.message);
        }
        return null;
    } finally {
        clearTimeout(timeoutId);
    }
}

async function getLocationId(env: Env): Promise<CloudflareLocation | null> {
    const url = `https://api.cloudflare.com/client/v4/accounts/${env.ACCOUNT_ID}/gateway/locations`;

    try {
        const response = await fetch(url, {
            headers: getCloudflareHeaders(env)
        });

        if (!response.ok) {
            throw new Error(`Failed to get locations: ${response.status}`);
        }

        const data = await response.json();
        const responseData = data as { success: boolean; result: CloudflareLocation[]; errors?: Array<{ message: string }> };
        if (!responseData.success) {
            throw new Error(responseData.errors?.[0]?.message || 'Unknown error getting locations');
        }

        return responseData.result.find((loc: CloudflareLocation) =>
            loc.name === env.LOCATION_NAME
        ) || null;

    } catch (error) {
        if (error instanceof Error) {
            console.error('Error getting location ID:', error.message);
        }
        return null;
    }
}


async function updateLocation(
    env: Env,
    locationId: string,
    ip: string
): Promise<CloudflareLocation | null> {
    const url = `https://api.cloudflare.com/client/v4/accounts/${env.ACCOUNT_ID}/gateway/locations/${locationId}`;

    try {
        const response = await fetch(url, {
            method: 'PUT',
            headers: getCloudflareHeaders(env),
            body: JSON.stringify({
                client_default: true,
                ecs_support: true,
                name: env.LOCATION_NAME,
                networks: [{ network: `${ip}/32` }]
            })
        });

        if (!response.ok) {
            throw new Error(`Failed to update location: ${response.status}`);
        }

        const data = await response.json();
        const responseData = data as { success: boolean; result: CloudflareLocation; errors?: Array<{ message: string }> };
        if (!responseData.success) {
            throw new Error(responseData.errors?.[0]?.message || 'Unknown error updating location');
        }

        return responseData.result;

    } catch (error) {
        if (error instanceof Error) {
            console.error('Error updating location:', error.message);
        }
        return null;
    }
}

function getCloudflareHeaders(env: Env): HeadersInit {
    return {
        'Authorization': `Bearer ${env.API_TOKEN}`,
        'Content-Type': 'application/json'
    };
}
