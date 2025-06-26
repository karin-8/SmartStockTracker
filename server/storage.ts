import { 
  inventoryItems, 
  demandHistory, 
  orders,
  type InventoryItem, 
  type InsertInventoryItem,
  type DemandHistory,
  type InsertDemandHistory,
  type Order,
  type InsertOrder,
  type DashboardMetrics,
  type InventoryItemWithForecast
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // Inventory Items
  getInventoryItems(): Promise<InventoryItem[]>;
  getInventoryItem(id: number): Promise<InventoryItem | undefined>;
  createInventoryItem(item: InsertInventoryItem): Promise<InventoryItem>;
  updateInventoryItem(id: number, item: Partial<InsertInventoryItem>): Promise<InventoryItem>;
  
  // Demand History
  getDemandHistory(itemId: number, days?: number): Promise<DemandHistory[]>;
  addDemandHistory(demand: InsertDemandHistory): Promise<DemandHistory>;
  
  // Orders
  getOrders(): Promise<Order[]>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrderStatus(id: number, status: string): Promise<Order>;
  
  // Analytics
  getDashboardMetrics(): Promise<DashboardMetrics>;
  getInventoryWithForecast(): Promise<InventoryItemWithForecast[]>;
}

export class DatabaseStorage implements IStorage {
  constructor() {
    // Initialize with sample data if database is empty
    this.initializeSampleDataIfNeeded();
  }

  private async initializeSampleDataIfNeeded() {
    try {
      const existingItems = await db.select().from(inventoryItems).limit(1);
      if (existingItems.length === 0) {
        await this.initializeSampleData();
      }
    } catch (error) {
      console.error("Error checking for existing data:", error);
    }
  }

  private async initializeSampleData() {
    const sampleItems: InsertInventoryItem[] = [
      {
        name: "Wireless Headphones",
        sku: "WH-001",
        currentStock: 156,
        reorderPoint: 75,
        safetyStock: 25,
        economicOrderQuantity: 150,
        unitCost: 45.99,
        holdingCost: 5.52,
        orderingCost: 25.00,
        leadTimeDays: 7,
        category: "Electronics",
        supplier: "TechCorp"
      },
      {
        name: "Smartphone Case",
        sku: "SC-024",
        currentStock: 89,
        reorderPoint: 50,
        safetyStock: 15,
        economicOrderQuantity: 100,
        unitCost: 12.99,
        holdingCost: 1.56,
        orderingCost: 20.00,
        leadTimeDays: 5,
        category: "Accessories",
        supplier: "AccessoryPlus"
      },
      {
        name: "USB-C Cable",
        sku: "UC-012",
        currentStock: 45,
        reorderPoint: 60,
        safetyStock: 20,
        economicOrderQuantity: 200,
        unitCost: 8.99,
        holdingCost: 1.08,
        orderingCost: 15.00,
        leadTimeDays: 3,
        category: "Cables",
        supplier: "CableTech"
      },
      {
        name: "Bluetooth Speaker",
        sku: "BS-089",
        currentStock: 234,
        reorderPoint: 100,
        safetyStock: 30,
        economicOrderQuantity: 120,
        unitCost: 89.99,
        holdingCost: 10.80,
        orderingCost: 30.00,
        leadTimeDays: 10,
        category: "Electronics",
        supplier: "AudioCorp"
      },
      {
        name: "Power Bank",
        sku: "PB-056",
        currentStock: 67,
        reorderPoint: 40,
        safetyStock: 15,
        economicOrderQuantity: 80,
        unitCost: 29.99,
        holdingCost: 3.60,
        orderingCost: 22.00,
        leadTimeDays: 6,
        category: "Electronics",
        supplier: "PowerTech"
      }
    ];

    try {
      // Insert inventory items
      const insertedItems = await db.insert(inventoryItems).values(sampleItems).returning();
      
      // Generate demand history for each item
      for (const item of insertedItems) {
        const demands: InsertDemandHistory[] = [];
        
        for (let i = 30; i > 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          
          // Generate realistic demand based on item type
          let baseDemand = 5;
          if (item.name.includes("USB-C")) baseDemand = 12;
          else if (item.name.includes("Headphones")) baseDemand = 8;
          else if (item.name.includes("Speaker")) baseDemand = 3;
          
          const quantity = Math.max(0, Math.floor(baseDemand + Math.random() * 6 - 3));
          
          demands.push({
            itemId: item.id,
            date,
            quantity
          });
        }
        
        await db.insert(demandHistory).values(demands);
      }
      
      console.log("Sample data initialized successfully");
    } catch (error) {
      console.error("Error initializing sample data:", error);
    }
  }

  private calculateMovingAverage(demands: DemandHistory[], days: number = 7): number {
    const recentDemands = demands.slice(-days);
    const total = recentDemands.reduce((sum, d) => sum + d.quantity, 0);
    return total / days;
  }

  private calculateDemandVariability(demands: DemandHistory[], days: number = 14): number {
    const recentDemands = demands.slice(-days);
    const avg = this.calculateMovingAverage(demands, days);
    const variance = recentDemands.reduce((sum, d) => sum + Math.pow(d.quantity - avg, 2), 0) / days;
    return Math.sqrt(variance);
  }

  private generateForecast(item: InventoryItem, demands: DemandHistory[]): number[] {
    const dailyDemand = this.calculateMovingAverage(demands);
    const variability = this.calculateDemandVariability(demands);
    
    const forecast = [];
    for (let i = 0; i < 7; i++) {
      // Simple linear trend with some randomness
      const trendFactor = 1 + (Math.random() - 0.5) * 0.1;
      const variabilityFactor = Math.random() * variability;
      forecast.push(Math.max(0, Math.floor(dailyDemand * trendFactor + variabilityFactor)));
    }
    
    return forecast;
  }

  private generateStockStatus(item: InventoryItem, forecast: number[]): Array<{
    day: number;
    date: string;
    status: "enough" | "low" | "order";
    projectedStock: number;
  }> {
    const status = [];
    let projectedStock = item.currentStock;
    
    for (let i = 0; i < 7; i++) {
      projectedStock -= forecast[i];
      const date = new Date();
      date.setDate(date.getDate() + i + 1);
      
      let statusValue: "enough" | "low" | "order";
      if (projectedStock <= 0) {
        statusValue = "order";
      } else if (projectedStock <= item.reorderPoint) {
        statusValue = "order";
      } else if (projectedStock <= item.reorderPoint * 1.5) {
        statusValue = "low";
      } else {
        statusValue = "enough";
      }
      
      status.push({
        day: i + 1,
        date: date.toISOString().split('T')[0],
        status: statusValue,
        projectedStock: Math.max(0, projectedStock)
      });
    }
    
    return status;
  }

  private generateAIInsights(item: InventoryItem, stockStatus: any[], dailyDemand: number): string[] {
    const insights = [];
    
    const criticalDays = stockStatus.filter(s => s.status === "order").length;
    if (criticalDays > 0) {
      insights.push(`Will be out of stock in ${stockStatus.findIndex(s => s.status === "order") + 1} days. Immediate action required.`);
    }
    
    if (dailyDemand > 10) {
      insights.push(`High demand detected (${dailyDemand.toFixed(1)} units/day). Consider increasing EOQ.`);
    }
    
    if (item.currentStock > item.economicOrderQuantity * 2) {
      insights.push(`Overstock situation. Consider reducing next order quantity.`);
    }
    
    return insights;
  }

  async getInventoryItems(): Promise<InventoryItem[]> {
    return await db.select().from(inventoryItems);
  }

  async getInventoryItem(id: number): Promise<InventoryItem | undefined> {
    const [item] = await db.select().from(inventoryItems).where(eq(inventoryItems.id, id));
    return item || undefined;
  }

  async createInventoryItem(item: InsertInventoryItem): Promise<InventoryItem> {
    const [newItem] = await db.insert(inventoryItems).values(item).returning();
    return newItem;
  }

  async updateInventoryItem(id: number, updates: Partial<InsertInventoryItem>): Promise<InventoryItem> {
    const [updatedItem] = await db
      .update(inventoryItems)
      .set({ ...updates, lastUpdated: new Date() })
      .where(eq(inventoryItems.id, id))
      .returning();
    
    if (!updatedItem) {
      throw new Error(`Inventory item with id ${id} not found`);
    }
    
    return updatedItem;
  }

  async getDemandHistory(itemId: number, days?: number): Promise<DemandHistory[]> {
    const query = db.select().from(demandHistory)
      .where(eq(demandHistory.itemId, itemId))
      .orderBy(desc(demandHistory.date));
    
    let demands = await query;
    
    if (days) {
      demands = demands.slice(0, days);
    }
    
    return demands.reverse(); // Return in chronological order
  }

  async addDemandHistory(demand: InsertDemandHistory): Promise<DemandHistory> {
    const [newDemand] = await db.insert(demandHistory).values(demand).returning();
    return newDemand;
  }

  async getOrders(): Promise<Order[]> {
    return await db.select().from(orders).orderBy(desc(orders.orderDate));
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    const [newOrder] = await db.insert(orders).values({
      ...order,
      status: order.status || "pending",
      expectedDeliveryDate: order.expectedDeliveryDate || null
    }).returning();
    return newOrder;
  }

  async updateOrderStatus(id: number, status: string): Promise<Order> {
    const [updatedOrder] = await db
      .update(orders)
      .set({ status })
      .where(eq(orders.id, id))
      .returning();
    
    if (!updatedOrder) {
      throw new Error(`Order with id ${id} not found`);
    }
    
    return updatedOrder;
  }

  async getDashboardMetrics(): Promise<DashboardMetrics> {
    const items = await db.select().from(inventoryItems);
    const ordersList = await db.select().from(orders);
    
    const totalItems = items.length;
    const lowStockItems = items.filter(item => item.currentStock <= item.reorderPoint).length;
    const totalValue = items.reduce((sum, item) => sum + (item.currentStock * item.unitCost), 0);
    const pendingOrders = ordersList.filter(order => order.status === "pending").length;
    
    // Calculate turnover rate (simplified)
    const allDemands = await db.select().from(demandHistory);
    const totalDemand = allDemands.reduce((sum, d) => sum + d.quantity, 0);
    const avgStock = items.reduce((sum, item) => sum + item.currentStock, 0) / items.length;
    const turnoverRate = totalDemand / (avgStock * 30) * 365; // Annualized
    
    // Calculate stockout frequency (simplified)
    const stockoutFrequency = (lowStockItems / totalItems) * 100;
    
    return {
      totalItems,
      lowStockItems,
      totalValue,
      pendingOrders,
      turnoverRate,
      stockoutFrequency
    };
  }

  async getInventoryWithForecast(): Promise<InventoryItemWithForecast[]> {
    const items = await db.select().from(inventoryItems);
    
    const result = [];
    for (const item of items) {
      const demands = await this.getDemandHistory(item.id);
      const dailyDemand = this.calculateMovingAverage(demands);
      const demandVariability = this.calculateDemandVariability(demands);
      const forecast = this.generateForecast(item, demands);
      const stockStatus = this.generateStockStatus(item, forecast);
      const aiInsights = this.generateAIInsights(item, stockStatus, dailyDemand);
      
      result.push({
        ...item,
        forecast,
        dailyDemand,
        demandVariability,
        stockStatus,
        aiInsights
      });
    }
    
    return result;
  }
}

export const storage = new DatabaseStorage();
