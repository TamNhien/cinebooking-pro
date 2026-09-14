"use client";

import { useEffect } from "react";

export default function RuntimeReadyMarker() {
  useEffect(() => {
    document.documentElement.dataset.cinebookingRuntimeReady = "true";
    return () => {
      if (document.documentElement.dataset.cinebookingRuntimeReady === "true") {
        document.documentElement.dataset.cinebookingRuntimeReady = "pending";
      }
    };
  }, []);

  return null;
}
