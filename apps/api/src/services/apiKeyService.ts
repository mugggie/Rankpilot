import crypto from 'crypto';
import { prisma } from '../prisma';

export interface APIKey {
  id: string;
  userId: string;
  name: string;
  key: string;
  permissions: string[];
  lastUsed?: Date | null;
  createdAt: Date;
  expiresAt?: Date | null;
}

export class APIKeyService {
  public async generateAPIKey(
    userId: string,
    name: string,
    permissions: string[] = ['read'],
  ): Promise<APIKey> {
    const key = `rkp_${crypto.randomBytes(32).toString('hex')}`;

    const apiKey = await prisma.aPIKey.create({
      data: {
        userId,
        name,
        key: this.hashKey(key),
        permissions: permissions,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      },
    });

    return {
      ...apiKey,
      key, // Return the unhashed key for the user
      lastUsed: apiKey.lastUsed || undefined,
    };
  }

  public async validateAPIKey(key: string): Promise<APIKey | null> {
    const hashedKey = this.hashKey(key);

    const apiKey = await prisma.aPIKey.findFirst({
      where: {
        key: hashedKey,
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        user: true,
      },
    });

    if (!apiKey) return null;

    // Update last used
    await prisma.aPIKey.update({
      where: { id: apiKey.id },
      data: { lastUsed: new Date() },
    });

    return {
      id: apiKey.id,
      userId: apiKey.userId,
      name: apiKey.name,
      key: key,
      permissions: apiKey.permissions as string[],
      lastUsed: apiKey.lastUsed || undefined,
      createdAt: apiKey.createdAt,
      expiresAt: apiKey.expiresAt || undefined,
    };
  }

  public async getUserAPIKeys(userId: string): Promise<Omit<APIKey, 'key'>[]> {
    const apiKeys = await prisma.aPIKey.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return apiKeys.map((key: any) => ({
      id: key.id,
      userId: key.userId,
      name: key.name,
      permissions: key.permissions as string[],
      lastUsed: key.lastUsed || undefined,
      createdAt: key.createdAt,
      expiresAt: key.expiresAt || undefined,
    }));
  }

  public async revokeAPIKey(keyId: string, userId: string): Promise<boolean> {
    const result = await prisma.aPIKey.deleteMany({
      where: {
        id: keyId,
        userId,
      },
    });

    return result.count > 0;
  }

  public async checkPermission(apiKey: APIKey, permission: string): Promise<boolean> {
    return apiKey.permissions.includes(permission) || apiKey.permissions.includes('admin');
  }

  private hashKey(key: string): string {
    return crypto.createHash('sha256').update(key).digest('hex');
  }
}
