# Fares

Owner: `Server/src/services/fare.service.ts`. Currency is **BDT (৳)**.

All rates are module constants at the top of that file. They are the single
source — nothing else may hardcode a rate.

---

## Rates

| Constant | Value |
|---|---|
| `BASE_RATE_CAR` | ৳50 |
| `BASE_RATE_CNG` | ৳30 |
| `PER_KM_RATE` | ৳15 / km |
| `PER_MINUTE_RATE` | ৳2 / min |
| `PLATFORM_SURCHARGE_BDT` | ৳10 |
| `FULL_POOL_BONUS_PERCENT` | 5% |

## Pool discount

Applied to `baseFare + timeFare` and driven purely by passenger count:

| Passengers | Discount |
|---|---|
| 1 | 0% |
| 2 | 25% |
| 3 | 35% |
| 4+ | 40% |

## Calculation order

`calculateFullFare(distanceKm, durationMinutes, vehicleType, passengerCount)`:

```
baseFare            = BASE_RATE(vehicleType) + distanceKm × PER_KM_RATE
timeFare            = durationMinutes × PER_MINUTE_RATE
totalBeforeDiscount = baseFare + timeFare

poolDiscount        = round(totalBeforeDiscount × discountRate)
fullPoolBonus       = round(totalBeforeDiscount × 5%)   — only when passengers ≥ 4
discountedFare      = totalBeforeDiscount − poolDiscount − fullPoolBonus

farePerPerson       = ceil(discountedFare ÷ passengerCount)
displayedFare       = farePerPerson
actualCharge        = farePerPerson + PLATFORM_SURCHARGE_BDT
savings             = max(0, soloFare − displayedFare)
```

Two things to note, because they surprise people:

- **`actualCharge` ≠ `displayedFare`.** The ৳10 platform surcharge is added on
  top of the displayed fare, not taken out of it.
- **`fullPoolBonus` only ever triggers at 4+ passengers**, which no vehicle type
  currently reaches — CAR capacity is 3 and CNG is 2
  (`CONSTANTS.VEHICLE_CAPACITY`). The branch is therefore dead in practice
  today; it exists for a larger vehicle type. Do not "fix" the capacity to make
  it fire.

Duration is the **traffic-aware** duration wherever one is available, so fares
reflect real conditions rather than free-flow estimates.

## Driver earnings

`calculateDriverEarnings(totalFare, tripsCompletedToday, tips)` derives the
driver's share and daily-trip bonuses. Earnings are recorded in
`driver_earnings` / `driver_daily_stats`.

## Wallet

Money movement never happens in application code. It goes through atomic SQL
functions so a balance can never go negative or double-spend:

`atomic_wallet_credit`, `atomic_wallet_debit`, `atomic_process_payment`,
`complete_payment`, `fail_payment`, plus the promise-money pair
`deposit_promise_money` / `deduct_promise_money`.

`wallet.service.ts` wraps these and returns a discriminated union — on failure
`error` is always present, on success `transaction` and `newBalance` are.

## Gateways

SSLCommerz and bKash are the intended gateways. Integration is currently a
**placeholder**; `payment.service` paths exist but do not complete a real
charge.
