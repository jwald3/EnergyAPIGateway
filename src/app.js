const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");

const app = express();
const port = process.env.PORT || 3110;

let fetch;

(async () => {
    fetch = await import("node-fetch").then((module) => module.default);
})();

// Apply proxy middleware
app.use(
    "/households",
    createProxyMiddleware({
        target: "https://energy-household-api.onrender.com",
        changeOrigin: true,
    })
);
app.use(
    "/providers",
    createProxyMiddleware({
        target: "https://energy-provider-api.onrender.com",
        changeOrigin: true,
    })
);
app.use(
    "/regions",
    createProxyMiddleware({
        target: "https://energy-region-api-js.onrender.com",
        changeOrigin: true,
    })
);
app.use(
    "/states",
    createProxyMiddleware({
        target: "https://energy-region-api-js.onrender.com/regions",
        changeOrigin: true,
    })
);

(async () => {
    // Load fetch
    fetch = await import("node-fetch").then((module) => module.default);

    // Start the server
    app.listen(port, () => {
        console.log(`API gateway listening at http://localhost:${port}`);
    });
})();
