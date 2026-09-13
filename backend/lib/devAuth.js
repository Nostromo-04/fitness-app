function devAuthAllowed({ nodeEnv, enabled, hostname }) {
  if (nodeEnv === 'production' || enabled !== 'true') return false;
  return ['localhost', '127.0.0.1', '::1'].includes(hostname);
}
module.exports = { devAuthAllowed };
