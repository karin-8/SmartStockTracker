import { Package, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { InventoryItemWithForecast } from "@shared/schema";

interface ForecastTableProps {
  inventory?: InventoryItemWithForecast[];
  isLoading: boolean;
}

export function ForecastTable({ inventory, isLoading }: ForecastTableProps) {
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
            {[...Array(7)].map((_, i) => (
              <th key={i} className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Day {i + 1}
              </th>
            ))}
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Action
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {inventory.map((item) => (
            <tr key={item.id} className="hover:bg-gray-50">
              <td className="px-6 py-4">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-gray-200 rounded-lg mr-3 flex items-center justify-center">
                    <Package className="text-gray-500 w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">{item.name}</div>
                    <div className="text-sm text-gray-500">SKU: {item.sku}</div>
                  </div>
                </div>
              </td>
              <td className="px-4 py-4 text-center">
                <span className="font-mono text-sm font-medium text-gray-900">
                  {item.currentStock}
                </span>
              </td>
              {item.stockStatus.map((status, index) => (
                <td key={index} className="px-4 py-4 text-center">
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
    </div>
  );
}
