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
    ["/households", "/energy_usages", "/locations"],
    createProxyMiddleware({
        target: "https://energy-household-api.onrender.com",
        changeOrigin: true,
        pathRewrite: (path, req) => {
            if (path.startsWith("/households")) {
                return path.replace("/households", "/households");
            } else if (path.startsWith("/energy_usages")) {
                return path.replace("/energy_usages", "/energy_usages");
            } else if (path.startsWith("/locations")) {
                return path.replace("/locations", "/locations");
            }
        },
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

app.get("/household_info/:household_id", async (req, res) => {
    try {
        const household_id = req.params.household_id;

        const [householdRes, usageRes] = await Promise.all([
            fetch(
                `https://energy-household-api.onrender.com/households/${household_id}`
            ),
            fetch(
                `https://energy-household-api.onrender.com/energy_usages?household_id=${household_id}`
            ),
        ]);

        const [householdText, usagesText] = await Promise.all([
            householdRes.text(),
            usageRes.text(),
        ]);

        const [household, usages] = [
            JSON.parse(householdText),
            JSON.parse(usagesText),
        ];

        const [locationRes, providerRes] = await Promise.all([
            fetch(
                `https://energy-household-api.onrender.com/locations/${household.location_id}`
            ),
            fetch(
                `https://energy-provider-api.onrender.com/providers/${household.provider_id}`
            ),
        ]);

        const [locationText, providerText] = await Promise.all([
            locationRes.text(),
            providerRes.text(),
        ]);

        const [location, provider] = [
            JSON.parse(locationText),
            JSON.parse(providerText),
        ];

        res.json({
            household,
            location,
            provider,
            usages,
        });
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal server error");
    }
});

app.get("/provider_pricing/:provider_id", async (req, res) => {
    try {
        const provider_id = req.params.provider_id;

        const [providerRes, pricingTiersRes] = await Promise.all([
            fetch(
                `https://energy-provider-api.onrender.com/providers/${provider_id}`
            ),
            fetch(
                `https://energy-provider-api.onrender.com/pricing_tiers?provider_id=${provider_id}`
            ),
        ]);

        const [provider, pricingTiers] = await Promise.all([
            providerRes.json(),
            pricingTiersRes.json(),
        ]);

        res.json({
            provider,
            pricingTiers,
        });
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal server error");
    }
});

(async () => {
    // Load fetch
    fetch = await import("node-fetch").then((module) => module.default);

    // Start the server
    app.listen(port, () => {
        console.log(`API gateway listening at http://localhost:${port}`);
    });
})();
