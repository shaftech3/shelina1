import { prisma } from './prisma.js';
import { env } from './env.js';
import { hashPassword } from './auth.js';

/**
 * ============================================================================
 * SINGLE ADMIN ACCOUNT BOOTSTRAP & SYNCHRONIZATION
 * ============================================================================
 *
 * Enforces the core business rule: Shelina has EXACTLY ONE admin account.
 *
 * Source of truth:
 *   ADMIN_EMAIL (default: shelinaoffical@gmail.com)
 *   ADMIN_PASSWORD (environment variable only, never committed)
 *
 * This function:
 *   1. Guarantees the admin account exists in PostgreSQL.
 *   2. Synchronizes email, name, and bcrypt-hashed password from environment.
 *   3. Enforces that exactly one admin account exists (prunes any stray accounts).
 *   4. Ensures passwords are only ever stored as bcrypt hashes.
 */
export async function bootstrapSingleAdmin(): Promise<void> {
  const adminEmail = env.adminEmail;
  const adminPassword = env.adminPassword;
  const adminName = env.adminName;

  try {
    const existingAdmins = await prisma.adminUser.findMany({
      orderBy: { createdAt: 'asc' },
    });

    if (existingAdmins.length === 0) {
      if (adminPassword && adminPassword.length >= 6) {
        const passwordHash = await hashPassword(adminPassword);
        await prisma.adminUser.create({
          data: {
            email: adminEmail,
            name: adminName,
            passwordHash,
            role: 'admin',
          },
        });
        console.log(`[admin] Initialized single admin account for ${adminEmail}`);
      } else {
        console.warn(
          `[admin] No admin account exists in PostgreSQL and ADMIN_PASSWORD is not set. Set ADMIN_PASSWORD in environment.`,
        );
      }
      return;
    }

    // Find the primary admin: matching email, or the first existing record
    const primaryAdmin =
      existingAdmins.find((a: { email: string }) => a.email.toLowerCase() === adminEmail) ?? existingAdmins[0];

    const updateData: { email?: string; name?: string; passwordHash?: string } = {};

    if (primaryAdmin.email.toLowerCase() !== adminEmail) {
      updateData.email = adminEmail;
    }
    if (adminName && primaryAdmin.name !== adminName) {
      updateData.name = adminName;
    }
    if (adminPassword && adminPassword.length >= 6) {
      updateData.passwordHash = await hashPassword(adminPassword);
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.adminUser.update({
        where: { id: primaryAdmin.id },
        data: updateData,
      });
      console.log(
        `[admin] Synchronized single admin account (${primaryAdmin.id}) to ${adminEmail}`,
      );
    }

    // Enforce single admin account guarantee: remove any extraneous admin rows
    if (existingAdmins.length > 1) {
      const extraIds = existingAdmins
        .filter((a: { id: string }) => a.id !== primaryAdmin.id)
        .map((a: { id: string }) => a.id);
      await prisma.adminUser.deleteMany({
        where: { id: { in: extraIds } },
      });
      console.log(
        `[admin] Removed ${extraIds.length} duplicate admin account(s) to enforce exactly 1 admin identity`,
      );
    }
  } catch (error) {
    console.error('[admin] Admin account bootstrap/synchronization error:', error);
  }
}
