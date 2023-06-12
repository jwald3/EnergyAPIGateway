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

app.get("/provider_customers", async (req, res) => {
    try {
        const { provider_id, region_id } = req.query;

        let params = new URLSearchParams();
        if (provider_id != null) {
            params.append("provider_id", provider_id);
        }

        if (region_id != null) {
            params.append("region_id", region_id);
        }
        

        const [householdRes, providerRes, regionRes, ] = await Promise.all([
            fetch(
                `https://energy-household-api.onrender.com/households?${params.toString()}`
            ),
            fetch(
                `https://energy-provider-api.onrender.com/providers/${provider_id}`
            ),
            fetch(
                `https://energy-region-api-js.onrender.com/regions`
            ),
            
        ]);

        const [householdText, providersText, regionsText] = await Promise.all([
            householdRes.text(),
            providerRes.text(),
            regionRes.text(),
        ]);
        
        const [household, providers, regions] = [
            JSON.parse(householdText),
            JSON.parse(providersText),
            JSON.parse(regionsText),
        ];

        console.log(providers)

        const jsonResponse = {
            "provider_id": providers.time,
            "provider_name": providers.provider_name,
            "currency": providers.currency,
            "unit": providers.unit,
            "customers": household
        }
        

        res.json(jsonResponse);

    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "There was an error fetching detailed energy usage data" })
    }
});


app.get("/detailed_energy/daily", async (req, res) => {
    try {
        const { household_id, date, year, month } = req.query;

        let params = new URLSearchParams();
        if (household_id != null) {
            params.append("household_id", household_id);
        }
        if (date != null) {
            params.append("date", date);
        }
        if (year != null) {
            params.append("year", year);
        }

        const [householdRes, usageRes, regionRes, stateRes] = await Promise.all([
            fetch(
                `https://energy-household-api.onrender.com/households/${household_id}`
            ),
            fetch(
                `https://energy-household-api.onrender.com/energy_usages/daily?${params.toString()}`
            ),
            fetch(
                `https://energy-region-api-js.onrender.com/regions`
            ),
            fetch(
                `https://energy-region-api-js.onrender.com/states`
            ),
        ]);

        const [householdText, usagesText, regionsText, statesText] = await Promise.all([
            householdRes.text(),
            usageRes.text(),
            regionRes.text(),
            stateRes.text(),
        ]);
        
        console.log(`Household text: ${householdText}`)

        const [household, usages, regions, states] = [
            JSON.parse(householdText),
            JSON.parse(usagesText),
            JSON.parse(regionsText),
            JSON.parse(statesText)
        ];

        const householdObject = {
            "household_id": household.household_id,
            "name": household.name,
            "provider_id": household.provider_id,
            "location_id": household.location_id,
            "street_address": household.street_address
        }

        const jsonResponse = usages.map((usage) => (
            {
                "time": usage.time,
                "energy_usage": usage.energy_usage,
                "count": usage.count,
                "household": householdObject
            }
        ))

        res.json(jsonResponse);

        // res.json({
        //     household,
        //     usages,
        //     regions,
        //     states
        // });

    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "There was an error fetching detailed energy usage data" })
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
