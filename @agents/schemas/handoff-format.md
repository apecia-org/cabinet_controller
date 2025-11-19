# Handoff Format Schema

## Purpose
Standardizes how agents communicate completion status and pass artifacts to the next agent in the pipeline.

## Handoff File Structure

### Location
Each agent creates: `handoff-{AgentName}.json` in project root

Examples:
- `handoff-BackendBuilder.json`
- `handoff-TestAgent.json`
- `handoff-CodeReviewer.json`

### Schema

```json
{
  "from_agent": "string (agent name)",
  "to_agent": "string (next agent name or 'COMPLETE')",
  "timestamp": "ISO 8601 timestamp",
  "status": "PASS | PASS_WITH_WARNINGS | PASS_WITH_FIXES | FAIL",

  "iteration": 1,
  "loop_required": false,
  "loop_target": null,
  "loop_reason": null,

  "artifacts": [
    {
      "type": "source_file | test_file | documentation | config_file | report",
      "path": "relative/path/to/file",
      "purpose": "Brief description",
      "priority": "critical | high | medium | low"
    }
  ],

  "context": {
    "design_decisions": ["list of key decisions made"],
    "known_limitations": ["list of known issues or limitations"],
    "assumptions": ["list of assumptions made"]
  },

  "test_requirements": {
    "coverage": 90,
    "critical_paths": ["list of critical functionality to test"],
    "edge_cases_to_test": ["list of edge cases"]
  },

  "issues": [
    {
      "id": "unique identifier",
      "severity": "critical | high | medium | low",
      "category": "bug | security | performance | quality",
      "location": "file:line",
      "description": "What is the issue",
      "remediation": "How to fix it",
      "status": "open | fixed | wontfix"
    }
  ],

  "metrics": {
    "execution_time": "duration string",
    "lines_of_code": 0,
    "test_coverage": 0,
    "quality_score": 0.0
  },

  "validation": {
    "command": "command to verify completion",
    "expected_result": "what success looks like",
    "checklist": ["list of completion criteria"]
  }
}
```

## Field Descriptions

### from_agent (required)
Name of the agent creating this handoff. Must match agent identity.

### to_agent (required)
Name of the next agent in pipeline. Use "COMPLETE" if this is the final agent.

### timestamp (required)
ISO 8601 timestamp when handoff was created. Use `new Date().toISOString()`.

### status (required)
Overall completion status:
- **PASS**: All success criteria met, ready for next stage
- **PASS_WITH_WARNINGS**: Completed but with non-blocking warnings
- **PASS_WITH_FIXES**: Completed but requires fixes before next stage
- **FAIL**: Did not meet success criteria, cannot proceed

### iteration (required)
Current iteration number. Starts at 1, increments when pipeline loops back to BackendBuilder.

### loop_required (required)
Boolean indicating if orchestrator should loop back to a previous agent.
- **true**: Critical issues found, must loop back
- **false**: Can proceed to next agent

### loop_target (optional)
Which agent to loop back to. Usually "BackendBuilder". Null if loop_required=false.

### loop_reason (optional)
Why the loop is required. Examples:
- "BUGS_FOUND_IN_TESTS"
- "CRITICAL_CODE_QUALITY_ISSUES"
- "CRITICAL_SECURITY_VULNERABILITIES"
- Null if loop_required=false

### artifacts (required)
Array of files/outputs created by this agent.

**artifact.type** values:
- `source_file`: Production code
- `test_file`: Test code
- `documentation`: Markdown/text docs
- `config_file`: Configuration (.env, package.json, etc.)
- `report`: Analysis reports (review, security, etc.)

**artifact.priority** indicates importance for testing/review:
- `critical`: Must be tested thoroughly
- `high`: Should be tested
- `medium`: Nice to test
- `low`: Optional testing

### context (required)
Crucial information for next agent.

**design_decisions**: Why certain approaches were chosen. Helps next agent understand intent.

**known_limitations**: Issues that couldn't be addressed now. Next agent should be aware.

**assumptions**: What was assumed to be true. Next agent can validate.

### test_requirements (for BackendBuilder → TestAgent)
Specific testing guidance from developer to test writer.

### issues (optional)
Problems found that need attention. Each agent can add issues for subsequent agents or human review.

### metrics (optional)
Quantitative measures of agent performance and output quality.

### validation (required)
How the next agent verifies this agent completed successfully.

## Example Handoffs

### BackendBuilder → TestAgent

```json
{
  "from_agent": "BackendBuilder",
  "to_agent": "TestAgent",
  "timestamp": "2025-01-14T12:00:00.000Z",
  "status": "PASS",

  "artifacts": [
    {
      "type": "source_file",
      "path": "src/services/cabinetService.js",
      "purpose": "Main serial port communication service",
      "priority": "critical"
    },
    {
      "type": "source_file",
      "path": "src/utils/serialPort.js",
      "purpose": "CRC8 calculation and frame building",
      "priority": "critical"
    },
    {
      "type": "config_file",
      "path": ".env.example",
      "purpose": "Environment configuration template",
      "priority": "medium"
    }
  ],

  "context": {
    "design_decisions": [
      "Chose singleton pattern for CabinetService (only one serial port)",
      "1000ms delay between operations (hardware requirement)",
      "10KB buffer limit to prevent memory leaks"
    ],
    "known_limitations": [
      "No retry logic implemented yet",
      "Serial port not tested with real hardware"
    ],
    "assumptions": [
      "Serial port path is valid",
      "Only one process accesses serial port",
      "Cabinet hardware responds within 2 seconds"
    ]
  },

  "test_requirements": {
    "coverage": 90,
    "critical_paths": [
      "CRC8 calculation accuracy",
      "Frame parsing with partial/malformed data",
      "Error handling on serial timeout",
      "Buffer overflow protection"
    ],
    "edge_cases_to_test": [
      "Empty cabinet IDs array",
      "Invalid cabinet IDs (negative, >255, non-integer)",
      "Serial port unavailable on startup",
      "Concurrent requests to same cabinet",
      "Buffer overflow (>10KB data)",
      "Malformed serial responses"
    ]
  },

  "metrics": {
    "execution_time": "8m 45s",
    "lines_of_code": 850,
    "test_coverage": 0,
    "quality_score": 8.2
  },

  "validation": {
    "command": "npm install && npm run lint && npm test",
    "expected_result": "Lint passes, basic tests pass",
    "checklist": [
      "Server starts successfully",
      "All 4 endpoints respond",
      "No console.log in production code",
      "All magic numbers extracted to constants",
      "ESLint passes with 0 errors"
    ]
  }
}
```

### TestAgent → CodeReviewer (Iteration 1 - PASS)

```json
{
  "from_agent": "TestAgent",
  "to_agent": "CodeReviewer",
  "timestamp": "2025-01-14T13:30:00.000Z",
  "status": "PASS",

  "iteration": 1,
  "loop_required": false,
  "loop_target": null,
  "loop_reason": null,

  "artifacts": [
    {
      "type": "test_file",
      "path": "tests/unit/*.test.js",
      "purpose": "Unit tests for all modules",
      "priority": "high"
    },
    {
      "type": "report",
      "path": "tests/TEST_RESULTS.md",
      "purpose": "Test execution results",
      "priority": "medium"
    }
  ],

  "context": {
    "design_decisions": [
      "Mocked SerialPort for all tests (no hardware dependency)",
      "Used Vitest for speed and ES modules support"
    ],
    "known_limitations": [
      "Real hardware not tested",
      "Load tests limited to 100 concurrent requests"
    ],
    "assumptions": [
      "Mock SerialPort behaves like real hardware",
      "Test environment has sufficient memory"
    ]
  },

  "issues": [
    {
      "id": "TEST-001",
      "severity": "medium",
      "category": "bug",
      "location": "src/services/cabinetService.js:245",
      "description": "Buffer not cleared when exceeding 10KB in some edge cases",
      "remediation": "Add buffer size check in all append operations",
      "status": "open"
    }
  ],

  "metrics": {
    "execution_time": "5m 12s",
    "lines_of_code": 670,
    "test_coverage": 92,
    "quality_score": 8.5
  },

  "validation": {
    "command": "npm test -- --coverage --run",
    "expected_result": "All tests pass, coverage >90%",
    "checklist": [
      "All tests pass (0 failures)",
      "Coverage >90% lines",
      "No flaky tests (10 consecutive runs pass)",
      "Test execution time <2 minutes"
    ]
  }
}
```

### TestAgent → LOOP_TO_BackendBuilder (Iteration 1 - Bugs Found)

```json
{
  "from_agent": "TestAgent",
  "to_agent": "BackendBuilder",
  "timestamp": "2025-01-14T13:45:00.000Z",
  "status": "PASS_WITH_FIXES",

  "iteration": 1,
  "loop_required": true,
  "loop_target": "BackendBuilder",
  "loop_reason": "BUGS_FOUND_IN_TESTS",

  "artifacts": [
    {
      "type": "test_file",
      "path": "tests/unit/*.test.js",
      "purpose": "Unit tests that found bugs",
      "priority": "high"
    }
  ],

  "context": {
    "design_decisions": [
      "Used Vitest for testing"
    ],
    "known_limitations": [
      "Found 2 critical bugs during testing"
    ],
    "assumptions": []
  },

  "issues": [
    {
      "id": "BUG-001",
      "severity": "high",
      "category": "bug",
      "location": "src/services/cabinetService.js:245",
      "description": "Buffer overflow not protected when data exceeds 10KB",
      "remediation": "Add buffer size check before Buffer.concat()",
      "status": "open",
      "requires_code_change": true,
      "test_that_failed": "tests/fault/serialPort.test.js:67",
      "expected_behavior": "Buffer should be cleared when exceeding MAX_BUFFER_SIZE"
    },
    {
      "id": "BUG-002",
      "severity": "high",
      "category": "bug",
      "location": "src/controllers/cabinetController.js:38",
      "description": "Debug console.log left in production code",
      "remediation": "Remove console.log('hello world')",
      "status": "open",
      "requires_code_change": true
    }
  ],

  "metrics": {
    "execution_time": "5m 12s",
    "test_coverage": 92,
    "tests_passed": 85,
    "tests_failed": 2
  },

  "validation": {
    "command": "npm test -- --coverage",
    "expected_result": "2 tests failed due to bugs in source code",
    "checklist": [
      "Tests written (100% complete)",
      "Coverage >90% (achieved)",
      "All tests pass (FAILED - 2 bugs found)"
    ]
  }
}
```

**Orchestrator Action:**
- Sees `loop_required: true` and `loop_target: "BackendBuilder"`
- Increments global iteration counter to 2
- Re-invokes BackendBuilder with bug context from `issues[]` array
- After BackendBuilder fixes bugs, re-runs TestAgent with `iteration: 2`

---

### BackendBuilder → TestAgent (Iteration 2 - After Bug Fixes)

```json
{
  "from_agent": "BackendBuilder",
  "to_agent": "TestAgent",
  "timestamp": "2025-01-14T14:15:00.000Z",
  "status": "PASS",

  "iteration": 2,
  "loop_required": false,
  "loop_target": null,
  "loop_reason": null,

  "artifacts": [
    {
      "type": "source_file",
      "path": "src/services/cabinetService.js",
      "purpose": "Fixed buffer overflow issue",
      "priority": "critical"
    },
    {
      "type": "source_file",
      "path": "src/controllers/cabinetController.js",
      "purpose": "Removed debug console.log",
      "priority": "high"
    }
  ],

  "context": {
    "design_decisions": [
      "Added 10KB buffer limit to prevent memory leaks"
    ],
    "known_limitations": [],
    "assumptions": []
  },

  "fixes_applied": [
    "BUG-001: Added buffer size check in cabinetService.js:245",
    "BUG-002: Removed console.log from cabinetController.js:38"
  ],

  "issues_resolved": ["BUG-001", "BUG-002"],
  "new_issues": [],

  "validation": {
    "command": "npm run lint && npm test",
    "expected_result": "All tests pass after fixes",
    "checklist": [
      "Lint passes (verified)",
      "Bug fixes applied (verified)",
      "No new issues introduced (verified)"
    ]
  }
}
```

---

### CodeReviewer → SecurityScanner

```json
{
  "from_agent": "CodeReviewer",
  "to_agent": "SecurityScanner",
  "timestamp": "2025-01-14T14:00:00.000Z",
  "status": "PASS_WITH_FIXES",

  "artifacts": [
    {
      "type": "report",
      "path": "reports/CODE_REVIEW.md",
      "purpose": "Detailed code review findings",
      "priority": "high"
    },
    {
      "type": "report",
      "path": "reports/ISSUES.md",
      "purpose": "Issue tracker",
      "priority": "high"
    }
  ],

  "context": {
    "design_decisions": [
      "Used automated tools (ESLint) plus manual review"
    ],
    "known_limitations": [
      "Some issues may be false positives",
      "Performance analysis limited to static analysis"
    ],
    "assumptions": [
      "Code style follows JavaScript standard"
    ]
  },

  "issues": [
    {
      "id": "CR-001",
      "severity": "high",
      "category": "quality",
      "location": "src/controllers/cabinetController.js:38",
      "description": "Debug console.log statement in production code",
      "remediation": "Remove or replace with logger.info()",
      "status": "open"
    },
    {
      "id": "CR-002",
      "severity": "high",
      "category": "quality",
      "location": "src/services/cabinetService.js:132",
      "description": "Magic numbers not extracted to constants",
      "remediation": "Extract to src/utils/constants.js",
      "status": "open"
    }
  ],

  "metrics": {
    "execution_time": "3m 30s",
    "lines_of_code": 0,
    "test_coverage": 0,
    "quality_score": 8.2
  },

  "validation": {
    "command": "npm run lint",
    "expected_result": "0 errors after fixes",
    "checklist": [
      "All high-priority issues documented",
      "Remediation steps provided for each issue",
      "Code quality score calculated"
    ]
  }
}
```

## Usage Guidelines

### Creating a Handoff
1. Agent completes its work
2. Agent creates handoff-{Name}.json with all required fields
3. Agent sets status based on completion quality
4. Agent lists all created artifacts
5. Agent provides context for next agent
6. Agent specifies validation command

### Reading a Handoff
1. Next agent reads handoff-{PreviousAgent}.json
2. Validates previous agent completed (status = PASS)
3. Reads artifacts list to know what was created
4. Reads context to understand decisions and limitations
5. Reads test_requirements (if applicable)
6. Runs validation command to verify state
7. Proceeds with own work

### Updating Issues
If agent finds issues in previous work:
1. Add issue to issues array in own handoff
2. Reference previous agent's file (e.g., "BackendBuilder created...")
3. Set status to PASS_WITH_WARNINGS or PASS_WITH_FIXES
4. Next agent or human can address issues

## Validation

All handoff files should be valid JSON. Validate with:

```bash
node -e "JSON.parse(require('fs').readFileSync('handoff-BackendBuilder.json'))"
```

Expected: No output = valid JSON
