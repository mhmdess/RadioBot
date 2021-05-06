node_modules: package.json package-lock.json
	npm install
	touch node_modules

.PHONY: lint
lint: node_modules
	npm run lint

.PHONY: test
test: node_modules
	npm run test