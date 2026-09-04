import { getConfigSummary, loadConfig } from "./config.js";

const config = loadConfig();

console.info("Scraper config loaded:", getConfigSummary(config));