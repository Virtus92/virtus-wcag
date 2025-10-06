const { WCAGAuditor } = require('./dist/auditor.js');

async function test() {
    console.log('Testing auditor with problematic URLs...\n');

    const auditor = new WCAGAuditor();
    await auditor.initialize();

    const testUrls = [
        'https://virtus-umbra.ai/about',
        'https://virtus-umbra.ai/auth/login',
        'https://virtus-umbra.ai/auth/sign-up'
    ];

    for (const url of testUrls) {
        console.log(`\nTesting: ${url}`);
        console.log('='.repeat(60));

        try {
            const startTime = Date.now();
            const result = await auditor.auditPage(url);
            const duration = Date.now() - startTime;

            console.log(`✅ SUCCESS (${duration}ms)`);
            console.log(`   Title: ${result.title}`);
            console.log(`   Violations: ${result.violations.length}`);
            console.log(`   Passes: ${result.passes}`);
        } catch (error) {
            console.log(`❌ FAILED: ${error.message}`);
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    await auditor.close();
    console.log('\n✅ Test complete!');
}

test().catch(console.error);
