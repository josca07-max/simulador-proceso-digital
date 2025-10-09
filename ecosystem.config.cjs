// ===============================================
// PM2 ECOSYSTEM - SIMULADOR DE PROCESO DIGITAL
// ===============================================

module.exports = {
  apps: [
    {
      name: 'simulador-proceso-digital',
      script: 'npx',
      args: 'wrangler pages dev dist --d1=simulador-proceso-production --local --ip 0.0.0.0 --port 3000',
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      watch: false, // Disable PM2 file monitoring (wrangler has its own)
      instances: 1, // Development mode uses only one instance
      exec_mode: 'fork',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: './logs/error.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true,
      autorestart: true,
      max_restarts: 5,
      min_uptime: '10s'
    }
  ]
}