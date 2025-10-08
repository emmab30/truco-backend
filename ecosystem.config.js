module.exports = {
    apps: [
        {
            name: 'truco',
            script: 'dist/server.js',
            instances: 1,
            exec_mode: 'fork',
            watch: false,
            max_memory_restart: '1G',
            env: {
                NODE_ENV: 'development',
                PORT: 3001,
                HOST: '0.0.0.0',
                CORS_ORIGIN: 'http://0.0.0.0:3001'
            },
            env_production: {
                NODE_ENV: 'production',
                PORT: 3001,
                HOST: '0.0.0.0',
                CORS_ORIGIN: 'http://0.0.0.0:3001'
            },
            error_file: './logs/err.log',
            out_file: './logs/out.log',
            log_file: './logs/combined.log',
            time: true,
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
            merge_logs: true,
            autorestart: true,
            max_restarts: 10,
            min_uptime: '10s',
            restart_delay: 4000,
            kill_timeout: 5000,
            listen_timeout: 3000,
            wait_ready: true,
            kill_retry_time: 100
        }
    ]
};
