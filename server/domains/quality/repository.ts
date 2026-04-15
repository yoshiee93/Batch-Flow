import { storage } from "../../storage";

export const qualityRepository = {
  getQualityChecks:  storage.getQualityChecks.bind(storage),
  createQualityCheck: storage.createQualityCheck.bind(storage),
};
