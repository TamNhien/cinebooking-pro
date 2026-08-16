# Payment + Account Setup

## 1. Apply migrations
Rebuild both backend instances. Flyway upgrades existing databases from v2 to v4 automatically.

## 2. VNPay
Configure sandbox merchant `TmnCode` and `HashSecret` in `.env`.
- Normal checkout: provider `VNPAY`.
- QR checkout: provider `VNPAY_QR` (sets bank code `VNPAYQR`).
- VNPAY amount is sent as VND x 100 and requests are signed with HMAC-SHA512.

## 3. MoMo
Configure `partnerCode`, `accessKey`, and `secretKey` in `.env`.
- `MOMO`: redirect to MoMo payUrl.
- `MOMO_QR`: request `captureWallet`, store returned QR payload, render it in the browser, and poll payment status.
- Request/IPN signatures use HMAC-SHA256.

## 4. Forgot password
Local demo:
```env
DEV_RESET_LINK=true
MAIL_ENABLED=false
```
The forgot-password page will show the one-time reset link.

SMTP:
```env
DEV_RESET_LINK=false
MAIL_ENABLED=true
MAIL_HOST=smtp.example.com
MAIL_PORT=587
MAIL_USERNAME=...
MAIL_PASSWORD=...
MAIL_SMTP_AUTH=true
MAIL_STARTTLS=true
MAIL_FROM=no-reply@example.com
```

## 5. Admin
Sign in with the admin account configured in `.env`, then open `/admin`.
