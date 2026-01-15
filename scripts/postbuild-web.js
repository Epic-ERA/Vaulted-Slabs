const fs = require('fs');
const path = require('path');

const distPath = path.join(__dirname, '..', 'dist');
const redirectsPath = path.join(distPath, '_redirects');

if (!fs.existsSync(distPath)) {
  console.error('Error: dist directory does not exist');
  process.exit(1);
}

const redirectsContent = '/*  /index.html  200';

fs.writeFileSync(redirectsPath, redirectsContent, 'utf8');

console.log('✓ Created _redirects file for SPA fallback');
