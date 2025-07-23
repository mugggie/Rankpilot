#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🚀 Building RankPilot API for deployment...');

// Create dist directory if it doesn't exist
const distDir = path.join(__dirname, 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Copy source files to dist (simple deployment build)
const srcDir = path.join(__dirname, 'src');
const files = [
  'index.ts',
  'prisma.ts',
  'stripe.ts',
  'queue.ts',
  'usageAlertWorker.ts',
  'middleware/requireAuth.ts',
  'middleware/adminOnly.ts',
  'services/analyticsService.ts',
  'services/apiKeyService.ts',
  'services/csvExporter.ts',
  'services/reportGenerator.ts'
];

console.log('📁 Copying source files...');

files.forEach(file => {
  const srcPath = path.join(srcDir, file);
  const destPath = path.join(distDir, file);
  
  if (fs.existsSync(srcPath)) {
    // Create directory structure if needed
    const destDir = path.dirname(destPath);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    
    // Copy file
    fs.copyFileSync(srcPath, destPath);
    console.log(`✅ Copied: ${file}`);
  } else {
    console.log(`⚠️  File not found: ${file}`);
  }
});

// Create a simple index.js that can run without TypeScript
const indexJs = `
const { spawn } = require('child_process');
const path = require('path');

console.log('Starting RankPilot API...');

// Run the TypeScript files with ts-node
const child = spawn('npx', ['ts-node', 'index.ts'], {
  cwd: __dirname,
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'production' }
});

child.on('error', (error) => {
  console.error('Failed to start API:', error);
  process.exit(1);
});

child.on('exit', (code) => {
  console.log('API process exited with code:', code);
  process.exit(code);
});
`;

fs.writeFileSync(path.join(distDir, 'index.js'), indexJs);
console.log('✅ Created index.js');

console.log('🎉 Build completed successfully!');
console.log('The API will run with ts-node in production.'); 