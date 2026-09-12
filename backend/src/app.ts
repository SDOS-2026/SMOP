import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from './config';
import { errorHandler } from './middleware/errorHandler';
import { requestContext } from './middleware/requestContext';
import { live, ready } from './modules/health/health.controller';

// Route imports
import authRoutes from './modules/auth/auth.routes';
import suppliersRoutes from './modules/suppliers/suppliers.routes';
import purchaseOrderRoutes from './modules/purchaseOrders/purchaseOrders.routes';
import materialRoutes from './modules/materials/materials.routes';
import inventoryRoutes from './modules/inventory/inventory.routes';
import manufacturingRoutes from './modules/manufacturing/manufacturing.routes';
import salesRoutes from './modules/sales/sales.routes';
import reportsRoutes from './modules/reports/reports.routes';
import auditRoutes from './modules/audit/audit.routes';
import copilotRoutes from './modules/copilot/copilot.routes';

const app = express();
app.disable('x-powered-by');

// ============================================================================
// GLOBAL MIDDLEWARE
// ============================================================================

// CORS — allow frontend origin with credentials
app.use(requestContext);
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (config.env === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});
app.use(cors({
  origin(origin, callback) {
    if (!origin || config.cors.origins.includes(origin)) return callback(null, true);
    return callback(new Error('Origin is not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parsing
app.use(express.json({ limit: config.http.bodyLimit }));
app.use(express.urlencoded({ extended: true }));

// Cookie parsing (for JWT in HTTP-only cookies)
app.use(cookieParser());

// ============================================================================
// HEALTH CHECK
// ============================================================================

app.get('/api/health', live);
app.get('/api/health/live', live);
app.get('/api/health/ready', ready);

// ============================================================================
// API ROUTES
// ============================================================================

app.use('/api/auth', authRoutes);
app.use('/api/suppliers', suppliersRoutes);
app.use('/api/purchase-order', purchaseOrderRoutes);
app.use('/api/material', materialRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api', manufacturingRoutes);  // Mounts /api/process/*, /api/bom/*, /api/feasibility/*, /api/worker/*
app.use('/api', salesRoutes);          // Mounts /api/customer/*, /api/quotation/*, /api/order/*
app.use('/api/reports', reportsRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/copilot', copilotRoutes);

// ============================================================================
// 404 HANDLER
// ============================================================================

app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    requestId: res.locals.requestId,
  });
});

// ============================================================================
// ERROR HANDLER (must be last)
// ============================================================================

app.use(errorHandler);

export default app;
