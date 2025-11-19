# Agent Prompts Directory

## Overview
This directory contains improved, production-ready agent prompts for the Cabinet Controller API project.

## Purpose
Each agent prompt is a comprehensive specification that:
- Defines the agent's role and expertise
- Provides complete context
- Lists explicit success criteria
- Specifies all deliverables
- Includes edge cases to handle
- Provides code style examples
- Defines handoff requirements

## Agent Files

### 01_BackendBuilder.md
**Role:** REST API Backend Implementation
**Expertise:** Node.js, Express, Serial Communication
**Inputs:** Project requirements, serial protocol spec
**Outputs:** Complete API server with routes, controllers, services
**Critical Tasks:**
- Implement 4 API endpoints
- Serial port communication with CRC8
- Input validation
- Error handling
- Extract all magic numbers to constants
- Remove all console.log statements

**Read this if:** You need to build or modify the backend server

---

### 02_TestAgent.md
**Role:** Comprehensive Test Coverage
**Expertise:** Unit Testing, Integration Testing, Stress Testing
**Inputs:** handoff-BackendBuilder.json, all src/ files
**Outputs:** 4 test categories (unit, integration, stress, fault)
**Critical Tasks:**
- Achieve 90%+ code coverage
- Test all 8+ edge cases
- Stress test with 100 concurrent requests
- Fault injection testing
- No flaky tests

**Read this if:** You need to write or improve tests

---

### 03_DocumentationDynamo.md
**Role:** Comprehensive Documentation
**Expertise:** Technical Writing, API Documentation, OpenAPI
**Inputs:** handoff-TestAgent.json, all src/ and tests/ files
**Outputs:** 8 documentation files including README, API Reference, Swagger
**Critical Tasks:**
- Create 8 required documentation files
- Write 15+ FAQ questions
- Generate OpenAPI 3.0.3 specification
- Test all cURL examples
- Create architecture diagrams

**Read this if:** You need to write or update documentation

---

### 04_CodeReviewer.md
**Role:** Code Quality and Static Analysis
**Expertise:** Code Review, Best Practices, Performance
**Inputs:** handoff-BackendBuilder.json, all src/ files
**Outputs:** CODE_REVIEW.md, CODE_METRICS.json, ISSUES.md
**Critical Tasks:**
- Review all source files
- Find quality issues (console.log, magic numbers, etc.)
- Calculate code quality score
- Categorize issues by severity
- Provide remediation steps

**Read this if:** You need to review code quality

---

### 05_SecurityScanner.md
**Role:** Security Vulnerability Assessment
**Expertise:** OWASP Top 10, Penetration Testing, Dependency Analysis
**Inputs:** handoff-CodeReviewer.json, all src/ files, package.json
**Outputs:** SECURITY_REPORT.md, VULNERABILITIES.md, npm-audit.json
**Critical Tasks:**
- Assess OWASP Top 10 vulnerabilities
- Run npm audit
- Check for injection vulnerabilities
- Review authentication/authorization
- Provide remediation steps

**Read this if:** You need to assess security

---

## Shared Schemas

### schemas/response-format.md
Defines the standard JSON response format all endpoints must follow.

**Success response:**
```json
{
  "status": "success",
  "data": { /* endpoint-specific */ },
  "timestamp": "ISO-8601"
}
```

**Error response:**
```json
{
  "status": "error",
  "message": "Human-readable error",
  "timestamp": "ISO-8601"
}
```

**Read this if:** You need to know the API response format

---

### schemas/handoff-format.md
Defines how agents communicate completion status and pass artifacts.

**Each agent creates:** `handoff-{AgentName}.json`

**Required fields:**
- from_agent / to_agent
- timestamp
- status (PASS | PASS_WITH_WARNINGS | PASS_WITH_FIXES | FAIL)
- artifacts (list of files created)
- context (design decisions, limitations, assumptions)
- validation (command to verify completion)

**Read this if:** You need to create or read a handoff file

---

## Prompt Structure

Every agent prompt follows this template:

```markdown
# AGENT: [Name]

## IDENTITY
- Primary Role
- Expertise
- Scope

## CONTEXT
- Project Type
- Current Phase
- Existing Codebase
- Dependencies

## OBJECTIVE
What to achieve and why

## SUCCESS CRITERIA
Measurable, testable outcomes

## CONSTRAINTS
Technical, security, performance, compatibility

## SPECIFICATIONS
Detailed requirements

## EDGE CASES
Specific scenarios + expected behavior

## DELIVERABLES
Files to create with descriptions

## ACCEPTANCE TESTS
Commands to verify completion

## CODE STYLE
Good patterns (✅) and anti-patterns (❌)

## HANDOFF
Next agent, artifacts, validation

## REFERENCES
External documentation links
```

---

## How to Use These Prompts

### As a Human Developer
1. Read the relevant agent prompt
2. Follow the specifications exactly
3. Use the code style examples
4. Test with acceptance tests
5. Create the handoff.json file
6. Run the validation command

### As an AI Agent
1. Read the agent prompt assigned to you
2. Read any handoff files from previous agents
3. Read shared schemas in schemas/
4. Execute the tasks in DELIVERABLES section
5. Follow CODE STYLE guidelines
6. Create handoff-{YourName}.json
7. Run validation command before marking complete

### As an Orchestrator
1. Start with MASTER_ORCHESTRATION.md in @instructions_new/
2. Invoke agents in order: BackendBuilder → TestAgent → CodeReviewer → SecurityScanner → DocumentationDynamo
3. Check quality gates after each agent
4. If gate fails, re-run agent with error context
5. Maximum 3 retries per agent

---

## Key Improvements Over Original

### Before (instruction.md)
```
BackendBuilder: Implement the REST API with Express
```

### After (01_BackendBuilder.md)
- 400+ lines of detailed specifications
- Explicit success criteria
- 8+ edge cases defined
- Code style examples (good/bad)
- Hardware constraints documented
- Serial protocol fully specified
- Acceptance tests provided
- Handoff format defined

**Result:** Agent knows exactly what to do, how to do it, and how to verify completion.

---

## Metrics and Quality Targets

### BackendBuilder
- Code quality: >8.0/10
- Test coverage: >90%
- Linting errors: 0
- Console.log statements: 0
- Magic numbers: 0 (all in constants)

### TestAgent
- Line coverage: >90%
- Branch coverage: >85%
- Test count: 80+ tests
- Edge cases: 8+ tested
- Flaky tests: 0

### DocumentationDynamo
- Documentation files: 8+
- Word count: 12,000-15,000
- FAQ questions: 15+
- Code examples: 30+
- Diagrams: 3+

### CodeReviewer
- Critical issues: 0
- High issues: <5
- Code quality score: >8.0/10
- Remediation steps: 100% coverage

### SecurityScanner
- Critical vulnerabilities: 0
- High vulnerabilities: <3
- OWASP Top 10 coverage: 100%
- Overall risk: MEDIUM or lower

---

## Common Issues and Solutions

### Issue: Agent doesn't know what to deliver
**Solution:** Check DELIVERABLES section with file paths and descriptions

### Issue: Agent produces inconsistent responses
**Solution:** Read schemas/response-format.md for standard

### Issue: Next agent doesn't know what previous agent did
**Solution:** Read handoff-{PreviousAgent}.json for context

### Issue: Agent misses edge cases
**Solution:** Check EDGE CASES section for explicit scenarios

### Issue: Agent uses wrong code style
**Solution:** Check CODE STYLE section with examples

### Issue: Agent doesn't know if it succeeded
**Solution:** Run ACCEPTANCE TESTS commands

---

## Version History

### Version 2.0 (2025-01-14)
- Complete rewrite based on @improvement.md recommendations
- Added explicit success criteria
- Added edge case specifications
- Added code style examples
- Added acceptance tests
- Added handoff protocol
- Added shared schemas

### Version 1.0 (Original)
- Basic agent task descriptions
- Minimal specifications
- No handoff protocol
- No shared standards

---

## Related Files

- **Master orchestration:** `@instructions_new/MASTER_ORCHESTRATION.md`
- **Improvement analysis:** `@improvement.md` (root)
- **Original instruction:** `instruction.md` (root - for reference only)
- **Handoff files:** `handoff-*.json` (created by agents in root)

---

## Questions?

If you have questions about:
- **What to build:** Read OBJECTIVE and DELIVERABLES
- **How to build it:** Read CODE STYLE and SPECIFICATIONS
- **When it's done:** Run ACCEPTANCE TESTS
- **What to pass to next agent:** Create handoff.json per schemas/handoff-format.md

---

**Last Updated:** 2025-01-14
**Maintained By:** Project Team
**Status:** Production Ready
