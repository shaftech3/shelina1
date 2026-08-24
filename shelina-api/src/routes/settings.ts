import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAdmin } from '../middleware/authGuards.js';
import { settingsInputSchema } from '../validation/schemas.js';
import { serializeSettings } from '../services/serialize.js';

export const settingsRouter = Router();

const SETTINGS_ID = 'settings';

const DEFAULT_SETTINGS = {
  shippingFee: 250,
  freeShippingThreshold: 0,
  contactPhone: '+92 300 1234567',
  contactEmail: 'support@shelina.pk',
  whatsappNumber: '+923001234567',
};

/**
 * Public endpoint to fetch active store settings (including delivery charges).
 */
settingsRouter.get('/', async (_req, res, next) => {
  try {
    let settings = await prisma.storeSettings.findUnique({
      where: { id: SETTINGS_ID },
    });

    if (!settings) {
      settings = await prisma.storeSettings.upsert({
        where: { id: SETTINGS_ID },
        update: {},
        create: { id: SETTINGS_ID, ...DEFAULT_SETTINGS },
      });
    }

    res.json({ success: true, data: serializeSettings(settings) });
  } catch (error) {
    next(error);
  }
});

/**
 * Admin endpoint to update store settings and delivery charges.
 */
settingsRouter.put('/', requireAdmin, async (req, res, next) => {
  try {
    const input = settingsInputSchema.parse(req.body);
    const settings = await prisma.storeSettings.upsert({
      where: { id: SETTINGS_ID },
      update: input,
      create: { id: SETTINGS_ID, ...DEFAULT_SETTINGS, ...input },
    });

    res.json({ success: true, data: serializeSettings(settings) });
  } catch (error) {
    next(error);
  }
});
