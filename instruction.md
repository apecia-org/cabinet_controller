Project/Task Goal:
Develop a restful api service with following features:
    •  get all status of the cabinet. reference @index.js
    •  an api that open selected cabinet in array , reference @open.js
    •  an api to get health of this service
Total expect only api service
1. [get] /api/v1/cabinet/status
2. [post] /api/v1/cabinet/open with body  
3. [get] /api/v1/health
    port 80
Key Requirements and Constraints:
    •  Functional: restful api.
    •  Non-Functional: non tls, no rate limit, no auth needed.
    •  Tech Stack Preferences: Backend: Node.js Express; Deployment: docker compose on Docker on localhost.
   
Agent Delegation:
   
    •  BackendBuilder: Implement server logic and endpoints.
    •  TestAgent: Write and execute test script.
    •  DocumentationDynamo: Generate Swagger docs.
   
Input Artifacts/Context:
    •  Existing Files/Code: Use wireframes from blog-wireframe.md.
    •  Conversation History: Extend from previous static site task.
    •  Long-Term Preferences: Use javascript; Include accessibility features.
Expected Output/Deliverables:
    •  Git repo link with all code; Live demo URL; PDF report of tests and diagrams.; readme.md with setup instructions
    •  Format: Markdown summary with embedded code snippets.
Success Criteria and Iteration:
    •  Success Metrics: All features work end-to-end; No critical bugs.
    •  If Issues Arise: Provide error logs and suggest fixes; Iterate once if needed.
Start Execution:
Proceed with the task using the agentic team.
Tips for High Success Rate
    •  Clarity Wins: Use bullet points and numbered lists to break down complex goals.
    •  Scope Control: Start small (e.g., MVP) and iterate to avoid overload.
    •  Feedback Loop: Include “Ask for clarification if needed” to handle ambiguities.
    •  Test Iteratively: After one response, refine with a follow-up prompt like “Refine based on output: [issues].”
    •  Adapt for Tools: If your agents use specific tools (e.g., web_search), reference them in delegation.
    •  Error Handling: Add “Handle potential errors like [e.g., API rate limits]” in constraints.
Note:
    all docs should be written into "docs" folder. if is for claude to use please put into "claude_docs" folder.
