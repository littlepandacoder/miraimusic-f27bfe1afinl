# Stripe Setup Guide

## Required Environment Variables

For Stripe subscriptions to work, you must configure these Supabase environment variables:

### 1. **STRIPE_SECRET_KEY** (Required)
- Get from: https://dashboard.stripe.com/apikeys
- Copy: **Secret key** (starts with `sk_live_` or `sk_test_`)
- Set in: Supabase → Project Settings → Secrets

### 2. **STRIPE_STUDENT_PRICE_ID** (Required)
- Get from: https://dashboard.stripe.com/products
- Find or create a recurring (subscription) price
- Copy the **Price ID** (starts with `price_`)
- Default fallback: `price_1TcBF2B8UWyR18ZVVnNultKl`

### 3. **STRIPE_FIRST_MONTH_COUPON** (Optional)
- Get from: https://dashboard.stripe.com/coupons
- Create a coupon for first month discount (e.g., "FIRST_MONTH")
- If not set, checkout will work without coupon
- Default fallback: `FIRST_MONTH`

## How to Configure in Supabase

1. **Go to Supabase Dashboard**
   - https://supabase.com/dashboard/projects

2. **Select Your Project**

3. **Settings → Secrets**
   - Click "New Secret"
   - Name: `STRIPE_SECRET_KEY`
   - Value: `sk_live_xxx...` (your actual Stripe secret key)
   - Click "Add secret"

4. **Repeat for Other Variables**
   - `STRIPE_STUDENT_PRICE_ID`
   - `STRIPE_FIRST_MONTH_COUPON`

## Testing Before Going Live

**Use Test Keys:**
- Stripe Secret Key: `sk_test_xxx...` (from test mode)
- Test card: `4242 4242 4242 4242` (expires: 12/34, CVC: any)

**Test Flow:**
1. Sign up → Billing page → Click "Start Free Trial"
2. Should redirect to Stripe Checkout
3. Enter test card details
4. Should return to `/dashboard?checkout=success`

## Troubleshooting

### Error: "Stripe is not configured"
→ `STRIPE_SECRET_KEY` is missing or empty in Supabase Secrets

### Error: "No such coupon"
→ Coupon ID in `STRIPE_FIRST_MONTH_COUPON` doesn't exist (will fallback to no discount automatically)

### Error: "No such price"
→ `STRIPE_STUDENT_PRICE_ID` is invalid or product doesn't exist

### Checkout redirects to Stripe but won't load
→ Check CORS settings in Stripe Dashboard (usually not needed for Stripe Checkout)

## After First Month Billing

The subscription will automatically charge:
- Amount: From your Price configuration (e.g., $17/month)
- Interval: Monthly (or as configured in Price)
- Renewal: On the same day each month
- Cancellation: User can cancel from Dashboard

## Security Notes

- ✅ **Secret key** (starts with `sk_`) is for server-side only
- ✅ **Publishable key** (starts with `pk_`) is for client-side
- ⚠️ Never commit secret keys to git
- ⚠️ Always use HTTPS in production
- ⚠️ Stripe webhooks should verify signatures

## Support

If Stripe checkout still fails:
1. Check Supabase function logs: Project → Functions → Logs
2. Verify all environment variables are set
3. Test with Stripe test keys first
4. Contact Stripe support: https://support.stripe.com
