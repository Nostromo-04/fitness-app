const fs = require('fs');
const path = require('path');
const { createBrowserAccessToken } = require('../lib/browserAccess');

const privateKeyPath = path.resolve(__dirname, '..', '..', '.browser-access', 'private.pem');
if (!fs.existsSync(privateKeyPath)) throw new Error('Local browser access private key was not found');
const baseUrl = (process.argv[2] || 'https://fitness-app-bay-five.vercel.app').replace(/\/$/, '');
const firstName = process.argv[3];
const lastName = process.argv[4];
const browserRole = process.argv[5] || 'athlete';
if ((firstName && !lastName) || (!firstName && lastName)) throw new Error('Specify both athlete first and last name');
if (!['athlete', 'coach'].includes(browserRole)) throw new Error('Browser role must be athlete or coach');
const claims = firstName ? { athleteFirstName: firstName, athleteLastName: lastName, browserRole } : {};
const token = createBrowserAccessToken(fs.readFileSync(privateKeyPath), Date.now(), claims);
console.log(`${baseUrl}/#browser_access=${token}`);


