# Fix: Traffic fine notification UI shows "Not notified yet" even when email was sent

## Problem
When you log a traffic fine (or use Resend), the edge function `notify-driver-fine` successfully sends the email, but the Admin UI still shows **"Not notified yet"** in the Driver Notification column.

## Root cause
1. `handleSaveFine` saves the fine with `email_sent: false`.
2. It calls `supabase.functions.invoke('notify-driver-fine', ...)` — email is sent.
3. It calls `refreshData()` which only reads from **localStorage**.
4. localStorage still has `email_sent: false`, so the table renders "Not notified yet".

The same pattern exists in `handleResendFineEmail`.

## Fix (apply to `components/AdminDashboard.tsx`)

### 1. Update `handleSaveFine`
Replace the try/catch block that invokes the edge function (the one that currently ends with the success/failure alerts) with:

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

### 2. Update `handleResendFineEmail`
Replace the entire function with:

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

## After applying
- New fines will show "Notified <date>" + Resend button immediately after a successful send.
- Resend will also update the status correctly.

## Note
The full fixed `components/AdminDashboard.tsx` was prepared (length ~337k). If you want me to push the complete file in a follow-up, just say so (or apply the two snippets above — they are the only required changes).
