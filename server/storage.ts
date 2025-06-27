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
import { getDatabase, testConnection } from "./database";
import { eq, desc, and, gte, sql } from "drizzle-orm";

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
      
      // Generate demand history for past 84 days (12 weeks)
      const demands: DemandHistory[] = [];
      for (let i = 84; i > 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        
        // Generate realistic daily demand based on item type
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

  private calculateWeeklyDemand(demands: DemandHistory[]): number {
    // Group demands by week and calculate average weekly demand
    const weeklyTotals: number[] = [];
    const now = new Date();
    
    for (let weekOffset = 0; weekOffset < 12; weekOffset++) {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - (weekOffset * 7) - 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      
      const weekDemands = demands.filter(d => {
        const demandDate = new Date(d.date);
        return demandDate >= weekStart && demandDate <= weekEnd;
      });
      
      const weekTotal = weekDemands.reduce((sum, d) => sum + d.quantity, 0);
      weeklyTotals.push(weekTotal);
    }
    
    return weeklyTotals.reduce((sum, total) => sum + total, 0) / weeklyTotals.length;
  }

  private calculateDemandVariability(demands: DemandHistory[]): number {
    // Calculate variability based on weekly demand patterns
    const weeklyTotals: number[] = [];
    const now = new Date();
    
    for (let weekOffset = 0; weekOffset < 12; weekOffset++) {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - (weekOffset * 7) - 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      
      const weekDemands = demands.filter(d => {
        const demandDate = new Date(d.date);
        return demandDate >= weekStart && demandDate <= weekEnd;
      });
      
      const weekTotal = weekDemands.reduce((sum, d) => sum + d.quantity, 0);
      weeklyTotals.push(weekTotal);
    }
    
    const avg = weeklyTotals.reduce((sum, total) => sum + total, 0) / weeklyTotals.length;
    const variance = weeklyTotals.reduce((sum, total) => sum + Math.pow(total - avg, 2), 0) / weeklyTotals.length;
    return Math.sqrt(variance);
  }

  private generateForecast(item: InventoryItem, demands: DemandHistory[]): number[] {
    const weeklyDemand = this.calculateWeeklyDemand(demands);
    const variability = this.calculateDemandVariability(demands);
    
    const forecast = [];
    for (let i = 0; i < 8; i++) {
      // Simple linear trend with some randomness for 8 weeks
      const trendFactor = 1 + (Math.random() - 0.5) * 0.1;
      const variabilityFactor = Math.random() * variability;
      forecast.push(Math.max(0, Math.floor(weeklyDemand * trendFactor + variabilityFactor)));
    }
    
    return forecast;
  }

  private generateStockStatus(item: InventoryItem, forecast: number[]): Array<{
    week: number;
    weekStartDate: string;
    weekEndDate: string;
    status: "enough" | "low" | "order";
    projectedStock: number;
    isHistorical: boolean;
  }> {
    const status = [];
    const weeklyDemand = this.calculateWeeklyDemand(this.demandHistory.get(item.id) || []);
    
    // Generate 4 historical weeks
    for (let i = -4; i < 0; i++) {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() + (i * 7));
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      
      // Calculate historical stock based on current stock + projected consumption
      const weeksFromNow = Math.abs(i);
      const historicalStock = item.currentStock + (weeklyDemand * weeksFromNow);
      
      let statusValue: "enough" | "low" | "order";
      if (historicalStock <= 0) {
        statusValue = "order";
      } else if (historicalStock <= item.reorderPoint) {
        statusValue = "order";
      } else if (historicalStock <= item.reorderPoint * 1.5) {
        statusValue = "low";
      } else {
        statusValue = "enough";
      }
      
      status.push({
        week: i + 5, // Week -3, -2, -1, 0 become weeks 1, 2, 3, 4
        weekStartDate: weekStart.toISOString().split('T')[0],
        weekEndDate: weekEnd.toISOString().split('T')[0],
        status: statusValue,
        projectedStock: Math.max(0, Math.floor(historicalStock)),
        isHistorical: true
      });
    }
    
    // Generate 8 future weeks (including current week)
    let projectedStock = item.currentStock;
    for (let i = 0; i < 8; i++) {
      projectedStock -= forecast[i];
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() + (i * 7));
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      
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
        week: i + 5, // Weeks 5-12
        weekStartDate: weekStart.toISOString().split('T')[0],
        weekEndDate: weekEnd.toISOString().split('T')[0],
        status: statusValue,
        projectedStock: Math.max(0, projectedStock),
        isHistorical: false
      });
    }
    
    return status;
  }

  private generateAIInsights(item: InventoryItem, stockStatus: any[], weeklyDemand: number): string[] {
    const insights = [];
    
    const criticalWeeks = stockStatus.filter(s => s.status === "order").length;
    if (criticalWeeks > 0) {
      insights.push(`Will be out of stock in ${stockStatus.findIndex(s => s.status === "order") + 1} weeks. Immediate action required.`);
    }
    
    if (weeklyDemand > 50) {
      insights.push(`High demand detected (${weeklyDemand.toFixed(1)} units/week). Consider increasing EOQ.`);
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
      const weeklyDemand = this.calculateWeeklyDemand(demands);
      const demandVariability = this.calculateDemandVariability(demands);
      const forecast = this.generateForecast(item, demands);
      const stockStatus = this.generateStockStatus(item, forecast);
      const aiInsights = this.generateAIInsights(item, stockStatus, weeklyDemand);
      
      return {
        ...item,
        forecast,
        weeklyDemand,
        demandVariability,
        stockStatus,
        aiInsights
      };
    });
  }
}

// PostgreSQL Storage Implementation
export class PostgreSQLStorage implements IStorage {
  private fallbackStorage: MemStorage;

  constructor() {
    this.fallbackStorage = new MemStorage();
  }

  private async getDatabaseConnection() {
    const { db, isConnected } = getDatabase();
    return { db, isConnected };
  }

  async getInventoryItems(): Promise<InventoryItem[]> {
    const { db, isConnected } = await this.getDatabaseConnection();
    
    if (!isConnected || !db) {
      console.log('📦 Using fallback storage for inventory items');
      return this.fallbackStorage.getInventoryItems();
    }

    try {
      const items = await db.select().from(inventoryItems);
      return items;
    } catch (error) {
      console.error('Database query failed, using fallback:', error);
      return this.fallbackStorage.getInventoryItems();
    }
  }

  async getInventoryItem(id: number): Promise<InventoryItem | undefined> {
    const { db, isConnected } = await this.getDatabaseConnection();
    
    if (!isConnected || !db) {
      return this.fallbackStorage.getInventoryItem(id);
    }

    try {
      const items = await db.select().from(inventoryItems).where(eq(inventoryItems.id, id)).limit(1);
      return items[0];
    } catch (error) {
      console.error('Database query failed, using fallback:', error);
      return this.fallbackStorage.getInventoryItem(id);
    }
  }

  async createInventoryItem(item: InsertInventoryItem): Promise<InventoryItem> {
    const { db, isConnected } = await this.getDatabaseConnection();
    
    if (!isConnected || !db) {
      return this.fallbackStorage.createInventoryItem(item);
    }

    try {
      const created = await db.insert(inventoryItems).values(item).returning();
      return created[0];
    } catch (error) {
      console.error('Database insert failed, using fallback:', error);
      return this.fallbackStorage.createInventoryItem(item);
    }
  }

  async updateInventoryItem(id: number, updates: Partial<InsertInventoryItem>): Promise<InventoryItem> {
    const { db, isConnected } = await this.getDatabaseConnection();
    
    if (!isConnected || !db) {
      return this.fallbackStorage.updateInventoryItem(id, updates);
    }

    try {
      const updated = await db.update(inventoryItems)
        .set(updates)
        .where(eq(inventoryItems.id, id))
        .returning();
      return updated[0];
    } catch (error) {
      console.error('Database update failed, using fallback:', error);
      return this.fallbackStorage.updateInventoryItem(id, updates);
    }
  }

  async getDemandHistory(itemId: number, days?: number): Promise<DemandHistory[]> {
    const { db, isConnected } = await this.getDatabaseConnection();
    
    if (!isConnected || !db) {
      return this.fallbackStorage.getDemandHistory(itemId, days);
    }

    try {
      let query = db.select().from(demandHistory)
        .where(eq(demandHistory.itemId, itemId))
        .orderBy(desc(demandHistory.date));

      if (days) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        query = db.select().from(demandHistory)
          .where(and(
            eq(demandHistory.itemId, itemId),
            gte(demandHistory.date, cutoffDate)
          ))
          .orderBy(desc(demandHistory.date));
      }

      const history = await query;
      return history;
    } catch (error) {
      console.error('Database query failed, using fallback:', error);
      return this.fallbackStorage.getDemandHistory(itemId, days);
    }
  }

  async addDemandHistory(demand: InsertDemandHistory): Promise<DemandHistory> {
    const { db, isConnected } = await this.getDatabaseConnection();
    
    if (!isConnected || !db) {
      return this.fallbackStorage.addDemandHistory(demand);
    }

    try {
      const created = await db.insert(demandHistory).values(demand).returning();
      return created[0];
    } catch (error) {
      console.error('Database insert failed, using fallback:', error);
      return this.fallbackStorage.addDemandHistory(demand);
    }
  }

  async getOrders(): Promise<Order[]> {
    const { db, isConnected } = await this.getDatabaseConnection();
    
    if (!isConnected || !db) {
      return this.fallbackStorage.getOrders();
    }

    try {
      const ordersList = await db.select().from(orders).orderBy(desc(orders.orderDate));
      return ordersList;
    } catch (error) {
      console.error('Database query failed, using fallback:', error);
      return this.fallbackStorage.getOrders();
    }
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    const { db, isConnected } = await this.getDatabaseConnection();
    
    if (!isConnected || !db) {
      return this.fallbackStorage.createOrder(order);
    }

    try {
      const created = await db.insert(orders).values(order).returning();
      return created[0];
    } catch (error) {
      console.error('Database insert failed, using fallback:', error);
      return this.fallbackStorage.createOrder(order);
    }
  }

  async updateOrderStatus(id: number, status: string): Promise<Order> {
    const { db, isConnected } = await this.getDatabaseConnection();
    
    if (!isConnected || !db) {
      return this.fallbackStorage.updateOrderStatus(id, status);
    }

    try {
      const updated = await db.update(orders)
        .set({ status })
        .where(eq(orders.id, id))
        .returning();
      return updated[0];
    } catch (error) {
      console.error('Database update failed, using fallback:', error);
      return this.fallbackStorage.updateOrderStatus(id, status);
    }
  }

  async getDashboardMetrics(): Promise<DashboardMetrics> {
    const { db, isConnected } = await this.getDatabaseConnection();
    
    if (!isConnected || !db) {
      return this.fallbackStorage.getDashboardMetrics();
    }

    try {
      // Get inventory metrics
      const items = await db.select().from(inventoryItems);
      const ordersList = await db.select().from(orders);
      
      const totalItems = items.length;
      const lowStockItems = items.filter(item => item.currentStock <= item.reorderPoint).length;
      const totalValue = items.reduce((sum, item) => sum + (item.currentStock * item.unitCost), 0);
      const pendingOrders = ordersList.filter(order => order.status === "pending").length;
      
      // Calculate turnover rate (simplified)
      const demands = await db.select().from(demandHistory);
      const totalDemand = demands.reduce((sum, d) => sum + d.quantity, 0);
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
    } catch (error) {
      console.error('Database query failed, using fallback:', error);
      return this.fallbackStorage.getDashboardMetrics();
    }
  }

  async getInventoryWithForecast(): Promise<InventoryItemWithForecast[]> {
    const { db, isConnected } = await this.getDatabaseConnection();
    
    if (!isConnected || !db) {
      return this.fallbackStorage.getInventoryWithForecast();
    }

    try {
      const items = await db.select().from(inventoryItems);
      const demands = await db.select().from(demandHistory);
      
      return items.map(item => {
        const itemDemands = demands.filter(d => d.itemId === item.id);
        const weeklyDemand = this.calculateWeeklyDemand(itemDemands);
        const demandVariability = this.calculateDemandVariability(itemDemands);
        const forecast = this.generateForecast(item, itemDemands);
        const stockStatus = this.generateStockStatus(item, forecast);
        const aiInsights = this.generateAIInsights(item, stockStatus, weeklyDemand);
        
        return {
          ...item,
          forecast,
          weeklyDemand,
          demandVariability,
          stockStatus,
          aiInsights
        };
      });
    } catch (error) {
      console.error('Database query failed, using fallback:', error);
      return this.fallbackStorage.getInventoryWithForecast();
    }
  }

  // Helper methods (reuse the same logic from MemStorage)
  private calculateWeeklyDemand(demands: DemandHistory[]): number {
    if (demands.length === 0) return 0;
    
    // Group demands by week and calculate average
    const weeklyTotals = new Map<string, number>();
    
    demands.forEach(demand => {
      const weekKey = this.getWeekKey(demand.date);
      weeklyTotals.set(weekKey, (weeklyTotals.get(weekKey) || 0) + demand.quantity);
    });
    
    const totalWeeklyDemand = Array.from(weeklyTotals.values()).reduce((sum, total) => sum + total, 0);
    return weeklyTotals.size > 0 ? totalWeeklyDemand / weeklyTotals.size : 0;
  }

  private calculateDemandVariability(demands: DemandHistory[]): number {
    if (demands.length < 2) return 0;
    
    const weeklyTotals = new Map<string, number>();
    demands.forEach(demand => {
      const weekKey = this.getWeekKey(demand.date);
      weeklyTotals.set(weekKey, (weeklyTotals.get(weekKey) || 0) + demand.quantity);
    });
    
    const values = Array.from(weeklyTotals.values());
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  private getWeekKey(date: Date): string {
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - date.getDay());
    return startOfWeek.toISOString().split('T')[0];
  }

  private generateForecast(item: InventoryItem, demands: DemandHistory[]): number[] {
    const weeklyDemand = this.calculateWeeklyDemand(demands);
    const forecast = [];
    
    // Generate 8 weeks of forecast
    for (let week = 1; week <= 8; week++) {
      // Add some realistic variation (±20%)
      const variation = (Math.random() - 0.5) * 0.4;
      const forecastValue = Math.max(0, weeklyDemand * (1 + variation));
      forecast.push(Math.round(forecastValue));
    }
    
    return forecast;
  }

  private generateStockStatus(item: InventoryItem, forecast: number[]): Array<{
    week: number;
    weekStartDate: string;
    weekEndDate: string;
    status: "enough" | "low" | "order";
    projectedStock: number;
    isHistorical: boolean;
  }> {
    const stockStatus = [];
    let currentStock = item.currentStock;
    const today = new Date();
    
    // Generate 4 weeks of historical data first
    for (let week = -4; week < 0; week++) {
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() + (week * 7));
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      
      // Simulate historical stock levels
      const historicalStock = Math.max(0, currentStock + (Math.random() * 20 - 10));
      
      stockStatus.push({
        week: week + 5, // Adjust week numbering
        weekStartDate: weekStart.toISOString().split('T')[0],
        weekEndDate: weekEnd.toISOString().split('T')[0],
        status: historicalStock <= item.reorderPoint ? "low" as const : "enough" as const,
        projectedStock: Math.round(historicalStock),
        isHistorical: true
      });
    }
    
    // Generate forecast weeks
    for (let week = 0; week < 8; week++) {
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() + (week * 7));
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      
      currentStock -= forecast[week] || 0;
      
      let status: "enough" | "low" | "order" = "enough";
      if (currentStock <= 0) {
        status = "order";
      } else if (currentStock <= item.reorderPoint) {
        status = "low";
      }
      
      stockStatus.push({
        week: week + 1,
        weekStartDate: weekStart.toISOString().split('T')[0],
        weekEndDate: weekEnd.toISOString().split('T')[0],
        status,
        projectedStock: Math.max(0, Math.round(currentStock)),
        isHistorical: false
      });
    }
    
    return stockStatus;
  }

  private generateAIInsights(item: InventoryItem, stockStatus: any[], weeklyDemand: number): string[] {
    const insights = [];
    
    const lowStockWeeks = stockStatus.filter(s => s.status === "low" && !s.isHistorical).length;
    const orderWeeks = stockStatus.filter(s => s.status === "order" && !s.isHistorical).length;
    
    if (orderWeeks > 0) {
      insights.push(`Critical: Stock will run out in ${orderWeeks} week(s). Order immediately.`);
    } else if (lowStockWeeks > 2) {
      insights.push(`Warning: Low stock predicted for ${lowStockWeeks} weeks. Consider reordering.`);
    }
    
    if (weeklyDemand > item.currentStock / 2) {
      insights.push("High demand detected. Monitor closely for stockouts.");
    }
    
    const turnoverWeeks = item.currentStock / Math.max(weeklyDemand, 1);
    if (turnoverWeeks > 12) {
      insights.push("Slow-moving inventory detected. Consider promotions or discounts.");
    }
    
    if (insights.length === 0) {
      insights.push("Stock levels appear healthy for the forecast period.");
    }
    
    return insights;
  }
}

// Storage classes are exported for dynamic initialization
