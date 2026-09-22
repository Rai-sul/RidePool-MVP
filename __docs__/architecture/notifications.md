# Notifications

Owner: `Server/src/services/notification.service.ts`

> An earlier design doc recommended adopting **Knock.app**. That was never
> built — the implemented transport is Firebase Cloud Messaging. The original
> comparison is kept at
> [`history/`](../history/README.md) for background only.

---

## Model

Every notification is **persisted first, pushed second**.

```
sendPushNotification(userId, payload, appType?)
  1. INSERT into `notifications`        ← the source of truth
  2. if FCM_SERVER_KEY is set → sendToFCM()
  3. return true/false
```

"Delivered" means **the row was persisted**. A push that cannot reach a device
(no registered token, `FCM_SERVER_KEY` unset) is still a success, because the
user will see the notification in-app. This is why step 1 failing is the only
thing that returns `false`.

`sendPushNotification` **never throws** — a failed notification must not abort
the business operation that triggered it. Callers that need the outcome read
the boolean; fire-and-forget callers ignore it.

`sendBulkNotification(userIds, …)` returns `{ sent, failed }` counted from that
boolean. It sends **sequentially on purpose**: a pool can fan out to every
nearby driver, and firing those at once would burst both Supabase and FCM rate
limits.

## Tables

| Table | Purpose |
|---|---|
| `notifications` | Every notification, read/unread. The in-app inbox. |
| `device_tokens` | FCM tokens per user, with `platform` and `app_type`, plus `is_active`. |
| `notification_preferences` | Per-user delivery preferences. |

A token is deactivated automatically when FCM replies `404` or `410`
(unregistered/expired).

## Targeting

`appType` (`'rider' | 'driver'`) filters `device_tokens` so a rider-facing
message does not land on the driver app. Omit it to reach every device the user
has registered.

## Configuration

| Variable | Effect when missing |
|---|---|
| `FCM_SERVER_KEY` | Notifications are stored in the database only; nothing is pushed. A warning is logged at boot and per send. |

FCM endpoint: `https://fcm.googleapis.com/fcm/send`.

## Typed helpers

Rather than building payloads inline, use the named wrappers — they keep the
`type` values consistent with what the clients switch on:

`sendPoolFoundNotification`, `sendPoolReadyNotification`,
`sendPoolCancelledNotification`, `sendDriverAssignedNotification`,
`sendDriverUnassignedNotification`, `sendDriverArrivingNotification`,
`sendRideStartedNotification`, `sendRideCompletedNotification`,
`sendPaymentReceivedNotification`, `sendRatingRequestNotification`,
`sendPriyoSathiInviteNotification`, `sendNewPoolAvailableNotification`.

**Adding a notification type**: add a wrapper here, keep the `type` string in
sync with the client handler, and let it delegate to `sendPushNotification`.

## Known gaps

- Emergency/SOS delivery to external SMS or 999 is a placeholder — logged to the
  database, not dispatched.
