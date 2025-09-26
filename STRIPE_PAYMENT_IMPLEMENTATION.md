# Stripe Payment System Implementation

This document describes the complete Stripe payment system implementation for the University Library Management System, allowing users to pay their library fines using credit cards.

## 🎯 Overview

The Stripe payment system provides a secure, user-friendly way for library users to pay outstanding fines directly through the web interface. The system integrates with Stripe's payment processing platform and includes comprehensive fine management, payment tracking, and automated account updates.

## ✨ Features

### Core Payment Features

- **Stripe Integration**: Secure payment processing using Stripe Elements
- **Multiple Payment Methods**: Credit cards, bank transfers, and more
- **Fine Selection**: Users can select specific fines or pay all at once
- **Real-time Updates**: Instant account updates after successful payments
- **Payment Tracking**: Complete transaction history and audit trails
- **Webhook Handling**: Automated payment confirmation via Stripe webhooks

### Fine Management

- **Automated Calculations**: Daily fine calculations for overdue books
- **Penalty System**: Progressive penalty structure (flat fee → daily fees → lost book fees)
- **Account Restrictions**: Automatic restrictions when fines exceed threshold
- **Admin Tools**: Fine management and manual processing capabilities

### User Experience

- **Responsive Design**: Mobile-friendly payment interface
- **Progress Tracking**: Clear step-by-step payment process
- **Error Handling**: Graceful error handling and retry mechanisms
- **Success Confirmation**: Clear payment success confirmation

## 🏗️ Architecture

### Database Schema

#### Payment Tables

- `payment_transactions` - Tracks all payment attempts and completions
- `fine_payments` - Records individual fine payments
- `fines` - Stores calculated fines with status tracking

#### New Columns in Users Table

- `total_fines_owed` - Current total fine amount
- `is_restricted` - Account restriction status
- `restriction_reason` - Reason for restriction
- `restricted_at` - When restriction was applied
- `last_fine_calculation` - Last fine calculation timestamp

### API Endpoints

#### Payment API (`/api/payments`)

- `GET ?action=unpaid-fines` - Get user's unpaid fines
- `POST action=create-intent` - Create Stripe payment intent
- `POST action=complete-payment` - Complete payment processing
- `POST action=handle-failed` - Handle failed payments

#### Stripe Webhooks (`/api/webhooks/stripe`)

- Handles Stripe webhook events
- Processes payment confirmations
- Updates database on payment status changes

#### Admin APIs

- `/api/admin/fines` - Fine calculation and management
- `/api/admin/migrate-payment-schema` - Database migration

### Components Structure

```
components/
├── stripe/
│   ├── StripeProvider.tsx       # Stripe Elements provider
│   ├── PaymentForm.tsx          # Main payment form component
│   ├── FineSelection.tsx        # Fine selection interface
│   └── PaymentPage.tsx          # Complete payment page
└── ui/
    ├── alert.tsx                # Alert components
    └── checkbox.tsx             # Checkbox component
```

### Page Routes

```
app/
├── (root)/
│   ├── fines/
│   │   ├── page.tsx            # Fine overview dashboard
│   │   ├── payment/
│   │   │   ├── page.tsx        # Payment processing page
│   │   │   └── success/
│   │   │       └── page.tsx    # Payment success confirmation
│   │   └── stripe-demo/
│   │       └── page.tsx        # Demo and testing page
│   └── admin/
│       ├── fines/page.tsx      # Admin fine management
│       └── migrate-payment/
│           └── page.tsx        # Database migration interface
```

## 🔧 Installation & Setup

### 1. Install Dependencies

The following packages are already installed:

```bash
npm install @stripe/react-stripe-js @stripe/stripe-js stripe
npm install @radix-ui/react-checkbox  # For UI components
```

### 2. Environment Configuration

Update your `.env.local` file:

```bash
# Stripe Configuration
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 3. Database Migration

Run the database migration to create payment tables:

**Option A: Admin Interface**

1. Visit `/admin/migrate-payment` (requires admin authentication)
2. Click "Run Payment Schema Migration"

**Option B: API Endpoint**

```bash
curl -X POST http://localhost:3000/api/admin/migrate-payment-schema \
  -H "Content-Type: application/json" \
  # Note: Requires admin authentication
```

### 4. Stripe Webhook Setup

1. In your Stripe dashboard, create a webhook endpoint
2. Set endpoint URL to: `https://yourdomain.com/api/webhooks/stripe`
3. Select these events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `payment_intent.canceled`
4. Copy the webhook signing secret to `STRIPE_WEBHOOK_SECRET`

## 💳 Usage Guide

### For Users

#### Viewing Fines

1. Navigate to `/fines` to view outstanding fines
2. See total amount owed and account status
3. View detailed fine breakdown per book

#### Paying Fines

1. Click "Pay Fines" or visit `/fines/payment`
2. Select fines to pay (or pay all)
3. Review payment summary
4. Enter payment information using Stripe Elements
5. Confirm payment and receive confirmation

#### Payment Success

- Automatic redirect to success page
- Email confirmation (if configured)
- Real-time account updates
- Updated borrowing privileges

### For Admins

#### Fine Management

1. Visit `/admin/fines` for fine management tools
2. Run "Calculate Overdue Fines" to process new fines
3. Use "Run Daily Job" for automated processing

#### Payment Monitoring

- View payment transactions in admin interface
- Monitor failed payments and retry attempts
- Access audit logs for payment activities

## 🧪 Testing

### Test Card Numbers

For testing purposes, use these Stripe test card numbers:

- **Success**: `4242 4242 4242 4242`
- **Requires Authentication**: `4000 0025 0000 3155`
- **Declined**: `4000 0000 0000 9995`

Use any future expiry date and any 3-digit CVC.

### Test Scenarios

1. **Basic Payment Flow**

   - Create test fines using admin tools
   - Navigate to payment page
   - Complete payment with test card
   - Verify account updates

2. **Webhook Testing**

   - Use Stripe CLI for local webhook testing:

   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```

3. **Error Handling**
   - Test with declined cards
   - Test network interruptions
   - Verify error messages and retry functionality

## 📊 Fine Calculation Rules

### Penalty Structure

1. **Days 1-7**: Free borrowing period (no fines)
2. **Day 8**: $10.00 flat penalty (first late day)
3. **Days 9-14**: Additional $0.50 per day
4. **Day 15+**: Book considered lost
   - Fine = Book Price + (30% of Book Price)

### Account Restrictions

- Users with fines > $60 are restricted from borrowing
- Returning books is still allowed when restricted
- Restrictions lift automatically when fines paid below threshold

## 🔐 Security Considerations

### Payment Security

- Stripe Elements handles sensitive card data (PCI compliant)
- Payment intents prevent duplicate charges
- Webhook signature verification prevents tampering
- Database stores minimal payment information

### Access Control

- Payment APIs require user authentication
- Admin functions require admin role
- Fine data is user-specific (privacy protected)

### Error Handling

- Graceful degradation for payment failures
- Comprehensive error logging
- User-friendly error messages
- Automatic retry mechanisms

## 🚀 Production Deployment

### Stripe Configuration

1. Replace test keys with live Stripe keys
2. Configure live webhook endpoints
3. Set up proper SSL certificates
4. Test with real payment methods

### Environment Variables

```bash
# Production Stripe keys
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_live_...
```

### Monitoring

- Set up Stripe dashboard monitoring
- Configure payment alerts and notifications
- Monitor webhook delivery and errors
- Track payment success/failure rates

## 🛠️ Maintenance

### Regular Tasks

1. Monitor failed payments and retry
2. Review and reconcile payment records
3. Update fine calculation rules as needed
4. Monitor system performance and errors

### Database Maintenance

- Regular cleanup of old payment records
- Archive completed transactions
- Monitor database performance
- Backup payment transaction data

## 📚 Additional Resources

- [Stripe Documentation](https://stripe.com/docs)
- [Stripe Elements Guide](https://stripe.com/docs/stripe-js)
- [Webhook Best Practices](https://stripe.com/docs/webhooks/best-practices)
- [PCI Compliance](https://stripe.com/docs/security)

## 🆘 Troubleshooting

### Common Issues

**Payment Intent Creation Fails**

- Check Stripe API keys configuration
- Verify user authentication
- Check fine amounts are valid

**Webhook Not Receiving Events**

- Verify webhook URL is accessible
- Check webhook secret configuration
- Review Stripe dashboard for delivery attempts

**Database Migration Issues**

- Ensure proper database permissions
- Check for existing table conflicts
- Review migration logs for specific errors

**Payment Form Not Loading**

- Verify Stripe publishable key
- Check browser console for JavaScript errors
- Ensure proper Stripe Elements configuration

---

## Summary

This Stripe payment system provides a complete, production-ready solution for processing library fine payments. It includes comprehensive error handling, security measures, and admin tools while maintaining a user-friendly interface. The system automatically handles fine calculations, payment processing, and account updates, making it easy for both users and administrators to manage library fines effectively.
