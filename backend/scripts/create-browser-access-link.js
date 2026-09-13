const fs = require('fs');
const path = require('path');
const { createBrowserAccessToken } = require('../lib/browserAccess');

const privateKeyPath = path.resolve(__dirname, '..', '..', '.browser-access', 'private.pem');
if (!fs.existsSync(privateKeyPath)) throw new Error('Local browser access private key was not found');
const baseUrl = (process.argv[2] || 'https://fitness-app-bay-five.vercel.app').replace(/\/$/, '');
const token = createBrowserAccessToken(fs.readFileSync(privateKeyPath));
console.log(`${baseUrl}/#browser_access=${token}`);
