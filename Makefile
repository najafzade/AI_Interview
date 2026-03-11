.PHONY: demo test

test:
	npm run test

demo:
	@echo "1) Start app: npm run dev"
	@echo "2) Run interview in browser: http://localhost:9002/interview"
	@echo "3) Discover sessions: http://localhost:9002/dashboard"
	@echo "4) Open a session by id and submit feedback"
	@echo "5) Update prompt: http://localhost:9002/admin/prompts"
	@echo "6) Start another interview and verify prompt version changed"
