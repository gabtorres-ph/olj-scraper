import * as dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const ConfigSchema = z.object({
    targetUrl: z.url(),
    headless: z.boolean(),
    maxPages: z.number().int().positive(),
    scrapeDetails: z.boolean(),
    outputJson: z.string().trim().min(1),
    outputCsv: z.string().trim().min(1),
});

export type Config = z.infer<typeof ConfigSchema>;

// skipped all the parsing funcs go straight to loading the config

export function loadConfig(): Config {
    const targetUrl = process.env.TARGET_URL;
    const headless = process.env.HEADLESS;
    const maxPages = process.env.MAX_PAGES;
    const scrapeDetails = process.env.SCRAPE_DETAILS;

    const outputJson = process.env.OUTPUT_JSON;
    const outputCsv = process.env.OUTPUT_CSV;

    const rawConfig = {
        targetUrl,
        headless,
        maxPages,
        scrapeDetails,
        outputJson,
        outputCsv,
    };

    return ConfigSchema.parse(rawConfig);
}

export function getConfigSummary(config: Config = loadConfig()) {
    return {
        targetUrl: config.targetUrl,
        headless: config.headless,
        maxPages: config.maxPages,
        scrapeDetails: config.scrapeDetails,
        outputJson: config.outputJson,
        outputCsv: config.outputCsv
    };
}