import { traceabilityRepository as repo } from "./repository";

export const traceabilityService = {
  getTraceabilityForward: repo.getTraceabilityForward.bind(repo),
  getTraceabilityBackward: repo.getTraceabilityBackward.bind(repo),
};
