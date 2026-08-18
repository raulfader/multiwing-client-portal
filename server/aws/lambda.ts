import serverless from "serverless-http";
import { createApp } from "../app";
import { hydrateRuntimeConfig } from "./runtimeConfig";

let handler: ReturnType<typeof serverless> | undefined;

/**
 * API Gateway entry point for the isolated duplicate. External delivery,
 * tracking, webhook, and Manus OAuth routes remain disabled until their AWS
 * replacements have been independently validated.
 */
export const handlerForApiGateway = async (
  ...args: Parameters<ReturnType<typeof serverless>>
) => {
  await hydrateRuntimeConfig();
  if (!handler) {
    handler = serverless(
      createApp({ enableLegacyOAuth: false, enableExternalRoutes: false })
    );
  }
  return handler(...args);
};
