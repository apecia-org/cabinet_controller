# Agent System Quick Reference Card

## 🚀 Quick Start

### For Orchestrators
```bash
1. Read @instructions_new/MASTER_ORCHESTRATION.md
2. Invoke BackendBuilder (@agents/01_BackendBuilder.md)
3. Check quality gate: npm run lint && npm test
4. Invoke next agent if PASS
5. Repeat until DocumentationDynamo completes
```

### For Agents
```bash
1. Read your prompt (@agents/{Number}_{Name}.md)
2. Read previous handoff (handoff-{PreviousAgent}.json)
3. Read schemas (@agents/schemas/*.md)
4. Execute deliverables
5. Create your handoff (handoff-{YourName}.json)
6. Run validation command
```

---

## 📁 File Locations

| What | Where |
|------|-------|
| **Master Instructions** | `@instructions_new/MASTER_ORCHESTRATION.md` |
| **Agent Prompts** | `@agents/{Number}_{Name}.md` |
| **Shared Standards** | `@agents/schemas/*.md` |
| **Handoff Files** | `handoff-{AgentName}.json` (root) |
| **Analysis** | `@improvement.md` (root) |

---

## 🔄 Agent Pipeline

```
BackendBuilder (8-10h)
    ↓ Gate: npm run lint (0 errors)
TestAgent (5-7h)
    ↓ Gate: npm test --coverage (>90%)
CodeReviewer (2-3h)
    ↓ Gate: 0 critical issues
SecurityScanner (2-3h)
    ↓ Gate: 0 critical vulnerabilities
DocumentationDynamo (4-5h)
    ↓
✅ COMPLETE
```

---

## 📋 Agent Checklist

### BackendBuilder
- [ ] Server starts: `npm start`
- [ ] Lint passes: `npm run lint` → 0 errors
- [ ] Tests pass: `npm test` → 0 failures
- [ ] NO console.log in production code
- [ ] All magic numbers in constants.js
- [ ] handoff-BackendBuilder.json created

### TestAgent
- [ ] Coverage: `npm test --coverage` → >90%
- [ ] All tests pass: 0 failures
- [ ] No flaky tests: 10 runs all pass
- [ ] Execution time: <2 minutes
- [ ] handoff-TestAgent.json created

### CodeReviewer
- [ ] All files reviewed
- [ ] Critical issues: 0
- [ ] Quality score: >8.0/10
- [ ] reports/CODE_REVIEW.md created
- [ ] handoff-CodeReviewer.json created

### SecurityScanner
- [ ] OWASP Top 10 assessed
- [ ] Critical vulnerabilities: 0
- [ ] npm audit: 0 high/critical
- [ ] reports/SECURITY_REPORT.md created
- [ ] handoff-SecurityScanner.json created

### DocumentationDynamo
- [ ] 8 documentation files created
- [ ] FAQ: 15+ questions
- [ ] OpenAPI validates: `npx swagger-cli validate docs/swagger.yaml`
- [ ] All cURL examples tested
- [ ] handoff-DocumentationDynamo.json created

---

## 🎯 Success Criteria

### Code Quality
- Lint errors: 0
- console.log: 0
- Magic numbers: 0
- Test coverage: >90%
- Quality score: >8.0/10

### Security
- Critical vulnerabilities: 0
- High vulnerabilities: <3
- npm audit (high): 0
- Overall risk: MEDIUM or lower

### Documentation
- Required docs: 8+ files
- FAQ questions: 15+
- Code examples: 30+ tested
- OpenAPI: Valid 3.0.3

---

## 📊 Quality Gates

| After Agent | Command | Expected |
|-------------|---------|----------|
| BackendBuilder | `npm run lint` | 0 errors |
| BackendBuilder | `npm test` | All pass |
| TestAgent | `npm test --coverage` | >90% |
| CodeReviewer | Check CODE_REVIEW.md | 0 critical |
| SecurityScanner | `npm audit --audit-level=high` | 0 found |
| DocumentationDynamo | `npx swagger-cli validate` | Valid |

---

## 📝 Response Format

### Success
```json
{
  "status": "success",
  "data": { /* endpoint-specific */ },
  "timestamp": "2025-01-14T12:00:00.000Z"
}
```

### Error
```json
{
  "status": "error",
  "message": "Human-readable error",
  "timestamp": "2025-01-14T12:00:00.000Z"
}
```

**See:** `@agents/schemas/response-format.md`

---

## 🤝 Handoff Format

```json
{
  "from_agent": "AgentName",
  "to_agent": "NextAgent",
  "timestamp": "ISO-8601",
  "status": "PASS | PASS_WITH_WARNINGS | PASS_WITH_FIXES | FAIL",
  "artifacts": [
    {
      "type": "source_file | test_file | documentation | config_file | report",
      "path": "relative/path",
      "purpose": "Brief description",
      "priority": "critical | high | medium | low"
    }
  ],
  "context": {
    "design_decisions": [],
    "known_limitations": [],
    "assumptions": []
  },
  "validation": {
    "command": "validation command",
    "expected_result": "what success looks like"
  }
}
```

**See:** `@agents/schemas/handoff-format.md`

---

## 🔧 Common Commands

```bash
# Install dependencies
npm install

# Lint code
npm run lint

# Run tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run security audit
npm audit --audit-level=high

# Validate OpenAPI spec
npx swagger-cli validate docs/swagger.yaml

# Start server
npm start

# Check for outdated packages
npm outdated
```

---

## ⚠️ Common Issues

### "Quality gate failed"
1. Read error output
2. Fix issues
3. Re-run gate
4. Max 3 retries

### "Missing handoff file"
- You might be the first agent
- Read MASTER_ORCHESTRATION.md instead

### "Don't know what to deliver"
- Read DELIVERABLES section in your agent prompt
- Check for file paths and descriptions

### "Response format inconsistent"
- Read @agents/schemas/response-format.md
- All endpoints MUST follow this format

---

## 📞 Help

| Question | Answer |
|----------|--------|
| **What to build?** | Read OBJECTIVE and DELIVERABLES in your prompt |
| **How to build it?** | Read CODE STYLE and SPECIFICATIONS |
| **When is it done?** | Run ACCEPTANCE TESTS |
| **What to pass next?** | Create handoff.json per schema |
| **How do I start?** | Read MASTER_ORCHESTRATION.md |
| **Which agent runs first?** | BackendBuilder (01) |
| **Can I skip an agent?** | No - pipeline is sequential |
| **What if I find bugs?** | Add to issues[] in handoff.json |

---

## 📈 Metrics

| Agent | Time | Output | Key Metric |
|-------|------|--------|------------|
| BackendBuilder | 8-10h | 850 LOC | Lint: 0 errors |
| TestAgent | 5-7h | 670 LOC | Coverage: >90% |
| CodeReviewer | 2-3h | 3 reports | Score: >8.0 |
| SecurityScanner | 2-3h | 3 reports | Critical: 0 |
| DocumentationDynamo | 4-5h | 8 docs | Files: 8+ |
| **Total** | **21-28h** | | |

---

## 🎓 Learning Path

1. **Beginner:** Read @instructions_new/README.md
2. **Intermediate:** Read MASTER_ORCHESTRATION.md
3. **Advanced:** Read individual agent prompts
4. **Expert:** Read @improvement.md for rationale

---

## 🔄 Version

**System Version:** 2.0
**Last Updated:** 2025-01-14
**Status:** Production Ready

---

**Print this card and keep it handy while working with the agent system!**
