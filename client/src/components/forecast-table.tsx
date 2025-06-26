import { useState } from "react";
import { Package, ArrowRight, Filter, Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { exportInventorySummary } from "@/lib/export-utils";
import type { InventoryItemWithForecast } from "@shared/schema";

interface ForecastTableProps {
  inventory?: InventoryItemWithForecast[];
  isLoading: boolean;
}

export function ForecastTable({ inventory, isLoading }: ForecastTableProps) {
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [supplierFilter, setSupplierFilter] = useState<string>("all");

  if (isLoading) {
    return (
      <div className="overflow-x-auto">
        <div className="p-6 space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!inventory || inventory.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No inventory data available</p>
      </div>
    );
  }

  // Get unique values for filters
  const categorySet = new Set<string>();
  const supplierSet = new Set<string>();
  inventory.forEach(item => {
    categorySet.add(item.category);
    supplierSet.add(item.supplier);
  });
  const categories = Array.from(categorySet);
  const suppliers = Array.from(supplierSet);

  // Apply filters
  const filteredInventory = inventory.filter(item => {
    const categoryMatch = categoryFilter === "all" || item.category === categoryFilter;
    const supplierMatch = supplierFilter === "all" || item.supplier === supplierFilter;
    
    let statusMatch = true;
    if (statusFilter === "critical") {
      statusMatch = item.stockStatus.some(s => s.status === "order");
    } else if (statusFilter === "low") {
      statusMatch = item.stockStatus.some(s => s.status === "low");
    } else if (statusFilter === "ok") {
      statusMatch = item.stockStatus.every(s => s.status === "enough");
    }
    
    return categoryMatch && supplierMatch && statusMatch;
  });

  const handleExport = () => {
    exportInventorySummary(filteredInventory);
  };

  const clearFilters = () => {
    setCategoryFilter("all");
    setStatusFilter("all");
    setSupplierFilter("all");
  };

  const hasActiveFilters = categoryFilter !== "all" || statusFilter !== "all" || supplierFilter !== "all";

  const getStatusBadge = (status: "enough" | "low" | "order") => {
    switch (status) {
      case "enough":
        return <Badge className="bg-green-100 text-green-800 text-xs">Enough</Badge>;
      case "low":
        return <Badge className="bg-yellow-100 text-yellow-800 text-xs">Low</Badge>;
      case "order":
        return <Badge className="bg-red-100 text-red-800 text-xs">Order</Badge>;
    }
  };

  const getActionButton = (item: InventoryItemWithForecast) => {
    const hasOrderStatus = item.stockStatus.some(s => s.status === "order");
    const hasLowStatus = item.stockStatus.some(s => s.status === "low");

    if (hasOrderStatus) {
      return (
        <Button variant="link" className="text-red-600 hover:text-red-800 text-sm font-semibold p-0">
          URGENT
        </Button>
      );
    } else if (hasLowStatus) {
      return (
        <Button variant="link" className="text-orange-600 hover:text-orange-800 text-sm p-0">
          Plan Order
        </Button>
      );
    } else {
      return (
        <Button variant="link" className="text-gray-400 text-sm p-0">
          Good
        </Button>
      );
    }
  };

  return (
    <>
      {/* Filter and Export Controls */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">12-Week Stock Forecast</h3>
            <p className="text-sm text-gray-600 mt-1">
              Predicted stock status for the next 12 weeks • Showing {filteredInventory.length} of {inventory.length} items
            </p>
          </div>
          <div className="flex items-center space-x-2 mt-4 sm:mt-0">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={hasActiveFilters ? "bg-blue-50 border-blue-200" : ""}>
                  <Filter className="w-4 h-4 mr-1" />
                  Filter
                  {hasActiveFilters && <span className="ml-1 text-xs bg-blue-100 text-blue-800 px-1 rounded">Active</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-4" align="end">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-gray-900">Filter Options</h4>
                    {hasActiveFilters && (
                      <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs">
                        <X className="w-3 h-3 mr-1" />
                        Clear
                      </Button>
                    )}
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">Category</label>
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {categories.map(category => (
                          <SelectItem key={category} value={category}>{category}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">Status</label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="critical">Critical (Order Now)</SelectItem>
                        <SelectItem value="low">Low Stock</SelectItem>
                        <SelectItem value="ok">Stock OK</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">Supplier</label>
                    <Select value={supplierFilter} onValueChange={setSupplierFilter}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Suppliers</SelectItem>
                        {suppliers.map(supplier => (
                          <SelectItem key={supplier} value={supplier}>{supplier}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="w-4 h-4 mr-1" />
              Export
            </Button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Item
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Current
              </th>
              {[...Array(12)].map((_, i) => (
                <th key={i} className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Week {i + 1}
                </th>
              ))}
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredInventory.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-gray-200 rounded-lg mr-3 flex items-center justify-center">
                      <Package className="text-gray-500 w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">{item.name}</div>
                      <div className="text-sm text-gray-500">SKU: {item.sku}</div>
                      <div className="text-xs text-gray-400">{item.supplier} • {item.category}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4 text-center">
                  <span className="font-mono text-sm font-medium text-gray-900">
                    {item.currentStock}
                  </span>
                </td>
                {item.stockStatus.map((status, index) => (
                  <td key={index} className="px-3 py-4 text-center">
                    {getStatusBadge(status.status)}
                  </td>
                ))}
                <td className="px-6 py-4 text-right">
                  {getActionButton(item)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {filteredInventory.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">No items match the current filters</p>
            <Button variant="link" onClick={clearFilters} className="text-blue-600 mt-2">
              Clear filters to see all items
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
