class UsageRepository {
  // Key: `${userId}:${metric}:${periodDate}`
  private usages: Map<string, number> = new Map();

  private getCurrentPeriod(): string {
    const d = new Date();
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    return `${year}-${month}`; // YYYY-MM
  }

  async getMonthlyUsage(userId: string, metric: string): Promise<number> {
    const key = `${userId}:${metric}:${this.getCurrentPeriod()}`;
    return this.usages.get(key) || 0;
  }

  async incrementUsage(userId: string, metric: string, delta: number = 1): Promise<number> {
    const key = `${userId}:${metric}:${this.getCurrentPeriod()}`;
    const current = this.usages.get(key) || 0;
    const updated = current + delta;
    this.usages.set(key, updated);
    return updated;
  }

  async resetUsage(userId: string, metric: string): Promise<void> {
    const key = `${userId}:${metric}:${this.getCurrentPeriod()}`;
    this.usages.delete(key);
  }
}

export const usageRepository = new UsageRepository();
