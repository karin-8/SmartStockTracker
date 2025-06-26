import { pgTable, text, serial, integer, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const inventoryItems = pgTable("inventory_items", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  sku: text("sku").notNull().unique(),
  currentStock: integer("current_stock").notNull(),
  reorderPoint: integer("reorder_point").notNull(),
  safetyStock: integer("safety_stock").notNull(),
  economicOrderQuantity: integer("economic_order_quantity").notNull(),
  unitCost: real("unit_cost").notNull(),
  holdingCost: real("holding_cost").notNull(),
  orderingCost: real("ordering_cost").notNull(),
  leadTimeDays: integer("lead_time_days").notNull(),
  category: text("category").notNull(),
  supplier: text("supplier").notNull(),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
});

export const demandHistory = pgTable("demand_history", {
  id: serial("id").primaryKey(),
  itemId: integer("item_id").notNull().references(() => inventoryItems.id),
  date: timestamp("date").notNull(),
  quantity: integer("quantity").notNull(),
});

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  itemId: integer("item_id").notNull().references(() => inventoryItems.id),
  quantity: integer("quantity").notNull(),
  status: text("status").notNull().default("pending"),
  orderDate: timestamp("order_date").defaultNow().notNull(),
  expectedDeliveryDate: timestamp("expected_delivery_date"),
  cost: real("cost").notNull(),
});

export const insertInventoryItemSchema = createInsertSchema(inventoryItems).omit({
  id: true,
  lastUpdated: true,
});

export const insertDemandHistorySchema = createInsertSchema(demandHistory).omit({
  id: true,
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  orderDate: true,
});

export type InventoryItem = typeof inventoryItems.$inferSelect;
export type InsertInventoryItem = z.infer<typeof insertInventoryItemSchema>;
export type DemandHistory = typeof demandHistory.$inferSelect;
export type InsertDemandHistory = z.infer<typeof insertDemandHistorySchema>;
export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;

// Extended types for frontend calculations
export type InventoryItemWithForecast = InventoryItem & {
  forecast: number[];
  dailyDemand: number;
  demandVariability: number;
  stockStatus: Array<{
    day: number;
    date: string;
    status: "enough" | "low" | "order";
    projectedStock: number;
  }>;
  aiInsights: string[];
};

export type DashboardMetrics = {
  totalItems: number;
  lowStockItems: number;
  totalValue: number;
  pendingOrders: number;
  turnoverRate: number;
  stockoutFrequency: number;
  // Historical comparisons
  totalItemsChange: number;
  totalValueChange: number;
  lowStockChange: number;
};
