const http = require('http');

// デバッグ用のヘッダーチェック
const options = {
  hostname: 'localhost',
  port: 3003,
  path: '/',
  method: 'GET'
};

const req = http.request(options, (res) => {
  console.log('Status:', res.statusCode);
  console.log('Headers:');
  Object.entries(res.headers).forEach(([key, value]) => {
    console.log(`  ${key}: ${value}`);
  });
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('\nResponse body length:', data.length);
    if (res.statusCode === 500) {
      console.log('Error body:', data.substring(0, 500));
    }
  });
});

req.on('error', (err) => {
  console.error('Request error:', err);
});

req.setTimeout(5000, () => {
  console.error('Request timeout');
  req.destroy();
});

req.end();