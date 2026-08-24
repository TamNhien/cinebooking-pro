\pset pager off
\pset border 2
\pset null '(null)'

WITH counts AS (
SELECT 'app_user'::text AS table_name, COUNT(*)::bigint AS row_count FROM app_user
UNION ALL
SELECT 'audit_log'::text AS table_name, COUNT(*)::bigint AS row_count FROM audit_log
UNION ALL
SELECT 'auditorium'::text AS table_name, COUNT(*)::bigint AS row_count FROM auditorium
UNION ALL
SELECT 'auditorium_blackout'::text AS table_name, COUNT(*)::bigint AS row_count FROM auditorium_blackout
UNION ALL
SELECT 'auth_session'::text AS table_name, COUNT(*)::bigint AS row_count FROM auth_session
UNION ALL
SELECT 'booking'::text AS table_name, COUNT(*)::bigint AS row_count FROM booking
UNION ALL
SELECT 'booking_concession'::text AS table_name, COUNT(*)::bigint AS row_count FROM booking_concession
UNION ALL
SELECT 'booking_seat'::text AS table_name, COUNT(*)::bigint AS row_count FROM booking_seat
UNION ALL
SELECT 'cinema'::text AS table_name, COUNT(*)::bigint AS row_count FROM cinema
UNION ALL
SELECT 'cinema_equipment_asset'::text AS table_name, COUNT(*)::bigint AS row_count FROM cinema_equipment_asset
UNION ALL
SELECT 'cinema_concession_inventory'::text AS table_name, COUNT(*)::bigint AS row_count FROM cinema_concession_inventory
UNION ALL
SELECT 'cinema_concession_price'::text AS table_name, COUNT(*)::bigint AS row_count FROM cinema_concession_price
UNION ALL
SELECT 'cinema_concession_cost_basis'::text AS table_name, COUNT(*)::bigint AS row_count FROM cinema_concession_cost_basis
UNION ALL
SELECT 'concession_product'::text AS table_name, COUNT(*)::bigint AS row_count FROM concession_product
UNION ALL
SELECT 'customer_support_case'::text AS table_name, COUNT(*)::bigint AS row_count FROM customer_support_case
UNION ALL
SELECT 'customer_support_case_event'::text AS table_name, COUNT(*)::bigint AS row_count FROM customer_support_case_event
UNION ALL
SELECT 'financial_ledger_entry'::text AS table_name, COUNT(*)::bigint AS row_count FROM financial_ledger_entry
UNION ALL
SELECT 'financial_ledger_line'::text AS table_name, COUNT(*)::bigint AS row_count FROM financial_ledger_line
UNION ALL
SELECT 'financial_reconciliation_issue'::text AS table_name, COUNT(*)::bigint AS row_count FROM financial_reconciliation_issue
UNION ALL
SELECT 'financial_reconciliation_run'::text AS table_name, COUNT(*)::bigint AS row_count FROM financial_reconciliation_run
UNION ALL
SELECT 'flyway_schema_history'::text AS table_name, COUNT(*)::bigint AS row_count FROM flyway_schema_history
UNION ALL
SELECT 'inventory_movement'::text AS table_name, COUNT(*)::bigint AS row_count FROM inventory_movement
UNION ALL
SELECT 'loyalty_point_lot'::text AS table_name, COUNT(*)::bigint AS row_count FROM loyalty_point_lot
UNION ALL
SELECT 'loyalty_reward'::text AS table_name, COUNT(*)::bigint AS row_count FROM loyalty_reward
UNION ALL
SELECT 'loyalty_reward_redemption'::text AS table_name, COUNT(*)::bigint AS row_count FROM loyalty_reward_redemption
UNION ALL
SELECT 'loyalty_transaction'::text AS table_name, COUNT(*)::bigint AS row_count FROM loyalty_transaction
UNION ALL
SELECT 'maintenance_work_order'::text AS table_name, COUNT(*)::bigint AS row_count FROM maintenance_work_order
UNION ALL
SELECT 'maintenance_work_order_event'::text AS table_name, COUNT(*)::bigint AS row_count FROM maintenance_work_order_event
UNION ALL
SELECT 'movie'::text AS table_name, COUNT(*)::bigint AS row_count FROM movie
UNION ALL
SELECT 'movie_favorite'::text AS table_name, COUNT(*)::bigint AS row_count FROM movie_favorite
UNION ALL
SELECT 'movie_review'::text AS table_name, COUNT(*)::bigint AS row_count FROM movie_review
UNION ALL
SELECT 'notification_preference'::text AS table_name, COUNT(*)::bigint AS row_count FROM notification_preference
UNION ALL
SELECT 'password_reset_token'::text AS table_name, COUNT(*)::bigint AS row_count FROM password_reset_token
UNION ALL
SELECT 'payment'::text AS table_name, COUNT(*)::bigint AS row_count FROM payment
UNION ALL
SELECT 'payment_event'::text AS table_name, COUNT(*)::bigint AS row_count FROM payment_event
UNION ALL
SELECT 'payment_webhook_event'::text AS table_name, COUNT(*)::bigint AS row_count FROM payment_webhook_event
UNION ALL
SELECT 'pricing_rule'::text AS table_name, COUNT(*)::bigint AS row_count FROM pricing_rule
UNION ALL
SELECT 'recommendation_event'::text AS table_name, COUNT(*)::bigint AS row_count FROM recommendation_event
UNION ALL
SELECT 'recommendation_feedback'::text AS table_name, COUNT(*)::bigint AS row_count FROM recommendation_feedback
UNION ALL
SELECT 'analytics_snapshot'::text AS table_name, COUNT(*)::bigint AS row_count FROM analytics_snapshot
UNION ALL
SELECT 'seat'::text AS table_name, COUNT(*)::bigint AS row_count FROM seat
UNION ALL
SELECT 'showtime'::text AS table_name, COUNT(*)::bigint AS row_count FROM showtime
UNION ALL
SELECT 'showtime_planning_run'::text AS table_name, COUNT(*)::bigint AS row_count FROM showtime_planning_run
UNION ALL
SELECT 'showtime_waitlist'::text AS table_name, COUNT(*)::bigint AS row_count FROM showtime_waitlist
UNION ALL
SELECT 'staff_attendance'::text AS table_name, COUNT(*)::bigint AS row_count FROM staff_attendance
UNION ALL
SELECT 'staff_incident'::text AS table_name, COUNT(*)::bigint AS row_count FROM staff_incident
UNION ALL
SELECT 'staff_leave_request'::text AS table_name, COUNT(*)::bigint AS row_count FROM staff_leave_request
UNION ALL
SELECT 'staff_profile'::text AS table_name, COUNT(*)::bigint AS row_count FROM staff_profile
UNION ALL
SELECT 'staff_shift'::text AS table_name, COUNT(*)::bigint AS row_count FROM staff_shift
UNION ALL
SELECT 'staff_shift_handover'::text AS table_name, COUNT(*)::bigint AS row_count FROM staff_shift_handover
UNION ALL
SELECT 'ticket_checkin_log'::text AS table_name, COUNT(*)::bigint AS row_count FROM ticket_checkin_log
UNION ALL
SELECT 'trusted_device'::text AS table_name, COUNT(*)::bigint AS row_count FROM trusted_device
UNION ALL
SELECT 'security_alert'::text AS table_name, COUNT(*)::bigint AS row_count FROM security_alert
UNION ALL
SELECT 'user_notification'::text AS table_name, COUNT(*)::bigint AS row_count FROM user_notification
UNION ALL
SELECT 'voucher'::text AS table_name, COUNT(*)::bigint AS row_count FROM voucher
UNION ALL
SELECT 'voucher_redemption'::text AS table_name, COUNT(*)::bigint AS row_count FROM voucher_redemption
)
SELECT table_name, row_count,
       CASE
           WHEN table_name = 'cinema_concession_cost_basis' AND row_count = 0 THEN 'OPTIONAL_EMPTY'
           WHEN row_count = 0 THEN 'EMPTY'
           ELSE 'OK'
       END AS status
FROM counts
ORDER BY table_name;

WITH counts AS (
SELECT 'app_user'::text AS table_name, COUNT(*)::bigint AS row_count FROM app_user
UNION ALL
SELECT 'audit_log'::text AS table_name, COUNT(*)::bigint AS row_count FROM audit_log
UNION ALL
SELECT 'auditorium'::text AS table_name, COUNT(*)::bigint AS row_count FROM auditorium
UNION ALL
SELECT 'auditorium_blackout'::text AS table_name, COUNT(*)::bigint AS row_count FROM auditorium_blackout
UNION ALL
SELECT 'auth_session'::text AS table_name, COUNT(*)::bigint AS row_count FROM auth_session
UNION ALL
SELECT 'booking'::text AS table_name, COUNT(*)::bigint AS row_count FROM booking
UNION ALL
SELECT 'booking_concession'::text AS table_name, COUNT(*)::bigint AS row_count FROM booking_concession
UNION ALL
SELECT 'booking_seat'::text AS table_name, COUNT(*)::bigint AS row_count FROM booking_seat
UNION ALL
SELECT 'cinema'::text AS table_name, COUNT(*)::bigint AS row_count FROM cinema
UNION ALL
SELECT 'cinema_equipment_asset'::text AS table_name, COUNT(*)::bigint AS row_count FROM cinema_equipment_asset
UNION ALL
SELECT 'cinema_concession_inventory'::text AS table_name, COUNT(*)::bigint AS row_count FROM cinema_concession_inventory
UNION ALL
SELECT 'cinema_concession_price'::text AS table_name, COUNT(*)::bigint AS row_count FROM cinema_concession_price
UNION ALL
SELECT 'cinema_concession_cost_basis'::text AS table_name, COUNT(*)::bigint AS row_count FROM cinema_concession_cost_basis
UNION ALL
SELECT 'concession_product'::text AS table_name, COUNT(*)::bigint AS row_count FROM concession_product
UNION ALL
SELECT 'customer_support_case'::text AS table_name, COUNT(*)::bigint AS row_count FROM customer_support_case
UNION ALL
SELECT 'customer_support_case_event'::text AS table_name, COUNT(*)::bigint AS row_count FROM customer_support_case_event
UNION ALL
SELECT 'financial_ledger_entry'::text AS table_name, COUNT(*)::bigint AS row_count FROM financial_ledger_entry
UNION ALL
SELECT 'financial_ledger_line'::text AS table_name, COUNT(*)::bigint AS row_count FROM financial_ledger_line
UNION ALL
SELECT 'financial_reconciliation_issue'::text AS table_name, COUNT(*)::bigint AS row_count FROM financial_reconciliation_issue
UNION ALL
SELECT 'financial_reconciliation_run'::text AS table_name, COUNT(*)::bigint AS row_count FROM financial_reconciliation_run
UNION ALL
SELECT 'flyway_schema_history'::text AS table_name, COUNT(*)::bigint AS row_count FROM flyway_schema_history
UNION ALL
SELECT 'inventory_movement'::text AS table_name, COUNT(*)::bigint AS row_count FROM inventory_movement
UNION ALL
SELECT 'loyalty_point_lot'::text AS table_name, COUNT(*)::bigint AS row_count FROM loyalty_point_lot
UNION ALL
SELECT 'loyalty_reward'::text AS table_name, COUNT(*)::bigint AS row_count FROM loyalty_reward
UNION ALL
SELECT 'loyalty_reward_redemption'::text AS table_name, COUNT(*)::bigint AS row_count FROM loyalty_reward_redemption
UNION ALL
SELECT 'loyalty_transaction'::text AS table_name, COUNT(*)::bigint AS row_count FROM loyalty_transaction
UNION ALL
SELECT 'maintenance_work_order'::text AS table_name, COUNT(*)::bigint AS row_count FROM maintenance_work_order
UNION ALL
SELECT 'maintenance_work_order_event'::text AS table_name, COUNT(*)::bigint AS row_count FROM maintenance_work_order_event
UNION ALL
SELECT 'movie'::text AS table_name, COUNT(*)::bigint AS row_count FROM movie
UNION ALL
SELECT 'movie_favorite'::text AS table_name, COUNT(*)::bigint AS row_count FROM movie_favorite
UNION ALL
SELECT 'movie_review'::text AS table_name, COUNT(*)::bigint AS row_count FROM movie_review
UNION ALL
SELECT 'notification_preference'::text AS table_name, COUNT(*)::bigint AS row_count FROM notification_preference
UNION ALL
SELECT 'password_reset_token'::text AS table_name, COUNT(*)::bigint AS row_count FROM password_reset_token
UNION ALL
SELECT 'payment'::text AS table_name, COUNT(*)::bigint AS row_count FROM payment
UNION ALL
SELECT 'payment_event'::text AS table_name, COUNT(*)::bigint AS row_count FROM payment_event
UNION ALL
SELECT 'payment_webhook_event'::text AS table_name, COUNT(*)::bigint AS row_count FROM payment_webhook_event
UNION ALL
SELECT 'pricing_rule'::text AS table_name, COUNT(*)::bigint AS row_count FROM pricing_rule
UNION ALL
SELECT 'recommendation_event'::text AS table_name, COUNT(*)::bigint AS row_count FROM recommendation_event
UNION ALL
SELECT 'recommendation_feedback'::text AS table_name, COUNT(*)::bigint AS row_count FROM recommendation_feedback
UNION ALL
SELECT 'analytics_snapshot'::text AS table_name, COUNT(*)::bigint AS row_count FROM analytics_snapshot
UNION ALL
SELECT 'seat'::text AS table_name, COUNT(*)::bigint AS row_count FROM seat
UNION ALL
SELECT 'showtime'::text AS table_name, COUNT(*)::bigint AS row_count FROM showtime
UNION ALL
SELECT 'showtime_planning_run'::text AS table_name, COUNT(*)::bigint AS row_count FROM showtime_planning_run
UNION ALL
SELECT 'showtime_waitlist'::text AS table_name, COUNT(*)::bigint AS row_count FROM showtime_waitlist
UNION ALL
SELECT 'staff_attendance'::text AS table_name, COUNT(*)::bigint AS row_count FROM staff_attendance
UNION ALL
SELECT 'staff_incident'::text AS table_name, COUNT(*)::bigint AS row_count FROM staff_incident
UNION ALL
SELECT 'staff_leave_request'::text AS table_name, COUNT(*)::bigint AS row_count FROM staff_leave_request
UNION ALL
SELECT 'staff_profile'::text AS table_name, COUNT(*)::bigint AS row_count FROM staff_profile
UNION ALL
SELECT 'staff_shift'::text AS table_name, COUNT(*)::bigint AS row_count FROM staff_shift
UNION ALL
SELECT 'staff_shift_handover'::text AS table_name, COUNT(*)::bigint AS row_count FROM staff_shift_handover
UNION ALL
SELECT 'ticket_checkin_log'::text AS table_name, COUNT(*)::bigint AS row_count FROM ticket_checkin_log
UNION ALL
SELECT 'trusted_device'::text AS table_name, COUNT(*)::bigint AS row_count FROM trusted_device
UNION ALL
SELECT 'security_alert'::text AS table_name, COUNT(*)::bigint AS row_count FROM security_alert
UNION ALL
SELECT 'user_notification'::text AS table_name, COUNT(*)::bigint AS row_count FROM user_notification
UNION ALL
SELECT 'voucher'::text AS table_name, COUNT(*)::bigint AS row_count FROM voucher
UNION ALL
SELECT 'voucher_redemption'::text AS table_name, COUNT(*)::bigint AS row_count FROM voucher_redemption
)
SELECT COUNT(*) AS required_empty_tables
FROM counts
WHERE row_count = 0
  AND table_name <> 'cinema_concession_cost_basis';
