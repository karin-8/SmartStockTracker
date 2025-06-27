import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { InventoryItemWithForecast } from "@shared/schema";

interface StockChartProps {
  inventory?: InventoryItemWithForecast[];
}

export function StockChart({ inventory }: StockChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<any>(null);
  const [selectedItemId, setSelectedItemId] = useState<string>("");

  const selectedItem = inventory?.find(
    (item) => item.id.toString() === selectedItemId,
  );

  useEffect(() => {
    if (inventory && inventory.length > 0 && !selectedItemId) {
      setSelectedItemId(inventory[0].id.toString());
    }
  }, [inventory, selectedItemId]);

  useEffect(() => {
    const loadChart = async () => {
      if (!selectedItem || !canvasRef.current) return;

      const { Chart, registerables } = await import("chart.js");
      Chart.register(...registerables);

      if (chartRef.current) {
        chartRef.current.destroy();
      }

      const ctx = canvasRef.current.getContext("2d");
      if (!ctx) return;

      const labels = [
        "W-4",
        "W-3",
        "W-2",
        "W-1",
        "Current",
        "W+1",
        "W+2",
        "W+3",
        "W+4",
        "W+5",
        "W+6",
        "W+7",
        "W+8",
      ];
      const stockLevelData: (number | null)[] = [];
      const forecastData: (number | null)[] = [];
      const ropData: number[] = [];
      const safetyStockData: number[] = [];

      // Historical weeks (W-4 to W-1)
      selectedItem.stockStatus.slice(0, 4).forEach((status) => {
        stockLevelData.push(status.projectedStock);
        forecastData.push(null);
      });

      // Current Stock
      stockLevelData.push(selectedItem.currentStock);
      forecastData.push(null);

      // Forecast weeks (W+1 to W+8)
      selectedItem.stockStatus.slice(4).forEach((status) => {
        stockLevelData.push(null);
        forecastData.push(status.projectedStock);
      });

      // ROP and Safety Stock (flat lines)
      for (let i = 0; i < labels.length; i++) {
        ropData.push(selectedItem.reorderPoint);
        safetyStockData.push(selectedItem.safetyStock);
      }

      chartRef.current = new Chart(ctx, {
        type: "line",
        data: {
          labels,
          datasets: [
            {
              label: "Stock Level",
              data: stockLevelData,
              borderColor: "hsl(207, 90%, 54%)",
              backgroundColor: "hsl(207, 90%, 54%)",
              borderWidth: 2,
              fill: false,
              tension: 0.1,
              pointRadius: 3,
            },
            {
              label: "Forecast",
              data: forecastData,
              borderColor: "hsl(25, 5.3%, 44.7%)",
              backgroundColor: "hsl(25, 5.3%, 44.7%)",
              borderWidth: 2,
              borderDash: [5, 5],
              fill: false,
              tension: 0.1,
              pointRadius: 3,
            },
            {
              label: "Reorder Point",
              data: ropData,
              borderColor: "hsl(0, 84.2%, 60.2%)",
              borderWidth: 2,
              borderDash: [5, 5],
              fill: false,
              pointRadius: 0,
            },
            {
              label: "Safety Stock",
              data: safetyStockData,
              borderColor: "hsl(25, 95%, 53%)",
              borderWidth: 2,
              borderDash: [10, 5],
              fill: false,
              pointRadius: 0,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: "Stock Quantity",
              },
            },
            x: {
              title: {
                display: true,
                text: "Week",
              },
            },
          },
          plugins: {
            legend: {
              display: false,
            },
            tooltip: {
              mode: "index",
              intersect: false,
            },
          },
        },
      });
    };

    loadChart();

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, [selectedItem]);

  if (!inventory || inventory.length === 0) {
    return (
      <Card className="shadow-sm border border-gray-100">
        <CardHeader>
          <CardTitle>Stock Level Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-gray-500">No inventory data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm border border-gray-100">
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
          <div>
            <CardTitle className="text-xl font-semibold text-gray-900">
              Stock Level Trends
            </CardTitle>
            <p className="text-sm text-gray-600 mt-1"></p>
          </div>
          <Select value={selectedItemId} onValueChange={setSelectedItemId}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {inventory.map((item) => (
                <SelectItem key={item.id} value={item.id.toString()}>
                  {item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <canvas ref={canvasRef} className="w-full h-full" />
        </div>
        <div className="flex justify-center mt-4 space-x-6">
          <LegendDot color="hsl(207, 90%, 54%)" label="Stock Level" />
          <LegendDot color="hsl(0, 84.2%, 60.2%)" label="Reorder Point" />
          <LegendDot color="hsl(25, 95%, 53%)" label="Safety Stock" />
          <LegendDot color="hsl(25, 5.3%, 44.7%)" label="Forecast" />
        </div>
      </CardContent>
    </Card>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center">
      <div
        className="w-3 h-3 rounded mr-2"
        style={{ backgroundColor: color }}
      ></div>
      <span className="text-sm text-gray-600">{label}</span>
    </div>
  );
}
