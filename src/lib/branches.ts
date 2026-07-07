import { DEFAULT_BRANCHES } from "./constants";
import type { Branch } from "./types";

export function resolveBranches(branches: Branch[] | null | undefined): Branch[] {
  return branches && branches.length > 0 ? branches : [...DEFAULT_BRANCHES];
}
