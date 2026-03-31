BASE_URL ?= ./

.PHONY: run run-game run-public build build-arcane-forge-games

run:
	npm run dev

run-game:
	@npm run dev & \
	PID=$$!; \
	trap 'kill $$PID >/dev/null 2>&1 || true' INT TERM EXIT; \
	sleep 2; \
	open "http://localhost:8080"; \
	wait $$PID

run-public:
	npm run dev -- --host 0.0.0.0

build:
	BASE_URL=$(BASE_URL) npm run build
	rm -rf build/public-drop
	mkdir -p build/public-drop
	cp -R dist/. build/public-drop/
	@echo "Build output ready at build/public-drop (copy its contents into your website ./public/)"

build-arcane-forge-games:
	$(MAKE) build BASE_URL=/game-library/simple-lastline-survival-minigame/
