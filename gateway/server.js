
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');
const fs = require('fs');

const app = express();

// Map of service routes to backend containers and their prefixes
const services = {
  '/api/restaurants': { target: 'http://restaurant-container:8001', prefix: '/api/restaurants', rewrite: true },
  '/api/orders': { target: 'http://order-container:8002', prefix: '/api/orders', rewrite: true },
  '/api/delivery': { target: 'http://delivery-container:8003', prefix: '/api/delivery', rewrite: true },
  '/auth': { target: 'http://auth-container:8004', rewrite: false },
};

// Route map for frontend pages
const routes = {
  '/': 'index.html',
  '/login': 'login.html',
  '/customer': 'customer_dashboard.html',
  '/admin': 'admin_dashboard.html',
  '/delivery': 'delivery_dashboard.html',
};


// Request logging middleware
app.use((req, res, next) => {
  console.log(`➡️ ${req.method} ${req.url}`);
  next();
});

// Proxy API and auth requests
Object.keys(services).forEach(route => {
  const service = services[route];
  app.use(route, (req, res, next) => {
    let proxyPath = req.url;
    if (service.rewrite !== false) {
      proxyPath = req.url.replace(service.prefix, '') || '/';
    }
    createProxyMiddleware({
      target: service.target,
      changeOrigin: true,
      pathRewrite: service.rewrite !== false ? { [`^${service.prefix}`]: '' } : undefined,
      onProxyReq: (proxyReq, req, res) => {
        console.log(`🔁 Proxying to ${service.target}${proxyPath}`);
      },
      onError: (err, req, res) => {
        console.error(`❌ Proxy error: ${err.message}`);
        res.status(500).send('Proxy error');
      }
    })(req, res, next);
  });
});

// Serve mapped frontend routes
Object.keys(routes).forEach(route => {
  app.get(route, (req, res) => {
    const filePath = path.join(__dirname, 'static', routes[route]);
    res.sendFile(filePath, err => {
      if (err) {
        res.status(500).send('Error loading page.');
      }
    });
  });
});

// Serve static assets (CSS, JS, images)
app.use(express.static(path.join(__dirname, 'static')));

// Start the server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Gateway server running at http://localhost:${PORT}`);
});
