build-DuplicateApiFunction:
	./node_modules/.bin/esbuild server/aws/lambda.ts --bundle --platform=node --format=cjs --target=node22 --main-fields=module,main --outfile="$(ARTIFACTS_DIR)/lambda.js"
	cp server/aws/lambda-package.json "$(ARTIFACTS_DIR)/package.json"
