# Notification Service Analysis

## Overview

Push notifications are critical for ride-sharing apps. This document analyzes notification options and recommends an implementation strategy.

## Current Android Notification Landscape (January 2026)

### Key Changes
1. **Android 13+**: Apps must request `POST_NOTIFICATIONS` permission
2. **Background restrictions**: Services cannot start foreground activities
3. **FCM required**: Direct backend push is deprecated for security (RCE prevention)
4. **Data-only messages**: Limited to 10/day for low-priority

### FCM Requirements
- Google Play Services required
- google-services.json in app
- Server key for API calls
- EAS manages credentials during build

## Option Comparison

### Option 1: Direct FCM Integration

**Pros:**
- Free unlimited notifications
- Native Android/iOS support
- Full control over implementation

**Cons:**
- Complex setup and maintenance
- Must manage device tokens
- Handle retry logic manually
- Different code for iOS vs Android
- Credential management in EAS

**Implementation Effort:** 40+ hours

### Option 2: Knock.app

**Pros:**
- Unified API for all channels (push, SMS, email)
- Built-in user preferences
- Cross-channel orchestration
- Workflow builder
- Analytics dashboard
- Handles FCM/APNs internally

**Cons:**
- Cost after free tier (10K notifications)
- External dependency
- Limited customization

**Implementation Effort:** 8-16 hours

**Pricing (Jan 2026):**
| Plan | Monthly | Notifications |
|------|---------|---------------|
| Free | $0 | 10,000 |
| Starter | $25 | 100,000 |
| Growth | $100 | 500,000 |

### Option 3: OneSignal

**Pros:**
- Industry standard
- Rich targeting
- A/B testing
- Free tier available

**Cons:**
- Less modern than Knock
- More complex setup
- Mobile SDK required

**Implementation Effort:** 16-24 hours

### Option 4: Expo Push Notifications

**Pros:**
- Native Expo integration
- Simple API
- Free for basic usage

**Cons:**
- Only works with Expo apps
- Limited features
- No email/SMS

**Implementation Effort:** 8-12 hours

## Recommendation: Knock.app

### Reasoning
1. **Time to market**: Fastest implementation
2. **Multi-channel ready**: Can add SMS/email later
3. **Free tier sufficient**: 10K/month covers MVP
4. **FCM abstraction**: Handles credential complexity
5. **User preferences**: Built-in opt-out handling

### Integration Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                        RidePool Backend                         │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                  Notification Service                      │  │
│  │  ┌─────────────┐                    ┌─────────────────┐   │  │
│  │  │ Event       │ ──────────────────▶│ Knock Client    │   │  │
│  │  │ Trigger     │                    │ (SDK)           │   │  │
│  │  └─────────────┘                    └────────┬────────┘   │  │
│  └──────────────────────────────────────────────│────────────┘  │
└─────────────────────────────────────────────────│────────────────┘
                                                  │
                                                  ▼
                              ┌─────────────────────────────────────┐
                              │              Knock.app               │
                              │  ┌───────────┐  ┌───────────────┐   │
                              │  │ Workflow  │  │ Channel       │   │
                              │  │ Engine    │  │ Providers     │   │
                              │  └───────────┘  │ - FCM         │   │
                              │                 │ - APNs        │   │
                              │                 │ - Email       │   │
                              │                 │ - SMS         │   │
                              │                 └───────────────┘   │
                              └─────────────────────────────────────┘
                                                  │
                              ┌───────────────────┴───────────────────┐
                              ▼                                       ▼
                    ┌─────────────────┐                    ┌─────────────────┐
                    │   CarPoolApp    │                    │   DriverApp     │
                    │   (Passenger)   │                    │   (Driver)      │
                    └─────────────────┘                    └─────────────────┘
```

### Knock Integration Code

```typescript
// Server/src/services/notification.service.ts
import { Knock } from "@knocklabs/node";

const knock = new Knock(process.env.KNOCK_API_KEY);

interface NotificationPayload {
  userId: string;
  type: 'POOL_FOUND' | 'DRIVER_ASSIGNED' | 'RIDE_STARTED' | 'PAYMENT_RECEIVED';
  data: Record<string, unknown>;
}

export const notificationService = {
  async send(payload: NotificationPayload): Promise<void> {
    await knock.workflows.trigger("ride-updates", {
      recipients: [payload.userId],
      data: {
        type: payload.type,
        ...payload.data,
      },
    });
  },

  async registerDevice(userId: string, token: string, platform: 'ios' | 'android'): Promise<void> {
    await knock.users.setChannelData(userId, process.env.KNOCK_PUSH_CHANNEL_ID!, {
      tokens: [{ token, device_id: token }],
    });
  },

  async sendBulk(userIds: string[], type: string, data: Record<string, unknown>): Promise<void> {
    await knock.workflows.trigger("ride-updates", {
      recipients: userIds,
      data: { type, ...data },
    });
  },
};
```

### Client Integration

```typescript
// Client/CarPoolApp/services/notifications.ts
import * as Notifications from 'expo-notifications';
import { notificationApi } from './api';

export async function registerForPushNotifications(): Promise<string | null> {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return null;

  const token = await Notifications.getExpoPushTokenAsync();
  
  // Register with Knock via backend
  await notificationApi.registerDevice({
    token: token.data,
    platform: Platform.OS,
  });

  return token.data;
}
```

### EAS Configuration for FCM

```json
// app.json
{
  "expo": {
    "android": {
      "googleServicesFile": "./google-services.json"
    },
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#3B82F6"
        }
      ]
    ]
  }
}
```

**EAS Build**: Upload google-services.json as a secret:
```bash
eas secret:create --scope project --name GOOGLE_SERVICES_JSON --type file --value ./google-services.json
```

### Notification Workflows (Knock Dashboard)

| Workflow | Trigger | Channels | Delay |
|----------|---------|----------|-------|
| pool-found | API | Push | Immediate |
| driver-assigned | API | Push | Immediate |
| ride-reminder | Scheduled | Push | 15 min before |
| payment-confirmation | API | Push + Email | Immediate |
| promotional | Batch | Push | 10am local |

## Implementation Checklist

### Phase 1: Basic Push (Week 1)
- [ ] Create Knock account
- [ ] Configure FCM channel
- [ ] Implement notificationService
- [ ] Add registerDevice endpoint
- [ ] Client: Request permissions
- [ ] Client: Register device on login

### Phase 2: Workflows (Week 2)
- [ ] Create Knock workflows
- [ ] Trigger notifications from events
- [ ] Test on Android/iOS
- [ ] Handle notification tap (deep linking)

### Phase 3: Advanced (Week 3-4)
- [ ] Add email channel
- [ ] User preferences UI
- [ ] Analytics integration
- [ ] A/B testing

## Cost Projection

| DAU | Notifications/month | Knock Plan | Cost |
|-----|---------------------|------------|------|
| 100 | 3,000 | Free | $0 |
| 1,000 | 30,000 | Starter | $25 |
| 10,000 | 300,000 | Growth | $100 |
| 50,000 | 1,500,000 | Enterprise | Custom |

## Fallback Strategy

If Knock becomes too expensive or unavailable:

1. **Export user preferences** from Knock dashboard
2. **Implement direct FCM** using firebase-admin SDK
3. **Migrate gradually** by running both in parallel

## Conclusion

**Recommendation**: Use Knock.app for MVP and early growth phases. The development time savings (24+ hours) and simplified maintenance justify the cost at scale. Re-evaluate at 500K notifications/month.

---

**Last Updated:** 2026-01-19
