build-DuplicateApiFunction:
	./node_modules/.bin/esbuild server/aws/lambda.ts --bundle --platform=node --format=cjs --target=node22 --main-fields=module,main --outfile="$(ARTIFACTS_DIR)/lambda.js"
	./node_modules/.bin/esbuild server/aws/schemaInitializer.ts --bundle --platform=node --format=cjs --target=node22 --main-fields=module,main --outfile="$(ARTIFACTS_DIR)/schemaInitializer.js"
	./node_modules/.bin/esbuild server/aws/dataImporter.ts --bundle --platform=node --format=cjs --target=node22 --main-fields=module,main --outfile="$(ARTIFACTS_DIR)/dataImporter.js"
	./node_modules/.bin/esbuild server/aws/mediaCopier.ts --bundle --platform=node --format=cjs --target=node22 --main-fields=module,main --outfile="$(ARTIFACTS_DIR)/mediaCopier.js"
	cp server/aws/lambda-package.json "$(ARTIFACTS_DIR)/package.json"
