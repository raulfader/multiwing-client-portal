import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerEmailTrackingRoutes } from "./emailTracking";
import { registerTrackDownloadRoute } from "./trackDownload";
import { registerTrackStreamRoute } from "./trackStream";
import { registerTranscodingWebhook } from "./transcodingWebhook";
import { appRouter } from "./routers";
import { createContext } from "./_core/context";
import { registerOAuthRoutes } from "./_core/oauth";

export type DuplicateAppOptions = {
  /** Legacy Manus OAuth exists only for the untouched local source runtime. */
  enableLegacyOAuth?: boolean;
  /** External side-effect routes stay disabled in the empty AWS duplicate. */
  enableExternalRoutes?: boolean;
};

/** Creates the Multiwing API without binding a port or starting scheduled work. */
export function createApp(options: DuplicateAppOptions = {}) {
  const app = express();
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  if (options.enableLegacyOAuth) {
    registerOAuthRoutes(app);
  }

  if (options.enableExternalRoutes) {
    registerEmailTrackingRoutes(app);
    registerTrackDownloadRoute(app);
    registerTrackStreamRoute(app);
    registerTranscodingWebhook(app);
  }

  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  app.use(
    (
      error: unknown,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction
    ) => {
      console.error("[Multiwing API] Unhandled request error", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );

  return app;
}
