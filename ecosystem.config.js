module.exports = {
  apps: [{
    name: 'task-dashboard-api',
    script: 'server/index.js',
    instances: 1,
    env_production: {
      NODE_ENV: 'production',
    },
    log_file: 'logs/pm2.log',
    error_file: 'logs/pm2-error.log',
    max_memory_restart: '256M',
    watch: false,
  }],
};
