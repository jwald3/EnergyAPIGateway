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
    ["/providers", "/pricing_tiers"],
    createProxyMiddleware({
        target: "https://energy-provider-api.onrender.com",
        changeOrigin: true,
        pathRewrite: (path, req) => {
            if (path.startsWith("/providers")) {
                return path.replace("/providers", "/providers");
            } else if (path.startsWith("/pricing_tiers")) {
                return path.replace("/pricing_tiers", "/pricing_tiers");
            }
        },
    })
);
app.use(
    ["/regions", "/states"],
    createProxyMiddleware({
        target: "https://energy-region-api-js.onrender.com",
        changeOrigin: true,
        pathRewrite: (path, req) => {
            if (path.startsWith("/regions")) {
                return path.replace("/regions", "/regions");
            } else if (path.startsWith("/states")) {
                return path.replace("/states", "/states");
            }
        },
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
