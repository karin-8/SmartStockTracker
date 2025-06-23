import { useQuery } from "@tanstack/react-query";
import { Boxes, Plus, Filter, Download, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MetricsCards } from "@/components/metrics-cards";
import { ForecastTable } from "@/components/forecast-table";
import { OrderForm } from "@/components/order-form";
import { AIInsights } from "@/components/ai-insights";
import { StockChart } from "@/components/stock-chart";
import type { InventoryItemWithForecast, DashboardMetrics } from "@shared/schema";

export default function Dashboard() {
  const { data: metrics, isLoading: metricsLoading } = useQuery<DashboardMetrics>({
    queryKey: ["/api/dashboard/metrics"],
  });

  const { data: inventory, isLoading: inventoryLoading, refetch } = useQuery<InventoryItemWithForecast[]>({
    queryKey: ["/api/inventory/forecast"],
  });

  const handleRefresh = () => {
    refetch();
  };

  const isLoading = metricsLoading || inventoryLoading;

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Header Navigation */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Boxes className="text-blue-600 text-2xl" />
                <h1 className="text-2xl font-bold text-gray-900">SmartStock</h1>
              </div>
              <nav className="hidden md:flex space-x-8">
                <a href="#dashboard" className="text-blue-600 border-b-2 border-blue-600 font-medium py-2">
                  Dashboard
                </a>
                <a href="#inventory" className="text-gray-600 hover:text-gray-900 py-2">
                  Inventory
                </a>
                <a href="#orders" className="text-gray-600 hover:text-gray-900 py-2">
                  Orders
                </a>
                <a href="#analytics" className="text-gray-600 hover:text-gray-900 py-2">
                  Analytics
                </a>
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              <Button className="bg-blue-600 text-white hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                New Order
              </Button>
              <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard Overview */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">Inventory Dashboard</h2>
              <p className="text-gray-600 mt-1">Monitor stock levels and optimize your inventory</p>
            </div>
            <div className="flex items-center space-x-2 mt-4 sm:mt-0">
              <span className="text-sm text-gray-500">Last updated:</span>
              <span className="text-sm font-medium text-gray-900">2 minutes ago</span>
              <Button variant="ghost" size="sm" onClick={handleRefresh}>
                <RotateCcw className="w-4 h-4 text-gray-400 hover:text-gray-600" />
              </Button>
            </div>
          </div>

          <MetricsCards metrics={metrics} isLoading={isLoading} />
        </div>

        {/* 7-Day Forecast Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-8">
          <ForecastTable inventory={inventory} isLoading={isLoading} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <OrderForm inventory={inventory} />
          <AIInsights inventory={inventory} metrics={metrics} />
        </div>

        <StockChart inventory={inventory} />
      </div>
    </div>
  );
}
