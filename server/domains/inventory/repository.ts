import { storage } from "../../storage";

export const inventoryRepository = {
  getLots:                    storage.getLots.bind(storage),
  getLot:                     storage.getLot.bind(storage),
  getLotsByMaterial:          storage.getLotsByMaterial.bind(storage),
  getLotsByProduct:           storage.getLotsByProduct.bind(storage),
  getLotByBarcode:            storage.getLotByBarcode.bind(storage),
  createLot:                  storage.createLot.bind(storage),
  updateLot:                  storage.updateLot.bind(storage),
  deleteLot:                  storage.deleteLot.bind(storage),
  updateLotBarcodePrinted:    storage.updateLotBarcodePrinted.bind(storage),
  getLotUsage:                storage.getLotUsage.bind(storage),
  getLotLineage:              storage.getLotLineage.bind(storage),

  getMaterial:                storage.getMaterial.bind(storage),
  getProduct:                 storage.getProduct.bind(storage),

  receiveStock:               storage.receiveStock.bind(storage),

  getStockMovements:          storage.getStockMovements.bind(storage),
  createStockMovement:        storage.createStockMovement.bind(storage),

  getAuditLogs:               storage.getAuditLogs.bind(storage),
};
