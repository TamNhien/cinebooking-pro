package com.cinebooking.payment;

import com.cinebooking.domain.PaymentStatus;
import java.time.Instant;

public final class PaymentRetryRules {
    private PaymentRetryRules(){}
    public static boolean canCancel(PaymentStatus status){return status==PaymentStatus.PENDING;}
    public static boolean canRetry(PaymentStatus status, Instant bookingExpiresAt, Instant now){
        if(status!=PaymentStatus.FAILED&&status!=PaymentStatus.CANCELLED)return false;
        return bookingExpiresAt==null||bookingExpiresAt.isAfter(now);
    }
    public static boolean terminal(PaymentStatus status){
        return status==PaymentStatus.SUCCESS||status==PaymentStatus.FAILED||status==PaymentStatus.EXPIRED||status==PaymentStatus.CANCELLED||status==PaymentStatus.REFUNDED;
    }
}
