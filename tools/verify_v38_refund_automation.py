from pathlib import Path
import re
import sys

ROOT=Path(__file__).resolve().parents[1]
checks=[]
def text(rel):
    p=ROOT/rel
    return p.read_text(encoding='utf-8') if p.exists() else ''
def check(name, ok):
    ok=bool(ok);checks.append((name,ok));print(('PASS' if ok else 'FAIL')+': '+name)

migration=text('backend/src/main/resources/db/migration/V38__refund_cancellation_automation.sql')
policy=text('backend/src/main/java/com/cinebooking/operations/RefundPolicy.java')
service=text('backend/src/main/java/com/cinebooking/operations/RefundService.java')
controller=text('backend/src/main/java/com/cinebooking/operations/RefundController.java')
booking=text('backend/src/main/java/com/cinebooking/domain/Booking.java')
payment=text('backend/src/main/java/com/cinebooking/domain/Payment.java')
booking_dtos=text('backend/src/main/java/com/cinebooking/booking/BookingDtos.java')
booking_service=text('backend/src/main/java/com/cinebooking/booking/BookingService.java')
payment_dtos=text('backend/src/main/java/com/cinebooking/payment/PaymentDtos.java')
payment_service=text('backend/src/main/java/com/cinebooking/payment/PaymentService.java')
app=text('backend/src/main/resources/application.yml')
compose=text('docker-compose.yml')
env=text('.env.example')
types=text('frontend/lib/types.ts')
bookings_page=text('frontend/app/bookings/page.tsx')
refund_admin=text('frontend/app/admin/refunds/page.tsx')
payments_page=text('frontend/app/payments/page.tsx')
e2e=text('frontend/e2e/refund-automation.spec.ts')
it=text('backend/src/test/java/com/cinebooking/integration/CineBookingIntegrationIT.java')
unit=text('backend/src/test/java/com/cinebooking/operations/RefundPolicyTest.java')
ci=text('.github/workflows/ci.yml')
rc=text('.github/workflows/release-candidate.yml')
release=text('.github/workflows/release.yml')
diag=text('tools/diagnose-v38.ps1')
make=text('Makefile')
readme=text('README.md')
legacy_v37=text('tools/verify_v37_payment_gateway.py')
booking_ops_service=text('backend/src/main/java/com/cinebooking/booking/AdminBookingOperationsService.java')
booking_ops_controller=text('backend/src/main/java/com/cinebooking/booking/AdminBookingOperationsController.java')
admin_bookings=text('frontend/app/admin/bookings/page.tsx')

check('V38 migration exists', bool(migration))
check('V38 migration stores refund policy snapshot on booking', all(x in migration for x in ['refund_rate_percent','refund_fee_amount','refund_policy_code','refund_automatic']))
check('V38 migration stores processing audit fields on booking', all(x in migration for x in ['refund_processed_at','refund_processed_by','refund_provider_reference']))
check('V38 migration stores monetary refund result on payment', all(x in migration for x in ['refunded_amount','refunded_at','refund_reference']))
check('V38 migration indexes processed refunds', 'idx_booking_refund_processed' in migration)
check('Booking entity maps V38 refund fields', all(x in booking for x in ['refundRatePercent','refundFeeAmount','refundPolicyCode','refundAutomatic','refundProcessedAt','refundProcessedBy','refundProviderReference']))
check('Payment entity maps refunded amount/time/reference', all(x in payment for x in ['refundedAmount','refundedAt','refundReference']))
check('Refund automatic flag defaults false', 'if(refundAutomatic==null)refundAutomatic=false' in booking)

check('RefundPolicy is a dedicated component', '@Component' in policy and 'class RefundPolicy' in policy)
check('RefundPolicy exposes 24h full-refund threshold', '${app.refund.full-refund-minutes:1440}' in policy)
check('RefundPolicy exposes 6h partial-auto threshold', '${app.refund.partial-auto-minutes:360}' in policy)
check('RefundPolicy exposes 2h minimum cutoff', '${app.refund.minimum-minutes:120}' in policy)
check('RefundPolicy default partial automatic rate is 80 percent', '${app.refund.partial-auto-rate:0.80}' in policy)
check('RefundPolicy default manual rate is 50 percent', '${app.refund.manual-rate:0.50}' in policy)
check('RefundPolicy implements AUTO_FULL tier', 'AUTO_FULL' in policy and 'BigDecimal.ONE' in policy)
check('RefundPolicy implements AUTO_PARTIAL tier', 'AUTO_PARTIAL' in policy and 'partialAutoRate' in policy)
check('RefundPolicy implements MANUAL_PARTIAL tier', 'MANUAL_PARTIAL' in policy and 'manualRate' in policy)
check('RefundPolicy implements non-refundable cutoff', 'NON_REFUNDABLE' in policy and 'minutes < minimumMinutes' in policy)
check('RefundPolicy calculates explicit fee amount', 'safeTotal.subtract(amount)' in policy and 'feeAmount' in policy)
check('RefundPolicy validates configured rates', 'must be between 0 and 1' in policy)

check('Customer refund quote API exists', '@GetMapping("/api/bookings/{id}/refund-quote")' in controller)
check('Customer refund request remains authenticated', '@PostMapping("/api/bookings/{id}/refund-request")' in controller)
check('Admin approval accepts provider refund reference', 'ApproveRefundRequest' in controller and 'providerReference()' in controller)
check('Refund quote verifies current ticket ownership', 'requireTicketOwner(b,user)' in service)
check('Checked-in tickets cannot refund', 'Vé đã check-in nên không thể hoàn tiền' in service)
check('Refund request is idempotent for requested/refunded states', 'BookingStatus.REFUNDED || b.getStatus()==BookingStatus.REFUND_REQUESTED' in service)
check('Refund policy snapshot is persisted before processing', all(x in service for x in ['setRefundRatePercent','setRefundFeeAmount','setRefundPolicyCode','setRefundAutomatic']))
check('MOCK is the only automatically finalized gateway', 'boolean mock="MOCK".equals(payment.getProvider())' in service and 'q.autoPolicyEligible() && mock' in service)
check('Real gateways require provider refund reference before approval', 'Cần nhập mã/reference hoàn tiền từ cổng thanh toán' in service)
check('Legacy booking-ops refund approval forwards provider reference',
      'refunds.approve(id, adminEmail, providerReference, ip)' in booking_ops_service)
check('Legacy booking-ops controller accepts provider refund reference',
      'body==null?null:body.providerReference()' in booking_ops_controller)
check('Legacy admin booking UI collects provider reference for real gateways',
      'async function approveRefund()' in admin_bookings and 'provider!=="MOCK"' in admin_bookings and '{providerReference}' in admin_bookings)

check('Automatic refund uses explicit system audit action', 'REFUND_AUTO_APPROVE' in service and 'AUTO-'+ '"+b.getId()' in service)
check('Refund keeps benefit ownership on original purchaser', 'getPurchaserUserId()==null?b.getUserId():b.getPurchaserUserId()' in service)
check('Refund reverses earned loyalty points', 'transactionType("REVERSAL")' in service or 'setTransactionType("REVERSAL")' in service or 'loyalty.reverseEarnedPoints' in service)
check('Refund restores redeemed loyalty points', ('setTransactionType("REFUND")' in service or 'loyalty.refundRedeemedPoints' in service) and 'Hoàn điểm đã dùng do hoàn vé' in service)
check('Refund releases voucher entitlement', 'commerce.releaseVoucher(b.getId())' in service)
check('Refund restores concession inventory', 'inventory.restoreForRefund(b.getId())' in service)
check('Refund records refunded amount on payment', 'p.setRefundedAmount(b.getRefundAmount())' in service)
check('Refund records provider/admin reference on payment', 'p.setRefundReference(providerReference)' in service)
check('Refund releases seat rows', 'bookingSeats.releaseByBookingId(b.getId())' in service)
check('Refund broadcasts seat availability', 'events.publish(b.getShowtimeId(),"REFUNDED",seatIds)' in service)
check('Refund scans waitlist after transaction commit when seats reopen', 'scanWaitlistAfterCommit(b.getShowtimeId())' in service and 'afterCommit(){scan.run();}' in service and 'waitlist.scanShowtime(showtimeId)' in service)
check('Refund notification includes amount and cancellation fee', 'Phí hủy:' in service and 'Ghế đã được mở bán lại' in service)
check('Rejected refund clears policy snapshot', 'clearRequestSnapshot(b)' in service and 'setRefundPolicyCode(null)' in service)

check('Booking API exposes V38 refund snapshot to wallet UI', all(x in booking_dtos for x in ['refundFeeAmount','refundRatePercent','refundPolicyCode','refundAutomatic']) and 'getRefundFeeAmount()' in booking_service)
check('Customer payment history exposes refund amount and reference', 'refundedAmount' in payment_dtos and 'refundReference' in payment_dtos and 'getRefundedAmount()' in payment_service)
check('Frontend types include RefundQuote', 'export type RefundQuote' in types and 'gatewayConfirmationRequired' in types)
check('Wallet fetches refund quote before request', '/refund-quote' in bookings_page and 'Kiểm tra hoàn vé' in bookings_page)
check('Wallet shows rate, amount and cancellation fee', 'Mức hoàn' in bookings_page and 'Phí hủy' in bookings_page and 'ratePercent' in bookings_page)
check('Wallet distinguishes automatic from admin confirmation', 'Tự động' in bookings_page and 'Cần admin xác nhận' in bookings_page)
check('Wallet confirms refund through explicit second action', 'Xác nhận hủy & hoàn' in bookings_page and '/refund-request' in bookings_page)
check('Admin refund UI collects gateway reference', 'Reference hoàn tiền VNPay/MoMo' in refund_admin and 'providerReference' in refund_admin)
check('Admin refund UI shows policy/rate/fee', 'policyCode' in refund_admin and 'ratePercent' in refund_admin and 'feeAmount' in refund_admin)
check('Payment history UI shows refunded amount/reference', 'Đã hoàn' in payments_page and 'Refund reference:' in payments_page)

check('V38 Playwright journey exists', bool(e2e) and 'V38 mock refund auto-processes policy' in e2e)
check('V38 Playwright selects a far seeded showtime', 'dateCount - 1' in e2e)
check('V38 Playwright verifies AUTO_FULL quote', 'AUTO_FULL' in e2e and '100%' in e2e)
check('V38 Playwright scopes 100 percent assertion to the rate row', 'policy.getByText(/^100%\\s*·/)' in e2e)
check('V38 Playwright avoids ambiguous broad 100 percent text lookup', 'policy.getByText(/100%/)' not in e2e)
check('V38 Playwright verifies automatic REFUNDED booking state', 'Trạng thái booking: REFUNDED' in e2e)
check('V38 Playwright verifies refunded payment state', 'paymentCard.getByText("REFUNDED", { exact: true })' in e2e)
check('V38 Playwright verifies released seat becomes available', 'released seat becomes available again' in e2e and 'title*="AVAILABLE"' in e2e)

check('RefundPolicy unit test covers all four policy bands', all(x in unit for x in ['AUTO_FULL','AUTO_PARTIAL','MANUAL_PARTIAL','NON_REFUNDABLE']))
latest=re.search(r'assertThat\(latest\)\.isEqualTo\("(\d+)"\)',it)
check('Testcontainers expects Flyway V38 or newer', bool(latest) and int(latest.group(1))>=38)
check('Testcontainers validates V38 booking refund columns', 'refundV38BookingColumns' in it and 'isEqualTo(7)' in it)
check('Testcontainers validates V38 payment refund columns', 'refundV38PaymentColumns' in it and 'isEqualTo(3)' in it)

check('Application config exposes V38 refund policy knobs', all(x in app for x in ['REFUND_FULL_REFUND_MINUTES','REFUND_PARTIAL_AUTO_MINUTES','REFUND_MINIMUM_MINUTES','REFUND_PARTIAL_AUTO_RATE','REFUND_MANUAL_RATE']))
check('Compose passes V38 refund policy to both replicas', all(x in compose for x in ['REFUND_FULL_REFUND_MINUTES','REFUND_PARTIAL_AUTO_MINUTES','REFUND_MINIMUM_MINUTES','REFUND_PARTIAL_AUTO_RATE','REFUND_MANUAL_RATE']) and 'environment: *backend_env' in compose)
check('Example env documents V38 refund policy without secrets', all(x in env for x in ['REFUND_FULL_REFUND_MINUTES=1440','REFUND_PARTIAL_AUTO_MINUTES=360','REFUND_MINIMUM_MINUTES=120','REFUND_PARTIAL_AUTO_RATE=0.80','REFUND_MANUAL_RATE=0.50']))

check('Main CI runs V38 verifier', 'python3 tools/verify_v38_refund_automation.py' in ci and re.search(r'V26-V(?:3[8-9]|[4-9]\d)(?:\.\d+)? source regression',ci) is not None)
rc_version=re.search(r'default: "v(\d+)\.\d+\.\d+-rc\.1"',rc)
check('Standalone RC defaults to V38-or-newer candidate', bool(rc_version) and int(rc_version.group(1))>=38 and re.search(r'cinebooking_v(?:3[8-9]|[4-9]\d)_rc_\$\{\{ github\.run_id \}\}',rc) is not None)
check('Standalone RC names V38 browser coverage', 'V38' in rc)
stable_version=re.search(r'default: "(\d+)\.\d+\.\d+"',release)
check('Stable release defaults to V38 or newer', bool(stable_version) and int(stable_version.group(1))>=38 and re.search(r'cinebooking_v(?:3[8-9]|[4-9]\d)_release_\$\{\{ github\.run_id \}\}',release) is not None)
check('V38 diagnostics chains V37 and V38 verifier', 'diagnose-v37.ps1' in diag and 'verify_v38_refund_automation.py' in diag)
check('Makefile exposes V38 verify and diagnose', 'verify-v38:' in make and 'diagnose-v38:' in make)
check('V37 regression verifier tolerates V38 current version', 'V37 or newer' in legacy_v37 and 'V26-V(?:3[7-9]' in legacy_v37)
check('README documents V38 refund automation and release lifecycle', 'V38 - Refund & Cancellation Automation' in readme and 'v38.0.0-rc.1' in readme and 'v38.0.0' in readme)

ignored={'.git','node_modules','.next','target','playwright-report','test-results'}
markdown=[p for p in ROOT.rglob('*.md') if not any(part in ignored for part in p.parts)]
check('source still contains exactly one README.md', len(markdown)==1 and markdown[0].resolve()==(ROOT/'README.md').resolve())
check('destructive volume reset remains blocked', 'destructive volume reset is disabled' in make and '@exit 1' in make)
check('real gateway credentials remain blank in example env', re.search(r'^VNPAY_HASH_SECRET=\s*$',env,re.M) and re.search(r'^MOMO_SECRET_KEY=\s*$',env,re.M))

failed=[n for n,ok in checks if not ok]
print(f'\n{len(checks)-len(failed)}/{len(checks)} checks passed')
if failed:
    print('Failed checks:')
    for n in failed: print(' -',n)
    sys.exit(1)
