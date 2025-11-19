# Master Orchestration Instructions

## Project Goal
Develop a production-ready REST API service for controlling physical cabinets via serial port communication.

---

## Quick Reference

| What | Where |
|------|-------|
| Agent Prompts | `@agents/*.md` |
| Shared Schemas | `@agents/schemas/*.md` |
| This Instruction | `@instructions_new/MASTER_ORCHESTRATION.md` |
| Handoff Files | `handoff-{AgentName}.json` (root) |

---

## Functional Requirements

### API Endpoints (4 Total)
1. **GET** `/api/v1/health` - Health check
2. **GET** `/api/v1/cabinet/status` - Get status of all cabinets
3. **POST** `/api/v1/cabinet/open` - Open selected cabinets
   - Body: `{"cabinetIds": [1, 2, 3]}`
4. **POST** `/api/v1/cabinet/reset` - Reset cabinet

### Non-Functional Requirements
- **Port:** 80 (configurable via .env)
- **Protocol:** HTTP (no TLS required)
- **Authentication:** None (v1 - internal network assumption)
- **Rate Limiting:** None (v1 - to be added later)
- **Performance:** <100ms response time for non-serial operations
- **Reliability:** Server runs even if serial port unavailable

---

## Technical Stack

### Backend
- **Runtime:** Node.js 16+
- **Framework:** Express 4.18.2
- **Serial Communication:** SerialPort 13.0.0
- **Configuration:** dotenv 16.0.3
- **Module System:** ES6 modules (type: "module" in package.json)

### Testing
- **Framework:** Vitest 1.0.0
- **API Testing:** Supertest 6.3.3
- **Coverage:** 90%+ required

### Documentation
- **Format:** Markdown
- **API Spec:** OpenAPI 3.0.3 (Swagger)

---

## Serial Protocol Specification

### Frame Structure
```
[Header1] [Header2] [Length] [Address] [Instruction] [Data...] [CRC8]
  0xAA      0x55    1 byte    0x00      0x50/0x51   N bytes   1 byte
```

### Instructions
- **0x50**: Open Cabinet(s) - Data: [cabinet_id_1, cabinet_id_2, ...]
- **0x51**: Request Status - Data: [] - Response: 6 bytes status

### CRC8
- **Polynomial:** 0x07
- **Initial Value:** 0x00
- **XOR Output:** Yes
- **Scope:** All bytes except header1, header2, and CRC itself

### Timing Constraints
- **Delay between sends:** 1000ms (MUST enforce - hardware limitation)
- **Response timeout:** 2000ms
- **Baud rate:** 9600

---

## Agent Orchestration

### Orchestration Pattern: Iterative Pipeline with Smart Routing

**Mode:** Iterative Refinement with Quality Gates
**Max Pipeline Iterations:** 3 (full loops from BackendBuilder)
**Per-Agent Max Retries:** 3

```
┌─────────────────────────────────────────────────────────────┐
│  [Define Requirements] (this file)                          │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
         ┌─────────────────────────────┐
         │  Iteration Counter = 0      │
         └─────────────┬───────────────┘
                       ↓
    ┌──────────────────────────────────────────┐
    │  [BackendBuilder] - Implement API        │
    │  Context: Previous iteration issues      │
    └──────────────┬───────────────────────────┘
                   ↓
        Quality Gate: Lint passes?
              ├─ NO → Retry BackendBuilder (max 3x)
              │       If still fail → Human Intervention
              └─ YES ↓
    ┌──────────────────────────────────────────┐
    │  [TestAgent] - Write tests               │
    └──────────────┬───────────────────────────┘
                   ↓
        Quality Gate: Coverage >90% AND Tests Pass?
              ├─ NO → Analyze Failure Type:
              │       ├─ Bugs in code? → Loop to BackendBuilder
              │       │                   (iteration++, pass bug list)
              │       └─ Bad tests? → Retry TestAgent (max 3x)
              └─ YES ↓
    ┌──────────────────────────────────────────┐
    │  [CodeReviewer] - Code quality analysis  │
    └──────────────┬───────────────────────────┘
                   ↓
        Quality Gate: Critical issues = 0?
              ├─ NO → Loop to BackendBuilder
              │       (iteration++, pass critical issues)
              │       Max 2 iterations for code quality
              └─ YES ↓
    ┌──────────────────────────────────────────┐
    │  [SecurityScanner] - Security assessment │
    └──────────────┬───────────────────────────┘
                   ↓
        Quality Gate: Critical vulns = 0?
              ├─ NO → Loop to BackendBuilder
              │       (iteration++, pass security fixes)
              │       Max 2 iterations for security
              └─ YES ↓
    ┌──────────────────────────────────────────┐
    │  [DocumentationDynamo] - Generate docs   │
    └──────────────┬───────────────────────────┘
                   ↓
        Quality Gate: All 8 docs exist?
              ├─ NO → Retry DocumentationDynamo (max 2x)
              │       (No loop to BackendBuilder)
              └─ YES ↓
         ┌─────────────────────┐
         │  [COMPLETE]         │
         └─────────────────────┘
```

### Iteration Logic

#### Global Iteration Counter
- Tracks full pipeline loops (BackendBuilder → ... → SecurityScanner)
- Increments when any agent loops back to BackendBuilder
- **Max:** 3 full iterations
- **On Exceed:** Human intervention required

#### Per-Agent Retry Counter
- Tracks retries of single agent without looping back
- Resets when moving to next agent
- **Max:** 3 retries per agent
- **Applies to:** All agents

---

### Quality Gate Rules (Enhanced)

#### Quality Gate 1: After BackendBuilder
**Validation Command:** `npm run lint`

**Pass Criteria:**
- Exit code: 0
- Errors: 0
- Warnings: 0

**Failure Handling:**
```yaml
if FAIL:
  action: retry_current_agent
  max_retries: 3
  context_to_pass: lint error output
  if_still_failing:
    action: human_intervention
    escalation_message: "Lint errors persist after 3 attempts"
```

**Implementation:**
```javascript
let backendRetries = 0;
const MAX_RETRIES = 3;

while (backendRetries < MAX_RETRIES) {
  const result = await runAgent('BackendBuilder', {
    iteration: globalIteration,
    retryCount: backendRetries,
    previousErrors: backendRetries > 0 ? lintErrors : null
  });

  const lintResult = await runCommand('npm run lint');

  if (lintResult.exitCode === 0) {
    break; // Pass, proceed to TestAgent
  }

  backendRetries++;
  lintErrors = lintResult.output;
}

if (backendRetries >= MAX_RETRIES) {
  throw new Error('HUMAN_INTERVENTION_REQUIRED: Lint errors persist');
}
```

---

#### Quality Gate 2: After TestAgent
**Validation Command:** `npm test -- --coverage`

**Pass Criteria:**
- All tests pass (failures: 0)
- Line coverage: ≥90%
- Branch coverage: ≥85%

**Failure Handling with Smart Routing:**
```yaml
if FAIL:
  action: analyze_failure_type

  if failure_type == "BUGS_IN_CODE":
    action: loop_to_BackendBuilder
    increment: global_iteration++
    max_iterations: 3
    context_to_pass:
      - handoff-TestAgent.json
      - issues[] array with bug descriptions
      - file:line locations
    validation: global_iteration < 3

  elif failure_type == "INSUFFICIENT_TESTS":
    action: retry_current_agent
    max_retries: 3
    context_to_pass: coverage report

  elif failure_type == "FLAKY_TESTS":
    action: retry_current_agent
    max_retries: 2
    additional_check: run tests 10x to verify
```

**Implementation:**
```javascript
let testRetries = 0;

while (true) {
  const testResult = await runAgent('TestAgent', {
    iteration: globalIteration,
    retryCount: testRetries
  });

  const testOutput = await runCommand('npm test -- --coverage');

  if (testOutput.failures === 0 && testOutput.coverage >= 90) {
    break; // Pass, proceed to CodeReviewer
  }

  // Analyze failure type
  const failureType = analyzeTestFailure(testOutput, testResult);

  if (failureType === 'BUGS_IN_CODE') {
    // Loop back to BackendBuilder
    globalIteration++;

    if (globalIteration >= 3) {
      throw new Error('HUMAN_INTERVENTION_REQUIRED: Max iterations reached');
    }

    // Extract bugs from test failures
    const bugs = extractBugsFromTestFailures(testOutput);

    // Re-run BackendBuilder with bug context
    await runAgent('BackendBuilder', {
      iteration: globalIteration,
      bugs: bugs,
      previousHandoff: 'handoff-TestAgent.json'
    });

    // Re-run TestAgent
    testRetries = 0; // Reset retry counter
    continue; // Start over from TestAgent

  } else if (failureType === 'INSUFFICIENT_TESTS') {
    testRetries++;
    if (testRetries >= 3) {
      throw new Error('HUMAN_INTERVENTION_REQUIRED: Cannot achieve coverage');
    }
    continue; // Retry TestAgent
  }
}
```

**Failure Type Detection:**
```javascript
function analyzeTestFailure(testOutput, handoff) {
  // Check if tests are failing due to bugs in source code
  if (testOutput.failures > 0) {
    const failureReasons = testOutput.failures.map(f => f.message);

    // If assertion failures (expected X, got Y), it's likely a bug
    const assertionFailures = failureReasons.filter(r =>
      r.includes('expected') || r.includes('toBe') || r.includes('toEqual')
    );

    if (assertionFailures.length > 0) {
      return 'BUGS_IN_CODE';
    }
  }

  // Check if coverage is low
  if (testOutput.coverage < 90) {
    return 'INSUFFICIENT_TESTS';
  }

  // Check for flaky tests (random failures)
  if (handoff.issues.some(i => i.category === 'flaky')) {
    return 'FLAKY_TESTS';
  }

  return 'UNKNOWN';
}
```

---

#### Quality Gate 3: After CodeReviewer
**Validation Check:** `reports/CODE_REVIEW.md` critical issues = 0

**Pass Criteria:**
- Critical issues: 0
- High issues: <5 (documented)
- Code quality score: ≥8.0

**Failure Handling:**
```yaml
if critical_issues > 0:
  action: loop_to_BackendBuilder
  increment: global_iteration++
  max_iterations: 2  # Don't loop forever for code quality
  context_to_pass:
    - reports/CODE_REVIEW.md
    - reports/ISSUES.md (filtered to critical only)
    - Specific file:line locations
    - Remediation steps for each issue

if global_iteration >= 2:
  action: pass_with_warnings
  message: "Code quality issues documented, proceed to security scan"
```

**Implementation:**
```javascript
const reviewResult = await runAgent('CodeReviewer');

const criticalIssues = reviewResult.issues.filter(i => i.severity === 'critical');

if (criticalIssues.length > 0 && globalIteration < 2) {
  globalIteration++;

  // Loop back to BackendBuilder with issues to fix
  await runAgent('BackendBuilder', {
    iteration: globalIteration,
    codereview_issues: criticalIssues,
    action: 'fix_issues'
  });

  // Re-run pipeline from TestAgent (need to verify fixes work)
  await runAgent('TestAgent', { iteration: globalIteration });
  await runAgent('CodeReviewer', { iteration: globalIteration });

} else if (criticalIssues.length > 0 && globalIteration >= 2) {
  console.warn('Critical code quality issues remain after 2 iterations, documenting and proceeding');
}
```

---

#### Quality Gate 4: After SecurityScanner
**Validation Check:** `reports/SECURITY_REPORT.md` critical vulnerabilities = 0

**Pass Criteria:**
- Critical vulnerabilities: 0
- High vulnerabilities: <3 (with documented exceptions)
- Overall risk: MEDIUM or lower

**Failure Handling:**
```yaml
if critical_vulnerabilities > 0:
  action: loop_to_BackendBuilder
  increment: global_iteration++
  max_iterations: 2
  context_to_pass:
    - reports/SECURITY_REPORT.md
    - reports/VULNERABILITIES.md
    - CVE numbers and remediation steps
    - npm audit fix recommendations

if global_iteration >= 2 AND critical_vulnerabilities > 0:
  action: human_intervention
  escalation_level: HIGH
  message: "Critical security vulnerabilities remain after 2 fix attempts"
```

**Implementation:**
```javascript
const securityResult = await runAgent('SecurityScanner');

const criticalVulns = securityResult.vulnerabilities.filter(v => v.severity === 'critical');

if (criticalVulns.length > 0) {
  if (globalIteration < 2) {
    globalIteration++;

    // Loop back to BackendBuilder
    await runAgent('BackendBuilder', {
      iteration: globalIteration,
      security_fixes: criticalVulns,
      action: 'fix_vulnerabilities'
    });

    // Re-run entire pipeline to ensure fixes don't break anything
    await runAgent('TestAgent', { iteration: globalIteration });
    await runAgent('CodeReviewer', { iteration: globalIteration });
    await runAgent('SecurityScanner', { iteration: globalIteration });

  } else {
    throw new Error('CRITICAL_SECURITY_ISSUE: Vulnerabilities remain after 2 attempts');
  }
}
```

---

#### Quality Gate 5: After DocumentationDynamo
**Validation Check:** All 8 required documentation files exist

**Pass Criteria:**
- 8 markdown files created
- OpenAPI spec validates
- No broken links

**Failure Handling:**
```yaml
if missing_files > 0:
  action: retry_current_agent
  max_retries: 2
  note: "Documentation doesn't loop to BackendBuilder"

if still_missing_after_retries:
  action: human_intervention
  escalation_level: LOW
  message: "Documentation incomplete, manual completion required"
```

---

### Context Passing Between Iterations

When looping back to BackendBuilder, pass structured context:

```json
// Context passed to BackendBuilder on iteration 2+
{
  "iteration": 2,
  "loop_reason": "BUGS_FOUND_IN_TESTS",
  "source_agent": "TestAgent",
  "issues_to_fix": [
    {
      "id": "BUG-001",
      "severity": "high",
      "file": "src/services/cabinetService.js",
      "line": 245,
      "description": "Buffer overflow not protected when data exceeds 10KB",
      "test_that_failed": "tests/fault/serialPort.test.js:67",
      "expected_behavior": "Buffer should be cleared when exceeding MAX_BUFFER_SIZE",
      "remediation": "Add buffer size check before Buffer.concat()",
      "code_snippet": "this.responseBuffer = Buffer.concat([this.responseBuffer, data]);"
    }
  ],
  "previous_handoff": "handoff-TestAgent-iteration-1.json"
}
```

---

### Iteration Tracking

Create iteration-specific handoff files:

```
handoff-BackendBuilder-iteration-1.json
handoff-TestAgent-iteration-1.json
handoff-BackendBuilder-iteration-2.json  (if bugs found)
handoff-TestAgent-iteration-2.json
...
```

Each handoff includes:
```json
{
  "iteration": 2,
  "previous_iteration_issues": [...],
  "fixes_applied": [
    "Added buffer size limit check in cabinetService.js:245",
    "Extracted magic number 10240 to constants.js"
  ],
  "issues_resolved": ["BUG-001", "BUG-002"],
  "new_issues": []
}
```

---

### Stopping Conditions

**Success:**
- All quality gates pass
- No critical issues
- All deliverables complete

**Failure (Human Intervention Required):**
1. Global iteration counter ≥ 3
2. Critical security vulnerabilities after 2 fix attempts
3. Agent retry counter ≥ 3 (for same issue)
4. Same bug appears in 2+ iterations (infinite loop detection)

**Example:**
```javascript
// Infinite loop detection
const bugSignatures = new Set();

for (const bug of issues) {
  const signature = `${bug.file}:${bug.line}:${bug.description}`;

  if (bugSignatures.has(signature)) {
    throw new Error('INFINITE_LOOP_DETECTED: Same bug appearing multiple times');
  }

  bugSignatures.add(signature);
}
```

---

## Agent Execution Order

### Stage 1: Implementation (BackendBuilder)
**Prompt File:** `@agents/01_BackendBuilder.md`

**Inputs:**
- This master instruction file
- Project requirements (above)
- Serial protocol specification

**Outputs:**
- src/server.js
- src/routes/cabinetRoutes.js
- src/controllers/cabinetController.js
- src/services/cabinetService.js
- src/utils/serialPort.js
- src/utils/constants.js
- .env.example
- package.json
- Basic unit tests
- handoff-BackendBuilder.json

**Success Criteria:**
- [ ] Server starts successfully
- [ ] All 4 endpoints respond
- [ ] `npm run lint` passes with 0 errors
- [ ] Basic tests pass
- [ ] NO console.log in production code
- [ ] All magic numbers extracted to constants

**Validation Command:**
```bash
npm install && npm run lint && npm test
```

---

### Stage 2: Testing (TestAgent)
**Prompt File:** `@agents/02_TestAgent.md`

**Inputs:**
- handoff-BackendBuilder.json
- All src/ files from BackendBuilder
- Test requirements from handoff

**Outputs:**
- tests/unit/*.test.js
- tests/integration/*.test.js
- tests/stress/*.test.js
- tests/fault/*.test.js
- tests/TEST_RESULTS.md
- vitest.config.js
- handoff-TestAgent.json

**Success Criteria:**
- [ ] 90%+ line coverage, 85%+ branch coverage
- [ ] All 4 test categories implemented
- [ ] All 8+ edge cases tested
- [ ] Stress tests pass (100 concurrent requests)
- [ ] No flaky tests (10 consecutive runs pass)
- [ ] Execution time <2 minutes

**Validation Command:**
```bash
npm test -- --coverage --run
for i in {1..10}; do npm test || exit 1; done
```

---

### Stage 3: Code Review (CodeReviewer)
**Prompt File:** `@agents/04_CodeReviewer.md`

**Inputs:**
- handoff-TestAgent.json
- All src/ files

**Outputs:**
- reports/CODE_REVIEW.md
- reports/CODE_METRICS.json
- reports/ISSUES.md
- handoff-CodeReviewer.json

**Success Criteria:**
- [ ] All source files reviewed
- [ ] 0 critical issues
- [ ] <5 high-priority issues
- [ ] Code quality score >8.0/10
- [ ] All issues have remediation steps

**Validation Command:**
```bash
cat reports/CODE_REVIEW.md | grep "Critical Issues:" | grep " 0"
```

---

### Stage 4: Security Scan (SecurityScanner)
**Prompt File:** `@agents/05_SecurityScanner.md`

**Inputs:**
- handoff-CodeReviewer.json
- All src/ files
- package.json

**Outputs:**
- reports/SECURITY_REPORT.md
- reports/VULNERABILITIES.md
- reports/npm-audit.json
- handoff-SecurityScanner.json

**Success Criteria:**
- [ ] 0 critical vulnerabilities
- [ ] <3 high vulnerabilities
- [ ] OWASP Top 10 assessed
- [ ] npm audit run
- [ ] Overall risk: MEDIUM or lower

**Validation Command:**
```bash
npm audit --audit-level=high
cat reports/SECURITY_REPORT.md | grep "Critical Vulnerabilities:" | grep " 0"
```

---

### Stage 5: Documentation (DocumentationDynamo)
**Prompt File:** `@agents/03_DocumentationDynamo.md`

**Inputs:**
- handoff-SecurityScanner.json
- All src/, tests/, reports/ files

**Outputs:**
- README.md (updated)
- docs/ARCHITECTURE.md
- docs/API_REFERENCE.md
- docs/TROUBLESHOOTING.md
- docs/DEPLOYMENT.md
- docs/FAQ.md
- docs/swagger.yaml
- docs/swagger.json
- handoff-DocumentationDynamo.json

**Success Criteria:**
- [ ] All 8 required documentation files created
- [ ] FAQ has 15+ questions
- [ ] OpenAPI spec validates
- [ ] All cURL examples tested
- [ ] No broken links

**Validation Command:**
```bash
npx swagger-cli validate docs/swagger.yaml
ls README.md docs/ARCHITECTURE.md docs/API_REFERENCE.md docs/TROUBLESHOOTING.md docs/DEPLOYMENT.md docs/FAQ.md docs/swagger.yaml docs/swagger.json
```

---

## Shared Standards

### Response Format
All agents must follow: `@agents/schemas/response-format.md`

**Success:**
```json
{
  "status": "success",
  "data": { /* endpoint-specific */ },
  "timestamp": "2025-01-14T12:00:00.000Z"
}
```

**Error:**
```json
{
  "status": "error",
  "message": "Human-readable error",
  "timestamp": "2025-01-14T12:00:00.000Z"
}
```

### Handoff Format
All agents must follow: `@agents/schemas/handoff-format.md`

Each agent creates: `handoff-{AgentName}.json` with:
- Completion status
- Artifacts created
- Context for next agent
- Issues found
- Validation command

---

## Error Handling Strategy

### Input Validation Errors (400)
- Empty cabinet IDs array → "cabinetIds array cannot be empty"
- Non-array cabinetIds → "cabinetIds must be an array"
- Invalid cabinet ID <0 → "Cabinet ID X out of range (0-255)"
- Invalid cabinet ID >255 → "Cabinet ID X out of range (0-255)"
- Non-integer ID → "Cabinet ID must be an integer"

### Serial Port Errors (503)
- Port unavailable on startup → Server starts, operations return 503
- Port disconnects mid-operation → Log error, return 503

### Internal Errors (500)
- Unexpected exceptions → Log with stack trace, return generic message
- Serial timeout → Log, return 500
- Buffer overflow → Clear buffer, log, continue

### Error Messages
- **Production:** Generic ("Internal server error")
- **Development:** Detailed (with stack traces in logs, not responses)
- **Never expose:** File paths, stack traces, internal implementation

---

## Production Checklist

Before deploying to production, verify:

### Code Quality
- [ ] NO console.log statements in production code
- [ ] All magic numbers extracted to constants
- [ ] Zero linting errors
- [ ] Zero test failures
- [ ] >90% test coverage

### Security
- [ ] No hardcoded credentials
- [ ] Environment variables used for config
- [ ] Input validation on all endpoints
- [ ] Generic error messages (no internals exposed)
- [ ] npm audit shows 0 high/critical vulnerabilities

### Documentation
- [ ] README.md complete and accurate
- [ ] API examples tested and working
- [ ] Deployment guide complete
- [ ] Troubleshooting guide available

### Performance
- [ ] Non-serial endpoints respond <100ms
- [ ] Serial operations timeout at 2s
- [ ] Buffer limited to 10KB
- [ ] No memory leaks detected

---

## Deployment Context

### Target Environment
- **Network:** Internal trusted network (v1)
- **OS:** Linux (primary), Windows (secondary)
- **Deployment:** Docker Compose on localhost
- **Access:** LAN only (no internet exposure)

### Assumptions
- Serial port available at COM3 (Windows) or /dev/ttyUSB0 (Linux)
- Single instance (no clustering needed)
- No persistent storage required
- Cabinets respond within 2 seconds

---

## Success Metrics

### Overall Project Success
- [ ] All 4 API endpoints functional
- [ ] Server runs reliably for 24+ hours
- [ ] Test coverage >90%
- [ ] Zero critical bugs
- [ ] Zero critical security vulnerabilities
- [ ] All documentation complete

### Quality Targets
| Metric | Target | Measurement |
|--------|--------|-------------|
| Code Coverage | >90% | npm test --coverage |
| Linting Errors | 0 | npm run lint |
| Test Failures | 0 | npm test |
| Code Quality Score | >8.0/10 | CodeReviewer report |
| Security Risk | MEDIUM or lower | SecurityScanner report |
| Documentation Pages | 8+ | ls docs/*.md |

---

## Iteration and Feedback

### If Agent Fails Quality Gate
1. Document the failure in handoff.json
2. Set status to "FAIL" or "PASS_WITH_FIXES"
3. List specific issues in issues array
4. Re-run failed agent with error context
5. Maximum 3 retries per agent
6. If still failing, escalate to human

### Feedback Loop Example
```
BackendBuilder → PASS
TestAgent → PASS_WITH_FIXES (found 2 bugs)
  ↓
  Issue: Buffer overflow not protected
  Remediation: Add MAX_BUFFER_SIZE check
  ↓
BackendBuilder (re-run) → PASS (fixes applied)
TestAgent (re-run) → PASS
CodeReviewer → PASS
SecurityScanner → PASS_WITH_WARNINGS (no auth)
DocumentationDynamo → PASS
```

---

## Agent Communication Protocol

### Before Starting
1. Read previous agent's handoff-{Name}.json
2. Validate status = PASS or PASS_WITH_WARNINGS
3. Read artifacts list
4. Read context (design decisions, limitations, assumptions)
5. Run validation command

### During Execution
1. Follow agent prompt in @agents/{Number}_{Name}.md
2. Adhere to shared schemas in @agents/schemas/
3. Track progress against success criteria
4. Document issues as they are found

### After Completion
1. Create handoff-{Name}.json with all required fields
2. List all created artifacts
3. Provide context for next agent
4. Specify validation command
5. Calculate metrics (if applicable)

---

## File Organization

### Created by Agents
```
project-root/
├── src/                          (BackendBuilder)
│   ├── server.js
│   ├── routes/
│   ├── controllers/
│   ├── services/
│   └── utils/
├── tests/                        (TestAgent)
│   ├── unit/
│   ├── integration/
│   ├── stress/
│   └── fault/
├── docs/                         (DocumentationDynamo)
│   ├── ARCHITECTURE.md
│   ├── API_REFERENCE.md
│   ├── TROUBLESHOOTING.md
│   ├── DEPLOYMENT.md
│   ├── FAQ.md
│   ├── swagger.yaml
│   └── swagger.json
├── reports/                      (CodeReviewer, SecurityScanner)
│   ├── CODE_REVIEW.md
│   ├── SECURITY_REPORT.md
│   └── *.json
├── handoff-BackendBuilder.json   (Each agent)
├── handoff-TestAgent.json
├── handoff-CodeReviewer.json
├── handoff-SecurityScanner.json
├── handoff-DocumentationDynamo.json
├── .env.example                  (BackendBuilder)
├── package.json                  (BackendBuilder)
└── README.md                     (DocumentationDynamo)
```

### Reference (Do Not Modify)
```
@agents/                          (Agent prompts - READ ONLY)
├── 01_BackendBuilder.md
├── 02_TestAgent.md
├── 03_DocumentationDynamo.md
├── 04_CodeReviewer.md
├── 05_SecurityScanner.md
└── schemas/
    ├── response-format.md
    └── handoff-format.md

@instructions_new/                (This file - READ ONLY)
└── MASTER_ORCHESTRATION.md
```

---

## Start Execution

### Invocation Command
To start the agent pipeline, invoke the first agent:

```
Read @instructions_new/MASTER_ORCHESTRATION.md
Read @agents/01_BackendBuilder.md
Execute BackendBuilder agent
```

### Expected Timeline
- BackendBuilder: 8-10 hours
- TestAgent: 5-7 hours
- CodeReviewer: 2-3 hours
- SecurityScanner: 2-3 hours
- DocumentationDynamo: 4-5 hours
- **Total:** 21-28 hours

### Checkpoints
- After BackendBuilder: Server runs, lint passes
- After TestAgent: Coverage >90%, all tests pass
- After CodeReviewer: Quality score >8.0
- After SecurityScanner: No critical vulnerabilities
- After DocumentationDynamo: All docs complete

---

## Contact and Support

### Issue Reporting
If agents encounter ambiguities or blocking issues:
1. Document in handoff.json under issues array
2. Set status to PASS_WITH_WARNINGS or FAIL
3. Provide clear description of blocker
4. Suggest possible solutions

### Human Intervention Points
- Quality gate failures after 3 retries
- Critical ambiguities in requirements
- External dependencies unavailable
- Test hardware not accessible

---

**Version:** 2.0
**Created:** 2025-01-14
**Last Updated:** 2025-01-14
**Status:** Ready for execution
