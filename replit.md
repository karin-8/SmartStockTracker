# SmartStock - Inventory Management System

## Overview
A full-stack inventory management system with demand forecasting, stock optimization, and analytics for warehouse managers. The system uses weekly granularity for demand forecasting and provides 12-week predictions.

## Project Architecture
- **Frontend**: React with TypeScript, Wouter routing, shadcn/ui components
- **Backend**: Express.js with TypeScript
- **Data**: In-memory storage with sample inventory data
- **Charts**: Chart.js for stock level visualization
- **Export**: jsPDF and xlsx for order exports

## Key Features
- Dashboard with key metrics (total items, low stock alerts, total value, pending orders)
- 12-week stock forecast table with color-coded status indicators
- Advanced filtering by category, status, and supplier
- AI-powered insights and recommendations
- Order creation form with EOQ calculations
- Interactive stock level charts with historical and forecast data
- PDF and Excel export functionality

## Recent Changes
**2024-12-26**: Changed granularity from daily to weekly
- Updated forecast to show 12 weeks instead of 7 days
- Modified all calculations to use weekly demand patterns
- Updated UI components to display weekly data
- Implemented comprehensive filtering and export features

## User Preferences
- Prefers weekly granularity over daily for better long-term planning
- Wants to see 12-week forecasts for strategic inventory management

## Technical Decisions
- Using in-memory storage for development/demo purposes
- Weekly demand calculations based on historical data grouping
- AI insights based on weekly consumption patterns
- Export functionality supports both filtered and full inventory data