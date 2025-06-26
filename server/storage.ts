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

export class MemStorage implements IStorage {
  private inventoryItems: Map<number, InventoryItem>;
  private demandHistory: Map<number, DemandHistory[]>;
  private orders: Map<number, Order>;
  private currentItemId: number;
  private currentDemandId: number;
  private currentOrderId: number;

  constructor() {
    this.inventoryItems = new Map();
    this.demandHistory = new Map();
    this.orders = new Map();
    this.currentItemId = 1;
    this.currentDemandId = 1;
    this.currentOrderId = 1;
    
    // Initialize with realistic sample data
    this.initializeSampleData();
  }

  private initializeSampleData() {
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

    sampleItems.forEach(item => {
      const id = this.currentItemId++;
      const inventoryItem: InventoryItem = {
        ...item,
        id,
        lastUpdated: new Date()
      };
      this.inventoryItems.set(id, inventoryItem);
      
      // Generate demand history for past 30 days
      const demands: DemandHistory[] = [];
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
          id: this.currentDemandId++,
          itemId: id,
          date,
          quantity
        });
      }
      this.demandHistory.set(id, demands);
    });
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
    return Array.from(this.inventoryItems.values());
  }

  async getInventoryItem(id: number): Promise<InventoryItem | undefined> {
    return this.inventoryItems.get(id);
  }

  async createInventoryItem(item: InsertInventoryItem): Promise<InventoryItem> {
    const id = this.currentItemId++;
    const inventoryItem: InventoryItem = {
      ...item,
      id,
      lastUpdated: new Date()
    };
    this.inventoryItems.set(id, inventoryItem);
    return inventoryItem;
  }

  async updateInventoryItem(id: number, updates: Partial<InsertInventoryItem>): Promise<InventoryItem> {
    const existing = this.inventoryItems.get(id);
    if (!existing) {
      throw new Error(`Inventory item with id ${id} not found`);
    }
    
    const updated: InventoryItem = {
      ...existing,
      ...updates,
      lastUpdated: new Date()
    };
    this.inventoryItems.set(id, updated);
    return updated;
  }

  async getDemandHistory(itemId: number, days?: number): Promise<DemandHistory[]> {
    const demands = this.demandHistory.get(itemId) || [];
    if (days) {
      return demands.slice(-days);
    }
    return demands;
  }

  async addDemandHistory(demand: InsertDemandHistory): Promise<DemandHistory> {
    const id = this.currentDemandId++;
    const demandRecord: DemandHistory = { ...demand, id };
    
    const existing = this.demandHistory.get(demand.itemId) || [];
    existing.push(demandRecord);
    this.demandHistory.set(demand.itemId, existing);
    
    return demandRecord;
  }

  async getOrders(): Promise<Order[]> {
    return Array.from(this.orders.values());
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    const id = this.currentOrderId++;
    const orderRecord: Order = {
      ...order,
      id,
      status: order.status || "pending",
      orderDate: new Date(),
      expectedDeliveryDate: order.expectedDeliveryDate || null
    };
    this.orders.set(id, orderRecord);
    return orderRecord;
  }

  async updateOrderStatus(id: number, status: string): Promise<Order> {
    const existing = this.orders.get(id);
    if (!existing) {
      throw new Error(`Order with id ${id} not found`);
    }
    
    const updated: Order = { ...existing, status };
    this.orders.set(id, updated);
    return updated;
  }

  async getDashboardMetrics(): Promise<DashboardMetrics> {
    const items = Array.from(this.inventoryItems.values());
    const orders = Array.from(this.orders.values());
    
    const totalItems = items.length;
    const lowStockItems = items.filter(item => item.currentStock <= item.reorderPoint).length;
    const totalValue = items.reduce((sum, item) => sum + (item.currentStock * item.unitCost), 0);
    const pendingOrders = orders.filter(order => order.status === "pending").length;
    
    // Calculate turnover rate (simplified)
    const totalDemand = Array.from(this.demandHistory.values())
      .flat()
      .reduce((sum, d) => sum + d.quantity, 0);
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
    const items = Array.from(this.inventoryItems.values());
    
    return items.map(item => {
      const demands = this.demandHistory.get(item.id) || [];
      const dailyDemand = this.calculateMovingAverage(demands);
      const demandVariability = this.calculateDemandVariability(demands);
      const forecast = this.generateForecast(item, demands);
      const stockStatus = this.generateStockStatus(item, forecast);
      const aiInsights = this.generateAIInsights(item, stockStatus, dailyDemand);
      
      return {
        ...item,
        forecast,
        dailyDemand,
        demandVariability,
        stockStatus,
        aiInsights
      };
    });
  }
}

export const storage = new MemStorage();
