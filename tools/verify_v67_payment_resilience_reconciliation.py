from pathlib import Path
import re
import sys

ROOT=Path(__file__).resolve().parents[1]
checks=[]

def text(rel):
    p=ROOT/rel
    return p.read_text(encoding='utf-8') if p.exists() else ''

def exists(rel): return (ROOT/rel).exists()
def check(name, cond):
    ok=bool(cond);checks.append((name,ok));print(f"[ {'OK' if ok else 'FAIL'} ] {name}")

migration=text('backend/src/main/resources/db/migration/V67__payment_resilience_recovery.sql')
payment=text('backend/src/main/java/com/cinebooking/domain/Payment.java')
webhook=text('backend/src/main/java/com/cinebooking/domain/PaymentWebhookEvent.java')
webrepo=text('backend/src/main/java/com/cinebooking/payment/PaymentWebhookEventRepository.java')
payrepo=text('backend/src/main/java/com/cinebooking/payment/PaymentRepository.java')
paysvc=text('backend/src/main/java/com/cinebooking/payment/PaymentService.java')
adminsvc=text('backend/src/main/java/com/cinebooking/payment/AdminPaymentService.java')
dtos=text('backend/src/main/java/com/cinebooking/payment/PaymentResilienceDtos.java')
resilience=text('backend/src/main/java/com/cinebooking/payment/PaymentResilienceService.java')
recovery=text('backend/src/main/java/com/cinebooking/payment/PaymentWebhookRecoveryService.java')
job=text('backend/src/main/java/com/cinebooking/payment/PaymentWebhookRecoveryJob.java')
receipt=text('backend/src/main/java/com/cinebooking/payment/PaymentWebhookReceiptService.java')
controller=text('backend/src/main/java/com/cinebooking/payment/AdminPaymentResilienceController.java')
refund=text('backend/src/main/java/com/cinebooking/operations/RefundService.java')
app=text('backend/src/main/resources/application.yml')
compose=text('docker-compose.yml')
env=text('.env.example')
adminpage=text('frontend/app/admin/page.tsx')
paypage=text('frontend/app/admin/payments/page.tsx')
ui=text('frontend/app/admin/payment-resilience/page.tsx')
ftypes=text('frontend/lib/types.ts')
header=text('frontend/components/Header.tsx')
e2e=text('frontend/e2e/payment-resilience-reconciliation-v67.spec.ts')
ci=text('.github/workflows/ci.yml')
rc=text('.github/workflows/release-candidate.yml')
release=text('.github/workflows/release.yml')
make=text('Makefile')
diagnose=text('tools/diagnose-v67.ps1')
readme=text('README.md')
itest=text('backend/src/test/java/com/cinebooking/integration/CineBookingIntegrationIT.java')
seed=text('tools/seed-demo-57-tables-10-rows.sql')

# identity/files
for rel,label in [
 ('backend/src/main/resources/db/migration/V67__payment_resilience_recovery.sql','V67 migration exists'),
 ('backend/src/main/java/com/cinebooking/payment/PaymentResilienceDtos.java','V67 DTOs exist'),
 ('backend/src/main/java/com/cinebooking/payment/PaymentResilienceService.java','V67 summary service exists'),
 ('backend/src/main/java/com/cinebooking/payment/PaymentWebhookRecoveryService.java','V67 webhook recovery service exists'),
 ('backend/src/main/java/com/cinebooking/payment/PaymentWebhookRecoveryJob.java','V67 recovery job exists'),
 ('backend/src/main/java/com/cinebooking/payment/PaymentWebhookReceiptService.java','V67 durable webhook receipt service exists'),
 ('backend/src/main/java/com/cinebooking/payment/AdminPaymentResilienceController.java','V67 admin controller exists'),
 ('frontend/app/admin/payment-resilience/page.tsx','V67 admin UI exists'),
 ('frontend/e2e/payment-resilience-reconciliation-v67.spec.ts','V67 browser E2E exists'),
 ('tools/diagnose-v67.ps1','V67 diagnose exists')]: check(label,exists(rel))
check('V67 strategy version explicit','V67-PAYMENT-RESILIENCE-5' in resilience and 'V67-PAYMENT-RESILIENCE-5' in ui and 'V67-PAYMENT-RESILIENCE-5' in readme)
check('README current release is V67 or later',any(x in readme for x in ['Current release:** V67','Current release: **V67**','Current release:** V68','Current release: **V68**','Current release:** V69','Current release: **V69**','Current release:** V70','Current release: **V70**','Current release:** V71','Current release: **V71**']))
check('README has V67 section','## V67 - Payment Resilience & Reconciliation 5.0' in readme)

# migration payment refund state
for col in ['refund_state VARCHAR(24)','refund_requested_at TIMESTAMPTZ','refund_settled_at TIMESTAMPTZ','refund_attempts INTEGER','refund_operation_key VARCHAR(120)','refund_last_error VARCHAR(500)']:
    check('migration adds '+col.split()[0],col in migration)
check('refund state constraint exists','ck_payment_refund_state' in migration)
for st in ['NONE','REQUESTED','EVIDENCE_REQUIRED','SETTLED','REJECTED','FAILED']:
    check('refund state allows '+st, f"'{st}'" in migration)
check('refund attempts nonnegative','ck_payment_refund_attempts' in migration and 'refund_attempts >= 0' in migration)
check('legacy refunded rows backfill settled',"WHERE status = 'REFUNDED'" in migration and "refund_state = 'SETTLED'" in migration)
check('legacy refund operation key backfilled',"'legacy:' || id::text" in migration)
check('refund operation key unique index','uq_payment_refund_operation_key' in migration and 'CREATE UNIQUE INDEX' in migration)
check('refund state index exists','idx_payment_refund_state_updated' in migration)
check('refund reference index exists','idx_payment_refund_reference' in migration)

# migration webhook lifecycle
for col in ['delivery_state VARCHAR(24)','recovery_attempts INTEGER','last_recovery_at TIMESTAMPTZ','recovered_at TIMESTAMPTZ','recovery_message VARCHAR(500)']:
    check('migration adds webhook '+col.split()[0],col in migration)
check('webhook delivery constraint exists','ck_payment_webhook_delivery_state' in migration)
for st in ['RECEIVED','PROCESSED','REJECTED','ORPHANED','RECOVERY_PENDING','RECOVERED','DEAD_LETTER']:
    check('webhook state allows '+st,f"'{st}'" in migration)
check('webhook attempts nonnegative','ck_payment_webhook_recovery_attempts' in migration and 'recovery_attempts >= 0' in migration)
check('existing invalid signature becomes REJECTED','signature_valid = FALSE' in migration and "THEN 'REJECTED'" in migration)
check('existing missing payment becomes ORPHANED','payment_id IS NULL' in migration and "THEN 'ORPHANED'" in migration)
check('existing processed event becomes PROCESSED','processed_at IS NOT NULL' in migration and "THEN 'PROCESSED'" in migration)
check('unprocessed linked event becomes RECOVERY_PENDING',"ELSE 'RECOVERY_PENDING'" in migration)
check('webhook recovery queue index exists','idx_payment_webhook_recovery_queue' in migration)
check('webhook recovered index exists','idx_payment_webhook_recovered' in migration)
check('V67 migration creates no new table','CREATE TABLE' not in migration.upper())
check('V67 migration seeds no fake rows','INSERT INTO' not in migration.upper())

# entity mappings
for token in ['refundState','refundRequestedAt','refundSettledAt','refundAttempts','refundOperationKey','refundLastError']:
    check('Payment entity maps '+token,token in payment)
check('Payment defaults refund state NONE','refundState="NONE"' in payment)
check('Payment defaults refund attempts zero','refundAttempts=0' in payment)
for token in ['deliveryState','recoveryAttempts','lastRecoveryAt','recoveredAt','recoveryMessage']:
    check('Webhook entity maps '+token,token in webhook)
check('Webhook entity defaults RECEIVED','deliveryState="RECEIVED"' in webhook)
check('Webhook entity defaults attempts zero','recoveryAttempts=0' in webhook)

# repositories
check('Webhook repo counts delivery state','countByDeliveryState' in webrepo)
check('Webhook repo queries recoverable states','findByDeliveryStateInAndSignatureValidTrueOrderByReceivedAtAsc' in webrepo)
check('Webhook repo locks event for recovery','PESSIMISTIC_WRITE' in webrepo and 'findByIdForUpdate' in webrepo)
check('Payment repo counts refund state','countByRefundState' in payrepo)
check('Payment repo counts remote pending review','countByStatusInAndProviderIn' in payrepo)

# webhook processing and safe recovery
check('finishWebhook sets delivery state','setDeliveryState(webhookDeliveryState' in paysvc)
check('webhook claim uses durable receipt service','webhookReceipts.claim' in paysvc)
check('webhook receipt is REQUIRES_NEW','Propagation.REQUIRES_NEW' in receipt and '@Transactional' in receipt)
check('RECEIVED events are recoverable','List.of("RECEIVED","ORPHANED","RECOVERY_PENDING")' in recovery)
check('invalid signature maps rejected','!e.isSignatureValid()' in paysvc and 'return "REJECTED"' in paysvc)
check('invalid merchant maps rejected','invalid merchant' in paysvc.lower())
check('invalid amount maps rejected','invalid amount' in paysvc.lower())
check('unlinked processed webhook maps orphaned','if(p==null)return "ORPHANED"' in paysvc)
check('normal webhook maps processed','return "PROCESSED"' in paysvc)
check('recovery only accepts valid signature','!event.isSignatureValid()' in recovery)
check('rejected webhook cannot recover','"REJECTED".equals(event.getDeliveryState())' in recovery)
check('recovered event is idempotent','"RECOVERED".equals(event.getDeliveryState())' in recovery)
check('recovery resolves direct payment first','event.getPaymentId()!=null' in recovery and 'payments.findById' in recovery)
check('recovery parses provider order from event key','orderId(event.getEventKey())' in recovery)
check('rejected event key is not parsed','eventKey.startsWith("rejected:")' in recovery)
check('VNPay recovery lookup covers QR','List.of("VNPAY","VNPAY_QR")' in recovery)
check('MoMo recovery lookup covers QR','List.of("MOMO","MOMO_QR")' in recovery)
check('recovery never stores raw webhook payload','payload' not in recovery.lower())
check('recovery uses gateway reconciliation','adminPayments.reconcile' in recovery)
check('recovery marks RECOVERED on successful query','setDeliveryState("RECOVERED")' in recovery and 'setRecoveredAt' in recovery)
check('recovery bounded dead letter','"DEAD_LETTER"' in recovery and 'maxAttempts' in recovery)
check('recovery has exponential backoff','1L<<Math.min(5,previous)' in recovery)
check('recovery backoff has maximum','Math.min(maxBackoffSeconds' in recovery)
check('recovery batch bounded','maxBatch=Math.max(1,Math.min(100,maxBatch))' in recovery)
check('recovery attempts bounded','maxAttempts=Math.max(1,Math.min(20,maxAttempts))' in recovery)
check('manual recovery writes audit','PAYMENT_WEBHOOK_RECOVERED' in recovery and 'PAYMENT_WEBHOOK_RECOVERY_FAILED' in recovery)
check('recovery miss is audited','PAYMENT_WEBHOOK_RECOVERY_MISS' in recovery)
check('recovery job is scheduled','@Scheduled' in job)
check('recovery job can be disabled','app.payment.webhook-recovery.enabled' in job)
check('recovery job uses SYSTEM actor','"SYSTEM"' in job and 'AUTO_WEBHOOK_RECOVERY' in job)

# reconciliation V67
check('auto reconciliation defaults true in application','auto-enabled: ${PAYMENT_AUTO_RECONCILE_ENABLED:true}' in app)
check('auto reconciliation defaults true in compose','PAYMENT_AUTO_RECONCILE_ENABLED:-true' in compose)
check('auto reconciliation defaults true in env example','PAYMENT_AUTO_RECONCILE_ENABLED=true' in env)
check('reconciliation still verifies VNPay query signature','!r.signatureValid()' in adminsvc)
check('reconciliation still validates VNPay amount','VNPAY reconciliation amount mismatch' in adminsvc)
check('reconciliation still validates MoMo amount','MoMo reconciliation amount mismatch' in adminsvc)
check('reconciliation success still uses PaymentService success','paymentService.success' in adminsvc)
check('reconciliation failure increments counter','getReconciliationFailures' in adminsvc and '+1' in adminsvc)
check('reconciliation failure applies bounded backoff','Math.min(maxBackoffSeconds' in adminsvc)
check('AUTO_* reconciliation is SYSTEM actor','startsWith("AUTO")' in adminsvc and '"SYSTEM"' in adminsvc)

# config webhook recovery
for key in ['PAYMENT_WEBHOOK_RECOVERY_ENABLED','PAYMENT_WEBHOOK_RECOVERY_SCAN_MS','PAYMENT_WEBHOOK_RECOVERY_MIN_AGE_SECONDS','PAYMENT_WEBHOOK_RECOVERY_MAX_BATCH','PAYMENT_WEBHOOK_RECOVERY_MAX_ATTEMPTS','PAYMENT_WEBHOOK_RECOVERY_MAX_BACKOFF_SECONDS']:
    check('env example documents '+key,key in env)
    check('compose wires '+key,key in compose)
    check('application supports '+key,key in app)

# refund state workflow
check('refund request initializes payment refund state','beginRefundState(payment,b,q.gatewayConfirmationRequired())' in refund)
check('refund operation key deterministic per booking','"refund:"+b.getId()' in refund)
check('remote refund requires provider evidence','gatewayConfirmationRequired' in refund and 'EVIDENCE_REQUIRED' in refund)
check('refund request stores requested time','setRefundRequestedAt' in refund)
check('refund settlement marks SETTLED','setRefundState("SETTLED")' in refund)
check('refund settlement records settled time','setRefundSettledAt(now)' in refund)
check('refund settlement increments attempts','setRefundAttempts(n(p.getRefundAttempts())+1)' in refund)
check('refund settlement clears last error','setRefundLastError(null)' in refund)
check('refund rejection marks REJECTED','setRefundState("REJECTED")' in refund)
check('refund rejection records reason','Refund request rejected by admin' in refund)
check('already refunded mismatched reference conflicts','Booking đã hoàn tiền với provider reference khác' in refund)
check('remote provider still requires reference','Cần nhập mã/reference hoàn tiền từ cổng thanh toán' in refund)
check('MOCK automatic refund remains supported','boolean automatic=q.refundable() && q.autoPolicyEligible() && mock' in refund)

# API/summary
check('V67 admin namespace exists','@RequestMapping("/api/admin/payment-resilience")' in controller)
for route in ['/summary','/webhooks/{id}/recover','/recover-due','/reconcile-due']:
    check('V67 API route '+route,route in controller)
check('summary exposes strategy version','strategyVersion' in dtos and 'STRATEGY_VERSION' in resilience)
for field in ['dueReconcile','remotePendingOrReview','webhookOrphaned','webhookRecoveryPending','webhookDeadLetter','webhookRecovered','refundRequested','refundEvidenceRequired','refundSettled','refundFailed','recoveryQueue']:
    check('summary exposes '+field,field in dtos)
check('summary calculates due reconciliation','countByNextReconcileAtIsNotNullAndNextReconcileAtLessThanEqual' in resilience)
check('summary calculates webhook lifecycle counts','countByDeliveryState("ORPHANED")' in resilience and 'countByDeliveryState("DEAD_LETTER")' in resilience)
check('summary calculates refund settlement counts','countByRefundState("REQUESTED")' in resilience and 'countByRefundState("SETTLED")' in resilience)
check('summary returns recovery queue','recovery.queue()' in resilience)
check('summary counts only remote providers','VNPAY' in resilience and 'MOMO' in resilience)
check('summary exposes recovery config','webhookRecoveryMaxAttempts' in dtos and 'reconcileMaxBackoffSeconds' in dtos)

# frontend
check('frontend defines V67 summary type','PaymentResilienceSummaryV67' in ftypes)
check('frontend defines recovery item type','PaymentWebhookRecoveryItemV67' in ftypes)
check('frontend defines recovery result type','PaymentWebhookRecoveryResultV67' in ftypes)
check('frontend webhook admin type includes delivery state','deliveryState:string' in ftypes and 'recoveryAttempts:number' in ftypes)
check('Admin dashboard V67 tile exists','admin-payment-resilience-v67' in adminpage and 'Payment Resilience V67' in adminpage)
check('Admin V67 tile links route','href="/admin/payment-resilience"' in adminpage)
check('Header mobile links V67','Payment Resilience V67' in header and '/admin/payment-resilience' in header)
check('Payment V60 page links V67','Payment Resilience V67' in paypage)
check('Payment V60 webhook table shows state','e.deliveryState' in paypage and 'recoveryAttempts' in paypage)
check('V67 UI root test id','payment-resilience-v67' in ui)
check('V67 UI strategy test id','payment-resilience-strategy-v67' in ui)
check('V67 UI summary test id','payment-resilience-summary-v67' in ui)
check('V67 UI recovery queue test id','webhook-recovery-queue-v67' in ui)
check('V67 UI refund state panel','refund-settlement-v67' in ui)
check('V67 UI gateway reconciliation panel','payment-reconcile-policy-v67' in ui)
check('V67 UI manual recover action','/webhooks/${id}/recover' in ui)
check('V67 UI batch recovery action','/recover-due' in ui)
check('V67 UI batch reconciliation action','/reconcile-due' in ui)
check('V67 UI states safe no-payload replay policy','không được replay như nguồn sự thật' in ui)
check('V67 UI auto refreshes','REFRESH_MS=10_000' in ui and 'setInterval' in ui)
check('V67 UI requires ADMIN role','me.role!=="ADMIN"' in ui)

# e2e
check('V67 E2E logs in as admin','loginAdmin' in e2e)
check('V67 E2E checks dashboard tile','admin-payment-resilience-v67' in e2e)
check('V67 E2E visits route',r'admin\/payment-resilience' in e2e or '/admin/payment-resilience' in e2e)
check('V67 E2E checks strategy','V67-PAYMENT-RESILIENCE-5' in e2e)
check('V67 E2E checks no error','payment-resilience-error-v67' in e2e)
check('V67 E2E checks refund settlement','refund-settlement-v67' in e2e)
check('V67 E2E checks recovery queue','webhook-recovery-queue-v67' in e2e)
check('V67 E2E checks safe replay wording','không được replay như nguồn sự thật' in e2e)

# release lifecycle
check('CI runs V67 verifier','verify_v67_payment_resilience_reconciliation.py' in ci)
check('CI source regression names V67 or later',any(x in ci for x in ['V26-V67 source regression','V26-V68 source regression','V26-V69 source regression','V26-V70 source regression','V26-V71 source regression']))
check('RC runs V67 verifier','verify_v67_payment_resilience_reconciliation.py' in rc)
check('RC defaults v67 rc1','v67.0.0-rc.1' in rc)
check('RC compose namespace V67','cinebooking_v67_rc_' in rc)
check('RC browser label includes V67','+ V67)' in rc)
check('Stable runs V67 verifier','verify_v67_payment_resilience_reconciliation.py' in release)
check('Stable defaults 67.0.0','default: "67.0.0"' in release)
check('Stable compose namespace V67','cinebooking_v67_release_' in release)
check('Makefile exposes verify-v67','verify-v67:' in make and 'verify_v67_payment_resilience_reconciliation.py' in make)
check('Makefile exposes diagnose-v67','diagnose-v67:' in make)
check('Diagnose V67 chains V66','verify_v66_booking_consistency_seat_locking.py' in diagnose)
check('Diagnose V67 runs V67 gate','verify_v67_payment_resilience_reconciliation.py' in diagnose)
check('Diagnose V67 states Flyway V67','Flyway V67' in diagnose)
check('Integration expects Flyway >=67',any(x in itest for x in ['isGreaterThanOrEqualTo(67)','isGreaterThanOrEqualTo(68)','isGreaterThanOrEqualTo(69)','isGreaterThanOrEqualTo(70)','isGreaterThanOrEqualTo(71)']))
check('Integration still expects at least 58 tables',any(x in itest for x in ['publicTables).isGreaterThanOrEqualTo(58)','publicTables).isGreaterThanOrEqualTo(59)','publicTables).isGreaterThanOrEqualTo(61)','publicTables).isGreaterThanOrEqualTo(63)','publicTables).isGreaterThanOrEqualTo(65)']))
check('Integration verifies V67 refund columns','paymentV67RefundColumns' in itest and 'isEqualTo(6)' in itest)
check('Integration verifies V67 webhook recovery columns','webhookV67RecoveryColumns' in itest and 'isEqualTo(5)' in itest)
check('V66 verifier forward-compatible with V67 integration expectation',any(x in text('tools/verify_v66_booking_consistency_seat_locking.py') for x in ['isGreaterThanOrEqualTo(67)','isGreaterThanOrEqualTo(68)','isGreaterThanOrEqualTo(69)','isGreaterThanOrEqualTo(70)','isGreaterThanOrEqualTo(71)']))

# docs/data
check('README history includes V67','| **V67** |' in readme)
check('README documents strategy','V67-PAYMENT-RESILIENCE-5' in readme)
check('README documents no blind payload replay','không replay mù payload webhook' in readme)
check('README documents refund states','EVIDENCE_REQUIRED' in readme and 'SETTLED' in readme)
check('README documents Admin route','/admin/payment-resilience' in readme)
check('README documents Flyway latest V67','Flyway latest: V67' in readme)
check('README keeps 58 public tables','Public tables: 58' in readme or '58 public tables' in readme)
check('README documents no new V67 table','New V67 tables: 0' in readme)
check('README documents V67 stable release','v67.0.0' in readme)
check('V67 does not add synthetic seed SQL','V67' not in seed)

passed=sum(ok for _,ok in checks)
print(f"\nV67 verification: {passed}/{len(checks)} checks passed")
if passed!=len(checks):
    print('\nFailed checks:')
    for name,ok in checks:
        if not ok: print(' - '+name)
    sys.exit(1)
