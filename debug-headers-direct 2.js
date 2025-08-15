const { NextResponse } = require('next/server');

// Import the security headers function (simulate it since we can't import TS directly)
const applySecurityHeaders = (response, customConfig = {}) => {
  const DEVELOPMENT_HEADERS = {
    contentSecurityPolicy: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' localhost:* 127.0.0.1:* https://cdn.jsdelivr.net",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https:",
      "connect-src 'self' localhost:* ws://localhost:* wss://localhost:* https://api.resend.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
    xFrameOptions: 'DENY',
    xContentTypeOptions: 'nosniff',
    referrerPolicy: 'strict-origin-when-cross-origin',
    permissionsPolicy: [
      'geolocation=()',
      'microphone=()',
      'camera=()',
      'payment=()',
      'usb=()',
      'magnetometer=()',
      'gyroscope=()',
      'speaker=(self)',
      'fullscreen=(self)',
      'sync-xhr=()',
    ].join(', '),
    xXSSProtection: '1; mode=block',
    crossOriginOpenerPolicy: 'unsafe-none',
  };

  const headers = { ...DEVELOPMENT_HEADERS, ...customConfig };

  const headerMap = {
    contentSecurityPolicy: 'Content-Security-Policy',
    strictTransportSecurity: 'Strict-Transport-Security',
    xFrameOptions: 'X-Frame-Options',
    xContentTypeOptions: 'X-Content-Type-Options',
    referrerPolicy: 'Referrer-Policy',
    permissionsPolicy: 'Permissions-Policy',
    xXSSProtection: 'X-XSS-Protection',
    crossOriginEmbedderPolicy: 'Cross-Origin-Embedder-Policy',
    crossOriginOpenerPolicy: 'Cross-Origin-Opener-Policy',
    crossOriginResourcePolicy: 'Cross-Origin-Resource-Policy',
  };

  Object.entries(headers).forEach(([key, value]) => {
    if (value) {
      const headerName = headerMap[key] || key;
      response.headers.set(headerName, value);
      console.log(`Setting header: ${headerName} = ${value}`);
    }
  });

  return response;
};

// Test the function directly
console.log('Testing security headers function...');

// Create a mock NextResponse
const mockResponse = {
  headers: new Map(),
  status: 200,
};

// Override the headers.set method to capture calls
mockResponse.headers.set = function (name, value) {
  console.log(`Header set: ${name} = ${value}`);
  this[name] = value;
};

console.log('\n1. Testing applySecurityHeaders function:');
const result = applySecurityHeaders(mockResponse);

console.log('\n2. Final headers in response:');
console.log(
  Object.keys(mockResponse).filter(
    (key) => key !== 'headers' && key !== 'status'
  )
);

console.log('\n3. Testing with curl to actual server...');

const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3003,
  path: '/',
  method: 'GET',
};

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log('Response Headers:');

  const securityHeaders = [
    'content-security-policy',
    'x-frame-options',
    'x-content-type-options',
    'referrer-policy',
    'permissions-policy',
    'x-xss-protection',
    'cross-origin-opener-policy',
  ];

  let foundHeaders = 0;

  Object.entries(res.headers).forEach(([key, value]) => {
    const isSecurityHeader = securityHeaders.includes(key.toLowerCase());
    if (isSecurityHeader) {
      console.log(`  ✅ ${key}: ${value}`);
      foundHeaders++;
    } else {
      console.log(`  ${key}: ${value}`);
    }
  });

  console.log(
    `\nSecurity headers found: ${foundHeaders}/${securityHeaders.length}`
  );

  if (foundHeaders === 0) {
    console.log(
      '❌ No security headers found - middleware may not be applying them'
    );
  } else if (foundHeaders < securityHeaders.length) {
    console.log('⚠️ Some security headers missing');
  } else {
    console.log('✅ All security headers present');
  }
});

req.on('error', (err) => {
  console.error('Request error:', err.message);
});

req.setTimeout(5000, () => {
  console.error('Request timeout');
  req.destroy();
});

req.end();
