# SmartStock - Inventory Management System

## Overview
A comprehensive full-stack inventory management system with demand forecasting, stock optimization, and analytics designed for warehouse and retail managers. The application provides data-driven insights for stock replenishment decisions using advanced inventory management calculations.

## Recent Changes
- **Database Integration (June 23, 2025)**: Successfully migrated from in-memory storage to PostgreSQL database
  - Implemented Drizzle ORM with proper schema models
  - Created database storage layer replacing MemStorage
  - All inventory data now persists between sessions
- **Enhanced Features**: Added comprehensive filtering system, export functionality, and fixed order creation
- **AI-Powered Insights**: Implemented demand forecasting with EOQ, ROP, and safety stock calculations

## Project Architecture

### Frontend (React + TypeScript)
- **Framework**: React with Vite, TypeScript, TailwindCSS
- **State Management**: TanStack Query for server state
- **Routing**: Wouter for client-side routing
- **UI Components**: Shadcn/ui component library
- **Charts**: Chart.js for stock level visualizations
- **Export**: jsPDF and XLSX for document generation

### Backend (Node.js + Express)
- **Runtime**: Node.js with Express server
- **Database**: PostgreSQL with Drizzle ORM
- **Schema**: Type-safe database models with Zod validation
- **Storage**: DatabaseStorage class implementing IStorage interface

### Key Features Implemented
1. **Dashboard Analytics**
   - Real-time metrics (total items, low stock alerts, inventory value)
   - AI-generated insights and recommendations
   - Turnover rate and stockout frequency calculations

2. **Demand Forecasting**
   - 7-day stock predictions with color-coded status
   - Moving average calculations for demand patterns
   - Stock status indicators (Enough/Low/Order)

3. **Order Management**
   - EOQ (Economic Order Quantity) calculations
   - Automated reorder point recommendations
   - Order creation with PDF/Excel export capabilities

4. **Advanced Filtering & Export**
   - Multi-criteria filtering (category, supplier, status)
   - Excel export for inventory summaries
   - Real-time filter indicators and clearing

5. **Interactive Visualizations**
   - Stock level trends with historical data
   - Reorder point and safety stock indicators
   - 7/30/90 day view options

## Database Schema
- **inventory_items**: Core inventory data with costs and thresholds
- **demand_history**: Historical demand patterns for forecasting
- **orders**: Purchase orders with status tracking

## User Preferences
- Prefers comprehensive solutions with full functionality
- Values data-driven insights and professional UI/UX
- Expects working features without placeholders or mock data

## Technical Stack
- Node.js 20, PostgreSQL, Drizzle ORM
- React, TypeScript, TailwindCSS, Shadcn/ui
- Chart.js, jsPDF, XLSX for visualizations and exports
- Comprehensive inventory management calculations library