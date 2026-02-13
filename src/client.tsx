import { initClient } from "rwsdk/client";
import * as Sentry from "@sentry/browser";

initClient({
  hydrateRootOptions: {
    onUncaughtError: (error, errorInfo) => {
      Sentry.captureException(error, {
        contexts: {
          react: {
            componentStack: errorInfo.componentStack,
            errorBoundary: errorInfo.errorBoundary?.constructor.name,
          },
        },
        tags: { errorType: "uncaught" },
      });
    },
    onCaughtError: (error, errorInfo) => {
      Sentry.captureException(error, {
        contexts: {
          react: {
            componentStack: errorInfo.componentStack,
            errorBoundary: errorInfo.errorBoundary?.constructor.name,
          },
        },
        tags: { errorType: "caught" },
      });
    },
  },
});