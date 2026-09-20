# Fix for Traffic Fine Notification UI

## Problem
When logging a traffic fine, the edge function `notify-driver-fine` successfully sends the email, but the UI still shows **"Not notified yet"** because `email_sent` stays `false` in localStorage (and the list is rendered from local data).

## Root cause
`handleSaveFine` and `handleResendFineEmail` save the fine with `email_sent: false`, call the edge function, then call `refreshData()` which only reads localStorage. They never update the local record (or re-sync) after a successful invoke.

## Fix
After a successful `supabase.functions.invoke('notify-driver-fine', ...)`, immediately call `trafficFinesApi.saveFine(...)` again with `email_sent: true` and `email_sent_at` set.

### In `components/AdminDashboard.tsx`

Replace the try/catch inside `handleSaveFine` with:

```tsx
    // Fine is confirmed saved — now invoke the Edge Function
    try {
      const { data: { session } } = await supabase!.auth.getSession();
      if (!session?.access_token) throw new Error('No active session');

      const { data, error } = await supabase!.functions.invoke('notify-driver-fine', {
        body: { traffic_fine_id: fineId },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw new Error(error.message);

      // Optimistically mark notification as sent so UI reflects success immediately.
      // The edge function may also update the DB; we keep localStorage in sync either way.
      const sentAt = new Date().toISOString();
      await trafficFinesApi.saveFine({
        id: fineId,
        booking_id: fineAutofilledDriver?.bookingId || '',
        vehicle_reg: fineForm.vehicle_reg,
        driver_id: fineAutofilledDriver?.driverId || drivers[0]?.driver_id || 'UNKNOWN',
        fine_timestamp: fineForm.fine_timestamp,
        fine_reference: fineForm.fine_reference,
        location: fineForm.location,
        description: fineForm.description,
        amount: Number(fineForm.amount) || 0,
        notification_email: fineForm.notification_email,
        email_sent: true,
        email_sent_at: sentAt,
        notification_error: undefined,
        status: fineForm.status || 'pending',
        logged_by_admin_id: admin.driver_id,
        created_at: sentAt,
        updated_at: sentAt
      });

      alert('✅ Traffic fine logged and driver notified successfully.');
    } catch (err: any) {
      alert(`✅ Fine logged, but notification failed: ${err.message}`);
    }
```

And replace `handleResendFineEmail` with:

```tsx
  const handleResendFineEmail = async (fine: TrafficFine) => {
    if (!fine.id) {
      alert('Cannot resend: fine has no valid ID.');
      return;
    }
    try {
      const { supabase } = await import('@/lib/storage');
      if (!supabase) throw new Error('Supabase client not available');

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('No active admin session. Please log in again.');

      const { data, error } = await supabase.functions.invoke('notify-driver-fine', {
        body: { traffic_fine_id: fine.id },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw new Error(error.message);

      // Keep localStorage / UI in sync after a successful resend
      const sentAt = new Date().toISOString();
      await trafficFinesApi.saveFine({
        ...fine,
        email_sent: true,
        email_sent_at: sentAt,
        notification_error: undefined,
        updated_at: sentAt
      });

      refreshData();
      alert(`✅ Notification resent for fine ${fine.fine_reference}.`);
    } catch (err: any) {
      alert(`❌ Failed to resend notification: ${err.message}`);
    }
  };
```

After applying, the Driver Notification column will show "Notified <date>" + Resend button when the email was sent successfully.
