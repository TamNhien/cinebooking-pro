package com.cinebooking.security;

import java.util.Locale;

public final class SecurityRiskRules {
    private SecurityRiskRules(){}
    public static int score(String eventType){
        String t=eventType==null?"":eventType.toUpperCase(Locale.ROOT);
        return switch(t){
            case "CREDENTIAL_ATTACK" -> 80;
            case "PASSWORD_RESET" -> 75;
            case "PASSWORD_CHANGED" -> 50;
            case "SESSION_REVOKED" -> 35;
            case "NEW_DEVICE" -> 45;
            default -> 20;
        };
    }
    public static String severity(String eventType){
        int score=score(eventType);
        if(score>=90)return "CRITICAL";
        if(score>=70)return "HIGH";
        if(score>=40)return "MEDIUM";
        return "LOW";
    }
    public static boolean highRisk(String eventType){return score(eventType)>=70;}
}
