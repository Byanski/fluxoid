import {Session, WebContents} from 'electron';

const PRODUCTION_ORIGIN = 'https://web.fluxer.app';
const ALL_PATTERN = 'https://web.fluxer.app/*';
const API_PATTERN = 'https://web.fluxer.app/api/*';
const WELL_KNOWN_URL = 'https://web.fluxer.app/.well-known/fluxer';

const CORS_HEADERS: Record<string, string> = {
	'access-control-allow-origin': '*',
	'access-control-allow-methods': 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
	'access-control-allow-headers':
		'Authorization,Content-Type,X-Super-Properties,X-Discord-Locale,' +
		'X-Fluxer-Locale,X-Debug-Options,X-Fingerprint,X-Context-Properties,' +
		'X-Failed-Requests,X-Track,Accept,Origin,Referer',
	'access-control-allow-credentials': 'true',
	'access-control-max-age': '86400',
};

const WELL_KNOWN_PAYLOAD = JSON.stringify({
	gateway: 'wss://gateway.fluxer.app',
	media_proxy: 'https://fluxerusercontent.com',
});

export function setupProductionIntercepts(ses: Session, _webContents: WebContents): void {
	// 1. Rewrite outgoing headers on all requests to spoof origin
	ses.webRequest.onBeforeSendHeaders({urls: [ALL_PATTERN]}, (details, callback) => {
		const headers = {...details.requestHeaders};
		headers['Origin'] = PRODUCTION_ORIGIN;
		headers['Referer'] = PRODUCTION_ORIGIN + '/';
		headers['Host'] = 'web.fluxer.app';
		callback({requestHeaders: headers});
	});

	// 2. Rewrite response headers to allow CORS
	ses.webRequest.onHeadersReceived({urls: [ALL_PATTERN]}, (details, callback) => {
		const headers = {...details.responseHeaders} as Record<string, string | string[]>;
		for (const [key, value] of Object.entries(CORS_HEADERS)) {
			headers[key] = value;
		}
		callback({responseHeaders: headers as Record<string, string[]>});
	});

	// 3. Short-circuit OPTIONS preflights before they hit the network
	ses.webRequest.onBeforeRequest({urls: [ALL_PATTERN]}, (details, callback) => {
		if (details.method === 'OPTIONS') {
			// Redirect to a data URL — the response headers rewriter above
			// will add CORS headers, and the empty body satisfies the preflight.
			callback({redirectURL: 'data:text/plain,'});
			return;
		}

		// Short-circuit /.well-known/fluxer
		if (details.url === WELL_KNOWN_URL) {
			const encoded = encodeURIComponent(WELL_KNOWN_PAYLOAD);
			callback({redirectURL: `data:application/json,${encoded}`});
			return;
		}

		callback({});
	});
}
