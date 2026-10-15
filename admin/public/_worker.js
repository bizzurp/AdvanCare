// Cloudflare Pages same-origin API proxy. Never accept a destination from the caller.
const API_ORIGIN = 'https://advancare-api.mcleinonza0531.workers.dev';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== '/api' && !url.pathname.startsWith('/api/')) {
      return env.ASSETS.fetch(request);
    }

    const target = new URL(url.pathname + url.search, API_ORIGIN);
    const upstream = await fetch(new Request(target, request), { redirect: 'manual' });
    const response = new Response(upstream.body, upstream);
    // Pages' static _headers file does not apply to Function responses.
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Referrer-Policy', 'no-referrer');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    response.headers.set('Cache-Control', 'no-store');
    return response;
  },
};
