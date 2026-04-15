import { storage } from "../../storage";

export const traceabilityRepository = {
  getTraceabilityForward:  storage.getTraceabilityForward.bind(storage),
  getTraceabilityBackward: storage.getTraceabilityBackward.bind(storage),
};
