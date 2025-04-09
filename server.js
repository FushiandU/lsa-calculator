const express = require('express');
const { chromium } = require('playwright');
const cors = require('cors');
const morgan = require('morgan');
const logger = require('./logger');
const app = express();

// Enable HTTP request logging
app.use(morgan('combined'));

// Enable CORS for all routes
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));

app.use(express.json());

// List of valid industries from Google LSA
const VALID_INDUSTRIES = [
    'Acupuncturist', 'Allergist', 'Animal shelter', 'Appliance repair', 'Architect',
    'Audiologist', 'Auto body shop', 'Auto repair shop', 'Bankruptcy lawyer', 'Barber shop',
    'Beauty school', 'Business lawyer', 'Car repair', 'Car wash and detailing', 'Carpenter',
    'Carpet cleaning', 'Cellphone and laptop repair', 'Child care', 'Chiropractor', 'Contract lawyer',
    'Countertop pro', 'Criminal lawyer', 'Dance instructor', 'Dentist', 'Dermatologist',
    'Dietitian', 'Disability lawyer', 'Drain expert', 'Driving instructor', 'Dui lawyer',
    'Electrician', 'Estate lawyer', 'Event planner', 'Family lawyer', 'Fencing pro',
    'Financial planner', 'First aid trainer', 'Flooring pro', 'Foundation pro', 'Funeral home',
    'Garage door pro', 'General contractor', 'Hair removal', 'Hair salon', 'Handyman',
    'Home inspector', 'Home insulation', 'Home security', 'Home theater', 'House cleaner',
    'HVAC', 'Immigration lawyer', 'Insurance agency', 'Interior designer', 'Ip lawyer',
    'Junk removal', 'Labor lawyer', 'Landscaper', 'Language instructor', 'Lawn care',
    'Lawyer', 'Litigation Lawyer', 'Locksmith', 'Malpractice lawyer', 'Massage school',
    'Massage therapist', 'Medical spa', 'Mover', 'Nail salon', 'Occupational therapist',
    'Ophthalmologist', 'Optometrist', 'Orthodontist', 'Orthopedic surgeon', 'Painter',
    'Personal injury lawyer', 'Personal trainer', 'Pest control', 'Pet adoption', 'Pet boarding',
    'Pet grooming', 'Pet trainer', 'Photographer', 'Physiotherapist', 'Piercing studio',
    'Plastic surgeon', 'Plumber', 'Podiatrist', 'Pool cleaner', 'Pool contractor',
    'Preschool', 'Primary Care', 'Real estate agent', 'Real estate lawyer', 'Roofer',
    'Sewage pro', 'Siding pro', 'Snow removal', 'Solar energy contractor', 'Storage',
    'Tattoo studio', 'Tax lawyer', 'Tax specialist', 'Tire shop', 'Towing',
    'Towing pro', 'Traffic lawyer', 'Tree service', 'Tutor', 'Veterinarian',
    'Videographer', 'Water damage', 'Weight loss service', 'Window cleaner', 'Window repair',
    'Windshield repair pro', 'Yoga instructor'
];

// Initialize browser instance outside request handler
let browserPromise = null;

async function getBrowser() {
    if (!browserPromise) {
        logger.info('Initializing new browser instance');
        browserPromise = chromium.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
    }
    return browserPromise;
}

app.post('/calculate-budget', async (req, res) => {
    const { zipCode, industry, leadsPerMonth } = req.body;
    
    logger.info('Received budget calculation request', {
        zipCode,
        industry,
        leadsPerMonth
    });

    // Input validation
    if (!zipCode || !industry || !leadsPerMonth) {
        logger.warn('Missing required parameters', { body: req.body });
        return res.status(400).json({
            success: false,
            error: 'Missing required parameters. Please provide zipCode, industry, and leadsPerMonth.'
        });
    }

    if (!VALID_INDUSTRIES.includes(industry)) {
        logger.warn('Invalid industry provided', { industry });
        return res.status(400).json({
            success: false,
            error: 'Invalid industry. Please select from the provided list of industries.'
        });
    }

    if (leadsPerMonth < 1 || leadsPerMonth > 10000) {
        logger.warn('Invalid leads per month value', { leadsPerMonth });
        return res.status(400).json({
            success: false,
            error: 'Leads per month must be between 1 and 10000.'
        });
    }

    let browser;
    try {
        logger.info('Starting budget calculation', {
            zipCode,
            industry,
            leadsPerMonth
        });
        
        browser = await getBrowser();
        const context = await browser.newContext();
        const page = await context.newPage();

        logger.info('Navigating to LSA calculator');
        await page.goto('https://business.google.com/us/ad-solutions/local-service-ads/#:~:text=Calculate%20your-,budget,-Enter%20Postal%20code', {
            waitUntil: 'networkidle',
            timeout: 30000
        });

        // Wait for the page to load
        await page.waitForTimeout(2000);

        // Fill ZIP code using exact XPath
        logger.info('Filling ZIP code', { zipCode });
        const zipCodeXPath = '/html/body/main/div/section[4]/div/div[4]/div/div/div[1]/label[1]/input';
        await page.waitForSelector(`xpath=${zipCodeXPath}`, { state: 'visible', timeout: 2000 });
        const zipInput = await page.locator(`xpath=${zipCodeXPath}`);
        await zipInput.fill(zipCode);
        await zipInput.press('Tab'); // Trigger any validation

        // Fill leads per month using exact XPath
        logger.info('Setting leads per month', { leadsPerMonth });
        const leadsXPath = '/html/body/main/div/section[4]/div/div[4]/div/div/div[1]/label[2]/input';
        await page.waitForSelector(`xpath=${leadsXPath}`, { state: 'visible', timeout: 2000 });
        const leadsInput = await page.locator(`xpath=${leadsXPath}`);
        await leadsInput.fill(leadsPerMonth.toString());
        await leadsInput.press('Tab'); // Trigger any validation

        // Updated industry selection logic with click outside
        logger.info('Selecting industry', { industry });
        const industryXPath = '//*[@id="industry-myselect"]';
        await page.waitForSelector(`xpath=${industryXPath}`, { state: 'visible', timeout: 2000 });
        const industrySelect = await page.locator(`xpath=${industryXPath}`);
        await industrySelect.click();
        await page.waitForTimeout(500);
        
        // Type the industry name
        await page.keyboard.type(industry);
        await page.waitForTimeout(500);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(500);
        
        // Click outside the dropdown to close it
        await page.mouse.click(0, 0); // Click at the top-left corner
        await page.waitForTimeout(100);

        // Click estimate button and wait for results
        logger.info('Clicking estimate button');
        const estimateButton = await page.getByRole('button', { name: /estimate budget/i });
        await estimateButton.click();

        // Wait for results with more detailed logging
        logger.info('Waiting for results');
        try {
            // Take a screenshot before waiting for results
            logger.debug('Taking pre-results screenshot');
            await page.screenshot({ path: '/tmp/before-results.png' });
            
            // Wait for any loading indicators to disappear
            await page.waitForTimeout(2000);

            // Extract budget information
            logger.info('Extracting budget information');
            const budgetData = await page.evaluate(() => {
                // Helper function to safely extract text content
                const getTextContent = (selector) => {
                    const element = document.querySelector(selector);
                    return element ? element.textContent.trim() : null;
                };

                // Try multiple possible selectors
                const minBudget = 
                    getTextContent('.min') || 
                    getTextContent('[data-testid="min-budget"]') ||
                    getTextContent('.lsa-calculator-module__min');
                
                const maxBudget = 
                    getTextContent('.max') || 
                    getTextContent('[data-testid="max-budget"]') ||
                    getTextContent('.lsa-calculator-module__max');
                
                const estimatedLeads = 
                    getTextContent('.budget') || 
                    getTextContent('[data-testid="estimated-leads"]') ||
                    getTextContent('.lsa-calculator-module__leads');

                logger.info('Found values', { minBudget, maxBudget, estimatedLeads });

                if (!minBudget || !maxBudget || !estimatedLeads) {
                    throw new Error('Could not extract budget information');
                }

                return {
                    min: parseInt(minBudget.replace(/[^0-9]/g, '')),
                    max: parseInt(maxBudget.replace(/[^0-9]/g, '')),
                    leads: parseInt(estimatedLeads.match(/\d+/)[0])
                };
            });

            logger.debug('Taking post-results screenshot');
            await page.screenshot({ path: '/tmp/after-results.png' });

            // Calculate cost per lead
            const avgBudget = (budgetData.min + budgetData.max) / 2;
            const costPerLead = Math.round(avgBudget / budgetData.leads);

            // Format response
            const response = {
                success: true,
                budget: {
                    min: budgetData.min,
                    max: budgetData.max,
                    currency: 'USD',
                    frequency: 'monthly'
                },
                leads: {
                    requested: leadsPerMonth,
                    estimated: budgetData.leads,
                    costPerLead
                },
                location: {
                    zipCode,
                    available: true
                },
                industry
            };

            await context.close();
            logger.info('Calculation completed successfully', { response });
            res.json(response);

        } catch (error) {
            logger.error('Error extracting results', {
                error: error.message,
                stack: error.stack
            });
            
            await page.screenshot({ path: '/tmp/error-state.png' });
            const html = await page.content();
            logger.debug('Page HTML at error', { html });
            
            throw error;
        }

    } catch (error) {
        logger.error('Error occurred during calculation', {
            error: error.message,
            stack: error.stack
        });
        
        if (browser) {
            try {
                const context = await browser.newContext();
                const page = await context.newPage();
                await page.screenshot({ path: '/tmp/error-screenshot.png' });
                await context.close();
            } catch (e) {
                logger.error('Failed to take error screenshot', {
                    error: e.message
                });
            }
        }

        res.status(500).json({
            success: false,
            error: 'Failed to calculate budget. Please try again later.',
            details: error.message
        });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    logger.info('Health check requested');
    res.json({ 
        status: 'ok',
        timestamp: new Date().toISOString()
    });
});

// Export the Express app for serverless deployment
module.exports = app;

// Only listen if running directly (not in serverless)
if (require.main === module) {
    const port = process.env.PORT || 3000;
    app.listen(port, () => {
        logger.info(`Server running on port ${port}`);
        logger.info(`Health check available at http://localhost:${port}/health`);
    });
}
