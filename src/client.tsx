import { initClient, initClientNavigation } from "rwsdk/client";
import * as Sentry from "@sentry/browser";

// RedwoodSDK uses RSC RPC to emulate client-side navigation.
// https://docs.rwsdk.com/guides/frontend/client-side-nav/
const { handleResponse, onHydrated } = initClientNavigation();

const captureReactError =
  (errorType: "uncaught" | "caught") =>
  (error: unknown, errorInfo: { componentStack?: string }) => {
    Sentry.captureException(error, {
      contexts: { react: { componentStack: errorInfo.componentStack } },
      tags: { errorType },
    });
  };

initClient({
  handleResponse,
  onHydrated,
  hydrateRootOptions: {
    onUncaughtError: captureReactError("uncaught"),
    onCaughtError: captureReactError("caught"),
  },
});
