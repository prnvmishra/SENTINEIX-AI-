import { useContext } from "react";
import { LiveCaseContext } from "@/context/liveCaseContextInstance";

export function useLiveCase() {
  const context = useContext(LiveCaseContext);

  if (!context) {
    throw new Error("useLiveCase must be used within a LiveCaseProvider");
  }

  return context;
}
