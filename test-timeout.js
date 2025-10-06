const { chromium } = require('playwright');

async function testPage(url) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`Testing: ${url}`);
    console.log('='.repeat(80));

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
    });
    const page = await context.newPage();

    // Log console messages
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

    try {
        console.log('\n1. Trying domcontentloaded (45s timeout)...');
        const startTime = Date.now();

        const response = await page.goto(url, {
            waitUntil: 'domcontentloaded',
            timeout: 45000
        }).catch(err => {
            console.log('❌ domcontentloaded failed:', err.message);
            return null;
        });

        if (response) {
            const loadTime = Date.now() - startTime;
            console.log('✅ domcontentloaded SUCCESS');
            console.log('   Status:', response.status());
            console.log('   Final URL:', page.url());
            console.log('   Load time:', loadTime + 'ms');
            console.log('   Headers:', JSON.stringify(response.headers(), null, 2));
        } else {
            console.log('\n2. Trying with networkidle...');
            await page.goto(url, {
                waitUntil: 'networkidle',
                timeout: 30000
            }).catch(err => console.log('❌ networkidle also failed:', err.message));
        }

        console.log('\n3. Checking page state...');
        console.log('   Title:', await page.title());
        console.log('   ReadyState:', await page.evaluate(() => document.readyState));

        console.log('\n4. Checking for redirects/auth...');
        const finalUrl = page.url();
        if (finalUrl !== url) {
            console.log('   ⚠️  Redirect detected:', url, '→', finalUrl);
        }

        console.log('\n5. Checking for blocking elements...');
        const hasForm = await page.locator('form').count();
        const hasLogin = await page.locator('input[type="password"]').count();
        const hasCaptcha = await page.locator('[class*="captcha"], [id*="captcha"]').count();
        console.log('   Forms:', hasForm);
        console.log('   Login inputs:', hasLogin);
        console.log('   Captcha:', hasCaptcha);

        console.log('\n6. Network activity...');
        const requests = [];
        page.on('request', req => requests.push(req.url()));
        await page.waitForTimeout(3000);
        console.log('   Pending requests:', requests.slice(-5));

    } catch (error) {
        console.log('\n❌ CRITICAL ERROR:', error.message);
        console.log('Stack:', error.stack);
    } finally {
        await browser.close();
    }
}

(async () => {
    const urls = [
        'https://virtus-umbra.ai/about',
        'https://virtus-umbra.ai/auth/login',
        'https://virtus-umbra.ai/auth/sign-up'
    ];

    for (const url of urls) {
        await testPage(url);
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
})();
