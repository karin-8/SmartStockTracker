import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { InventoryItemWithForecast } from "@shared/schema";

interface StockChartProps {
  inventory?: InventoryItemWithForecast[];
}

export function StockChart({ inventory }: StockChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<any>(null);
  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [timeRange, setTimeRange] = useState<"12W" | "24W" | "52W">("24W");

  const selectedItem = inventory?.find(item => item.id.toString() === selectedItemId);

  useEffect(() => {
    if (inventory && inventory.length > 0 && !selectedItemId) {
      setSelectedItemId(inventory[0].id.toString());
    }
  }, [inventory, selectedItemId]);

  useEffect(() => {
    const loadChart = async () => {
      if (!selectedItem || !canvasRef.current) return;

      // Dynamically import Chart.js
      const { Chart, registerables } = await import('chart.js');
      Chart.register(...registerables);

      // Destroy existing chart
      if (chartRef.current) {
        chartRef.current.destroy();
      }

      const ctx = canvasRef.current.getContext('2d');
      if (!ctx) return;

      // Generate data based on time range
      const getWeeksCount = () => {
        switch (timeRange) {
          case "12W": return 12;
          case "24W": return 24;
          case "52W": return 52;
          default: return 24;
        }
      };

      const weeksCount = getWeeksCount();
      const labels = [];
      const stockData = [];
      const ropData = [];
      const safetyStockData = [];
      const forecastData = [];

      // Generate historical data (past weeks)
      for (let i = -weeksCount + 12; i <= 0; i++) {
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() + (i * 7));
        labels.push(weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
        
        // Simulate historical stock level with some variance
        const baseStock = selectedItem.currentStock + (Math.abs(i) * selectedItem.weeklyDemand);
        const variance = Math.random() * 20 - 10;
        stockData.push(Math.max(0, baseStock + variance));
        
        ropData.push(selectedItem.reorderPoint);
        safetyStockData.push(selectedItem.safetyStock);
        forecastData.push(null);
      }

      // Add forecast data (next 12 weeks)
      for (let i = 1; i <= 12; i++) {
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() + (i * 7));
        labels.push(weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
        
        stockData.push(null);
        ropData.push(selectedItem.reorderPoint);
        safetyStockData.push(selectedItem.safetyStock);
        
        // Use the forecast data from the item
        const projectedStock = selectedItem.stockStatus[i - 1]?.projectedStock || 0;
        forecastData.push(projectedStock);
      }

      chartRef.current = new Chart(ctx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [
            {
              label: 'Historical Stock',
              data: stockData,
              borderColor: 'hsl(207, 90%, 54%)',
              backgroundColor: 'hsl(207, 90%, 54%)',
              borderWidth: 2,
              fill: false,
              tension: 0.1,
              pointRadius: 2,
            },
            {
              label: 'Forecast',
              data: forecastData,
              borderColor: 'hsl(25, 5.3%, 44.7%)',
              backgroundColor: 'hsl(25, 5.3%, 44.7%)',
              borderWidth: 2,
              borderDash: [5, 5],
              fill: false,
              tension: 0.1,
              pointRadius: 2,
            },
            {
              label: 'Reorder Point',
              data: ropData,
              borderColor: 'hsl(0, 84.2%, 60.2%)',
              backgroundColor: 'hsl(0, 84.2%, 60.2%)',
              borderWidth: 2,
              borderDash: [5, 5],
              fill: false,
              pointRadius: 0,
            },
            {
              label: 'Safety Stock',
              data: safetyStockData,
              borderColor: 'hsl(25, 95%, 53%)',
              backgroundColor: 'hsl(25, 95%, 53%)',
              borderWidth: 2,
              borderDash: [10, 5],
              fill: false,
              pointRadius: 0,
            },
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: 'Stock Quantity'
              }
            },
            x: {
              title: {
                display: true,
                text: 'Date'
              }
            }
          },
          plugins: {
            legend: {
              display: false
            },
            tooltip: {
              mode: 'index',
              intersect: false
            }
          }
        }
      });
    };

    loadChart();

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, [selectedItem, timeRange]);

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
            <CardTitle className="text-xl font-semibold text-gray-900">Stock Level Trends</CardTitle>
            <p className="text-sm text-gray-600 mt-1">Historical and projected weekly stock levels with ROP indicators</p>
          </div>
          <div className="flex items-center space-x-2 mt-4 sm:mt-0">
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
            <div className="flex space-x-1">
              <Button
                variant={timeRange === "12W" ? "default" : "outline"}
                size="sm"
                onClick={() => setTimeRange("12W")}
              >
                12W
              </Button>
              <Button
                variant={timeRange === "24W" ? "default" : "outline"}
                size="sm"
                onClick={() => setTimeRange("24W")}
              >
                24W
              </Button>
              <Button
                variant={timeRange === "52W" ? "default" : "outline"}
                size="sm"
                onClick={() => setTimeRange("52W")}
              >
                52W
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <canvas ref={canvasRef} className="w-full h-full" />
        </div>
        <div className="flex justify-center mt-4 space-x-6">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-blue-600 rounded mr-2"></div>
            <span className="text-sm text-gray-600">Stock Level</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-red-600 rounded mr-2"></div>
            <span className="text-sm text-gray-600">Reorder Point</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-orange-600 rounded mr-2"></div>
            <span className="text-sm text-gray-600">Safety Stock</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-gray-400 rounded mr-2"></div>
            <span className="text-sm text-gray-600">Forecast</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
