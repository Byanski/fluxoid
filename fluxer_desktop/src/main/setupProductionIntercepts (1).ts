/**
 * setupProductionIntercepts.ts
 *
 * Call setupProductionIntercepts(session, webContents) immediately after
 * setupDisplayMediaHandler(session, webContents) inside Window.tsx.
 */

import {Session, WebContents, net} from 'electron';

const PRODUCTION_ORIGIN = 'https://web.fluxer.app';
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
	// 1. Rewrite outgoing request headers so the production server accepts them
	ses.webRequest.onBeforeSendHeaders({urls: [API_PATTERN]}, (details, callback) => {
		const headers = {...details.requestHeaders};
		headers['Origin'] = PRODUCTION_ORIGIN;
		headers['Referer'] = PRODUCTION_ORIGIN + '/';
		headers['Host'] = 'web.fluxer.app';
		callback({requestHeaders: headers});
	});

	// 2. Rewrite incoming response headers to allow CORS
	ses.webRequest.onHeadersReceived({urls: [API_PATTERN]}, (details, callback) => {
		const headers = {...details.responseHeaders} as Record<string, string | string[]>;
		for (const [key, value] of Object.entries(CORS_HEADERS)) {
			headers[key] = value;
		}
		callback({responseHeaders: headers as Record<string, string[]>});
	});

	// 3. Intercept https: to handle OPTIONS preflights and /.well-known/fluxer,
	//    and re-issue all other requests via net.request (pass-through).
	ses.protocol.interceptBufferProtocol('https', (request, callback) => {
		// Handle OPTIONS preflights
		if (request.method === 'OPTIONS' && request.url.startsWith(PRODUCTION_ORIGIN)) {
			callback({
				statusCode: 204,
				headers: {...CORS_HEADERS, 'content-length': '0', 'content-type': 'text/plain'},
				data: Buffer.alloc(0),
			});
			return;
		}

		// Handle /.well-known/fluxer
		if (request.url === WELL_KNOWN_URL) {
			const body = Buffer.from(WELL_KNOWN_PAYLOAD, 'utf8');
			callback({
				statusCode: 200,
				headers: {
					'content-type': 'application/json',
					'content-length': String(body.length),
					'cache-control': 'no-store',
					...CORS_HEADERS,
				},
				data: body,
			});
			return;
		}

		// Pass everything else through by re-issuing with net.request
		const req = net.request({method: request.method, url: request.url, session: ses});

		for (const [key, value] of Object.entries(request.headers)) {
			try {
				req.setHeader(key, value);
			} catch {}
		}

		req.on('response', (res) => {
			const chunks: Buffer[] = [];
			res.on('data', (chunk: Buffer) => chunks.push(chunk));
			res.on('end', () => {
				callback({
					statusCode: res.statusCode,
					headers: res.headers as Record<string, string>,
					data: Buffer.concat(chunks),
				});
			});
			res.on('error', () => callback({statusCode: 500, data: Buffer.alloc(0)}));
		});

		req.on('error', () => callback({statusCode: 500, data: Buffer.alloc(0)}));

		if (request.uploadData) {
			for (const d of request.uploadData) {
				if (d.bytes) req.write(d.bytes);
			}
		}

		req.end();
	});
}
