const express = require('express');
const { chromium } = require('playwright');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
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

app.post('/calculate-budget', async (req, res) => {
    const { zipCode, industry, leadsPerMonth } = req.body;
    
    // Input validation
    if (!zipCode || !industry || !leadsPerMonth) {
        return res.status(400).json({
            success: false,
            error: 'Missing required parameters. Please provide zipCode, industry, and leadsPerMonth.'
        });
    }

    if (!VALID_INDUSTRIES.includes(industry)) {
        return res.status(400).json({
            success: false,
            error: 'Invalid industry. Please select from the provided list of industries.'
        });
    }

    if (leadsPerMonth < 1 || leadsPerMonth > 10000) {
        return res.status(400).json({
            success: false,
            error: 'Leads per month must be between 1 and 10000.'
        });
    }

    let browser;
    try {
        console.log('Starting budget calculation for:', { zipCode, industry, leadsPerMonth });
        
        browser = await chromium.launch({
            headless: true // Run in headless mode for production
        });

        const context = await browser.newContext();
        const page = await context.newPage();

        // Navigate to the calculator page
        console.log('Navigating to LSA calculator...');
        await page.goto('https://business.google.com/us/ad-solutions/local-service-ads/#:~:text=Calculate%20your-,budget,-Enter%20Postal%20code', {
            waitUntil: 'networkidle',
            timeout: 30000
        });

        // Wait for the page to load
        await page.waitForTimeout(2000);

        // Fill ZIP code using exact XPath
        console.log('Filling ZIP code:', zipCode);
        const zipCodeXPath = '/html/body/main/div/section[4]/div/div[4]/div/div/div[1]/label[1]/input';
        await page.waitForSelector(`xpath=${zipCodeXPath}`, { state: 'visible', timeout: 2000 });
        const zipInput = await page.locator(`xpath=${zipCodeXPath}`);
        await zipInput.fill(zipCode);
        await zipInput.press('Tab'); // Trigger any validation

        // Fill leads per month using exact XPath
        console.log('Setting leads per month:', leadsPerMonth);
        const leadsXPath = '/html/body/main/div/section[4]/div/div[4]/div/div/div[1]/label[2]/input';
        await page.waitForSelector(`xpath=${leadsXPath}`, { state: 'visible', timeout: 2000 });
        const leadsInput = await page.locator(`xpath=${leadsXPath}`);
        await leadsInput.fill(leadsPerMonth.toString());
        await leadsInput.press('Tab'); // Trigger any validation

        // Updated industry selection logic with click outside
        console.log('Selecting industry:', industry);
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
        console.log('Clicking estimate button...');
        const estimateButton = await page.getByRole('button', { name: /estimate budget/i });
        await estimateButton.click();

        // Wait for results with more detailed logging
        console.log('Waiting for results...');
        try {
            // Take a screenshot before waiting for results
            await page.screenshot({ path: 'before-results.png' });
            
            // Wait for any loading indicators to disappear
            await page.waitForTimeout(2000);

            // Extract budget information
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

                console.log('Found values:', { minBudget, maxBudget, estimatedLeads });

                if (!minBudget || !maxBudget || !estimatedLeads) {
                    throw new Error('Could not extract budget information');
                }

                return {
                    min: parseInt(minBudget.replace(/[^0-9]/g, '')),
                    max: parseInt(maxBudget.replace(/[^0-9]/g, '')),
                    leads: parseInt(estimatedLeads.match(/\d+/)[0])
                };
            });

            // Take a screenshot after extraction
            await page.screenshot({ path: 'after-results.png' });

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

            await browser.close();
            console.log('Calculation completed successfully');
            res.json(response);

        } catch (error) {
            console.error('Error extracting results:', error);
            
            // Take a screenshot of the error state
            await page.screenshot({ path: 'error-state.png' });
            
            // Get the page HTML for debugging
            const html = await page.content();
            console.error('Page HTML at error:', html);
            
            throw error;
        }

    } catch (error) {
        console.error('Error occurred:', error);
        
        if (browser) {
            try {
                // Take error screenshot
                const page = await browser.newPage();
                await page.screenshot({ path: 'error-screenshot.png' });
                await browser.close();
            } catch (e) {
                console.error('Failed to take error screenshot:', e);
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
    res.json({ 
        status: 'ok',
        timestamp: new Date().toISOString()
    });
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
    console.log(`Health check available at http://localhost:${port}/health`);
});
