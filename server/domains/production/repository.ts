import { storage } from "../../storage";

export const productionRepository = {
  getBatches:                 storage.getBatches.bind(storage),
  getBatch:                   storage.getBatch.bind(storage),
  createBatch:                storage.createBatch.bind(storage),
  updateBatch:                storage.updateBatch.bind(storage),
  deleteBatch:                storage.deleteBatch.bind(storage),

  getBatchMaterials:          storage.getBatchMaterials.bind(storage),
  addBatchMaterial:           storage.addBatchMaterial.bind(storage),
  removeBatchMaterial:        storage.removeBatchMaterial.bind(storage),
  updateBatchMaterial:        storage.updateBatchMaterial.bind(storage),

  getLot:                     storage.getLot.bind(storage),
  recordBatchInput:           storage.recordBatchInput.bind(storage),
  recordBatchProductInput:    storage.recordBatchProductInput.bind(storage),
  recordBatchLotInput:        storage.recordBatchLotInput.bind(storage),
  getBatchInputLots:          storage.getBatchInputLots.bind(storage),

  getBatchOutputs:            storage.getBatchOutputs.bind(storage),
  addBatchOutput:             storage.addBatchOutput.bind(storage),
  removeBatchOutput:          storage.removeBatchOutput.bind(storage),
  getBatchOutputLots:         storage.getBatchOutputLots.bind(storage),

  recordBatchOutput:          storage.recordBatchOutput.bind(storage),
  finalizeBatch:              storage.finalizeBatch.bind(storage),
};
