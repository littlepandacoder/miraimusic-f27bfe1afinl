import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

const GA_MEASUREMENT_ID = "G-J9LV0PYTRR";

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

const trackPageview = (page_path: string) => {
  if (typeof window === "undefined") return;

  window.dataLayer = window.dataLayer || [];

  if (typeof window.gtag === "function") {
    window.gtag("config", GA_MEASUREMENT_ID, {
      page_path,
    });
  } else {
    window.dataLayer.push({
      event: "page_view",
      page_path,
    });
  }
};

export function usePageTracking() {
  const location = useLocation();
  const hasTrackedInitialPage = useRef(false);

  useEffect(() => {
    if (!hasTrackedInitialPage.current) {
      hasTrackedInitialPage.current = true;
      return;
    }

    trackPageview(location.pathname + location.search);
  }, [location.pathname, location.search]);
}

export function PageTracking() {
  usePageTracking();
  return null;
}
