const ZIPKIN_ENDPOINT = process.env.ZIPKIN_ENDPOINT;

function randomHex(len) {
    return [...Array(len)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');
}

export function zipkinMiddleware(serviceName) {
    return (req, res, next) => {
        if (!ZIPKIN_ENDPOINT) return next();

        const traceId = randomHex(32);
        const spanId = randomHex(16);
        const startUs = BigInt(Date.now()) * 1000n;

        res.on('finish', () => {
            const duration = Number(BigInt(Date.now()) * 1000n - startUs);
            const span = {
                traceId,
                id: spanId,
                name: `${req.method} ${req.route?.path ?? req.path}`,
                timestamp: Number(startUs),
                duration,
                localEndpoint: { serviceName },
                tags: {
                    'http.method': req.method,
                    'http.url': req.originalUrl,
                    'http.status_code': String(res.statusCode),
                },
            };
            fetch(ZIPKIN_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify([span]),
            }).catch(() => {});
        });

        next();
    };
}
