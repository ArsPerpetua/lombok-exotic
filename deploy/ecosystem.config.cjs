/**
 * PM2 process definitions for the Hostinger VPS (KVM 2, Ubuntu 24.04).
 *   pm2 start deploy/ecosystem.config.cjs
 *   pm2 save && pm2 startup
 *
 * `web` serves Next.js (standalone build). `worker` runs pg-boss jobs.
 * Both read env from /etc/lombok-exotic/web.env (chmod 600, not in git).
 */
module.exports = {
  apps: [
    {
      name: 'lex-web',
      cwd: '/var/www/lombok-exotic/current/apps/lombok-exotic',
      script: '.next/standalone/apps/lombok-exotic/server.js',
      env: { NODE_ENV: 'production', PORT: '3000', HOSTNAME: '127.0.0.1' },
      env_file: '/etc/lombok-exotic/web.env',
      instances: 1,
      max_memory_restart: '700M',
      exp_backoff_restart_delay: 200,
    },
    {
      name: 'lex-worker',
      cwd: '/var/www/lombok-exotic/current/apps/lombok-exotic',
      script: 'node_modules/.bin/tsx',
      args: 'src/worker/index.ts',
      env: { NODE_ENV: 'production' },
      env_file: '/etc/lombok-exotic/web.env',
      instances: 1,
      max_memory_restart: '300M',
    },
  ],
};
