export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { default: cron } = await import('node-cron');
    const { syncRooms } = await import('@/lib/channel-manager/sync-engine');

    console.log('[CRON] Registering iCal sync job — every 15 minutes');

    // Run immediately on startup (delayed slightly to not block initial compilation)
    setTimeout(() => {
      syncRooms().catch(err => console.error('[CRON] Initial sync failed:', err));
    }, 5000);

    // Schedule every 15 minutes
    cron.schedule('*/15 * * * *', async () => {
      console.log('[CRON] Running scheduled iCal sync...');
      try {
        const results = await syncRooms();
        console.log('[CRON] Sync complete:', results);
      } catch (err) {
        console.error('[CRON] Scheduled sync failed:', err);
      }
    });
  }
}
