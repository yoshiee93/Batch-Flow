import { storage } from "../../storage";

export const customersRepository = {
  getCustomers:           storage.getCustomers.bind(storage),
  getCustomer:            storage.getCustomer.bind(storage),
  createCustomer:         storage.createCustomer.bind(storage),
  updateCustomer:         storage.updateCustomer.bind(storage),
  deleteCustomer:         storage.deleteCustomer.bind(storage),

  getOrders:              storage.getOrders.bind(storage),
  getOrder:               storage.getOrder.bind(storage),
  createOrder:            storage.createOrder.bind(storage),
  updateOrder:            storage.updateOrder.bind(storage),
  deleteOrder:            storage.deleteOrder.bind(storage),
  getOrderItems:          storage.getOrderItems.bind(storage),
  createOrderItem:        storage.createOrderItem.bind(storage),
  deleteOrderItem:        storage.deleteOrderItem.bind(storage),
  completeOrder:          storage.completeOrder.bind(storage),

  getOrdersWithAllocation: storage.getOrdersWithAllocation.bind(storage),
  runStockAllocation:     storage.runStockAllocation.bind(storage),
};
