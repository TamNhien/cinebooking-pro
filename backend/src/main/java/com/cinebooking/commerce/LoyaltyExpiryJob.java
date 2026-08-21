package com.cinebooking.commerce;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
@Component
public class LoyaltyExpiryJob {
    private final LoyaltyService loyalty;
    public LoyaltyExpiryJob(LoyaltyService loyalty){this.loyalty=loyalty;}
    @Scheduled(fixedDelayString="${app.loyalty.expiry-scan-ms:3600000}")
    public void expire(){loyalty.expireSweep();loyalty.engagementSweep();}
}
