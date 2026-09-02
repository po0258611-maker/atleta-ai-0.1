import assert from 'node:assert/strict';
import { MemoryFirestoreAdapter, setFirestoreAdapter } from '../repositories/firestoreAdapter';
import { UsageRepository } from '../repositories/usageRepository';

async function run() {
  setFirestoreAdapter(new MemoryFirestoreAdapter());
  const usage = new UsageRepository();
  const userId = `ai-fallback-release-${Date.now()}`;

  const consumed = await usage.consumeAtomic(userId, 'AI_COACH_MESSAGES', 10, 1);
  assert.equal(consumed.success, true);
  assert.equal(await usage.getMonthlyUsage(userId, 'AI_COACH_MESSAGES'), 1);

  const released = await usage.releaseAtomic(userId, 'AI_COACH_MESSAGES', 1);
  assert.equal(released.success, true);
  assert.equal(released.currentUsage, 0);
  assert.equal(await usage.getMonthlyUsage(userId, 'AI_COACH_MESSAGES'), 0);

  const overReleased = await usage.releaseAtomic(userId, 'AI_COACH_MESSAGES', 1);
  assert.equal(overReleased.success, false);
  assert.equal(overReleased.currentUsage, 0);
  assert.equal(await usage.getMonthlyUsage(userId, 'AI_COACH_MESSAGES'), 0);

  console.log('✓ AI quota release is atomic and never decrements below zero.');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
