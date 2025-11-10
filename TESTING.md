# Testing Strategy - WCAG Accessibility Auditor

## Overview

This document outlines the comprehensive testing strategy for the WCAG 2.2 AA Accessibility Auditor. The testing approach follows industry best practices with unit tests, integration tests, and end-to-end tests to ensure production readiness.

## Testing Philosophy

- **Quality First**: 85%+ code coverage with meaningful tests
- **Best Practices**: Clean, maintainable test code following AAA pattern (Arrange, Act, Assert)
- **Realistic Testing**: Tests use realistic fixtures and scenarios
- **Fast Feedback**: Unit tests run quickly (<5s), integration tests acceptable (<30s)
- **Production Ready**: All tests must pass before deployment

## Testing Pyramid

```
       /\
      /E2E\        End-to-End Tests (5-10%)
     /------\      - Complete workflow tests
    /  INT  \     Integration Tests (20-30%)
   /----------\    - API endpoint tests
  /    UNIT   \   Unit Tests (60-75%)
 /--------------\  - Individual module tests
```

## Test Coverage Targets

| Category | Target | Current |
|----------|--------|---------|
| Statements | 85% | 46.71% |
| Branches | 80% | 66.75% |
| Functions | 85% | 89.77% ✓ |
| Lines | 85% | 46.71% |

## Test Structure

### Unit Tests (`tests/`)

**Utilities** (100% coverage required):
- ✓ `url.spec.ts` - URL normalization and validation
- ✓ `validation.spec.ts` - Zod schema validation
- ✓ `logger.spec.ts` - Logging functionality
- ✓ `config.spec.ts` - Configuration loading
- ✓ `stability.spec.ts` - Page stability detection

**Core Modules** (85%+ coverage target):
- ✓ `crawler.spec.ts` - Web crawling logic
- ✓ `auditor.spec.ts` - Enhanced WCAG auditor
- ✓ `pdf.spec.ts` - PDF report generation
- ⚠️ `server.spec.ts` - **MISSING** - Express server and Socket.IO
- ⚠️ `pdf-pro.spec.ts` - **MISSING** - Professional PDF generator

### Integration Tests (`tests/integration/`)

**API Endpoints**:
- ⚠️ `api.integration.spec.ts` - **NEW** - REST API testing
  - POST /api/audit (request validation, job creation)
  - GET /api/health (health check)
  - GET /api/metrics (metrics endpoint)
  - GET /api/download/:filename (file download)
  - Rate limiting behavior
  - Error responses

**Socket.IO Events**:
- ⚠️ `socketio.integration.spec.ts` - **NEW** - Real-time event testing
  - Connection handling
  - Progress events
  - Complete events
  - Error events
  - Resume functionality

### End-to-End Tests (`tests/e2e/`)

**Complete Workflows**:
- ⚠️ `audit-workflow.e2e.spec.ts` - **NEW** - Full audit process
  - Start audit → Crawl pages → Run audits → Generate PDF
  - Socket.IO progress updates
  - Report download
  - Job cleanup

## Test Fixtures

### HTML Test Pages (`tests/fixtures/`)

- ✓ `test-page.html` - Page with accessibility issues
- ✓ `page2.html` - Secondary page for crawling
- ⚠️ `perfect-page.html` - **NEW** - Page with no violations
- ⚠️ `spa-page.html` - **NEW** - Single-page app simulation

### Mock Data (`tests/fixtures/`)

- ⚠️ `mock-audit-reports.ts` - **NEW** - Realistic audit report data
- ⚠️ `mock-violations.ts` - **NEW** - Various violation types

## Testing Commands

```bash
# Run all tests in watch mode (development)
npm test

# Run tests once with coverage (CI)
npm run test:ci

# Generate detailed coverage report
npm run coverage

# Type check tests
npm run typecheck
```

## Test Patterns

### AAA Pattern (Arrange, Act, Assert)

```typescript
it('should validate URLs correctly', () => {
  // Arrange: Set up test data
  const validUrl = 'https://example.com';

  // Act: Execute the function
  const result = normalizeUrl(validUrl);

  // Assert: Verify the result
  expect(result).toBe('https://example.com/');
});
```

### Async Testing with Playwright

```typescript
it('should crawl pages successfully', async () => {
  const browser = await chromium.launch();
  try {
    // Test implementation
  } finally {
    await browser.close(); // Always cleanup
  }
});
```

### Mock External Dependencies

```typescript
import { vi } from 'vitest';

const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
};
```

## Test Data Management

### Realistic Test Data

All test fixtures use realistic data:
- Real URLs from test servers
- Actual HTML with accessibility issues
- Proper WCAG violation structures
- Realistic performance metrics

### Test Isolation

Each test should:
- Be independent (no shared state)
- Clean up after itself (close browsers, delete temp files)
- Use unique identifiers (avoid conflicts)

## CI/CD Integration

### GitHub Actions Workflow

```yaml
- name: Run Tests
  run: npm run test:ci

- name: Check Coverage
  run: |
    if [ $(jq .total.lines.pct coverage/coverage-summary.json) -lt 85 ]; then
      exit 1
    fi
```

### Pre-commit Hooks (Optional)

```bash
# .husky/pre-commit
npm run typecheck
npm test -- --run
```

## Coverage Gaps Analysis

### Current Gaps (to be addressed)

1. **server.ts** (0% coverage)
   - Express route handlers
   - Socket.IO event handlers
   - Job queue management
   - Rate limiting
   - Error handling

2. **PDF Generators** (partial coverage)
   - Edge cases (empty reports, large reports)
   - Error handling (file system errors)
   - All rendering paths

3. **Integration Testing** (missing)
   - Full API workflows
   - Socket.IO communication
   - File uploads/downloads

4. **E2E Testing** (missing)
   - Complete audit workflows
   - Error recovery
   - Concurrent job handling

## Implementation Plan

### Phase 1: Server Unit Tests
- [ ] Request validation tests
- [ ] Route handler tests (mocked dependencies)
- [ ] Socket.IO event tests
- [ ] Job queue management tests
- [ ] Rate limiting tests

### Phase 2: Integration Tests
- [ ] API endpoint integration tests
- [ ] Socket.IO real-time communication tests
- [ ] File system interaction tests

### Phase 3: E2E Tests
- [ ] Full audit workflow test
- [ ] Error recovery test
- [ ] Concurrent job handling test

### Phase 4: Coverage Optimization
- [ ] Identify remaining gaps with coverage report
- [ ] Add targeted tests for uncovered lines
- [ ] Achieve 85%+ coverage target

## Best Practices

### Do ✓
- Write descriptive test names (`it('should validate URLs correctly')`)
- Test both success and error paths
- Use realistic test data
- Clean up resources (browsers, files)
- Mock external dependencies (network, file system)
- Keep tests fast (avoid unnecessary delays)
- Follow the testing pyramid (more unit tests, fewer E2E)

### Don't ✗
- Don't test implementation details (test behavior)
- Don't share state between tests
- Don't use real external services (mock them)
- Don't ignore flaky tests (fix them)
- Don't skip cleanup code
- Don't write brittle tests (too tightly coupled)

## Debugging Tests

### Run Single Test File
```bash
npm test tests/server.spec.ts
```

### Run Single Test
```bash
npm test -t "should validate URLs correctly"
```

### Enable Debug Logging
```bash
LOG_LEVEL=debug npm test
```

### View Coverage Report
```bash
npm run coverage
open coverage/index.html
```

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Testing](https://playwright.dev/docs/test-runners)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
- [WCAG 2.2 Guidelines](https://www.w3.org/WAI/WCAG22/quickref/)

## Maintenance

### Update Test Fixtures
When adding new WCAG rules or changing audit logic:
1. Update `tests/fixtures/test-page.html` with new violations
2. Update expected results in `auditor.spec.ts`
3. Regenerate expected PDF outputs if needed

### Refactoring Tests
When code structure changes:
1. Update tests to match new API
2. Maintain test coverage percentage
3. Run full test suite to ensure no regressions
4. Update this documentation

---

**Last Updated**: 2025-11-07
**Coverage Target**: 85% statements, 80% branches, 85% functions
**Current Status**: In Progress (Phase 1)
