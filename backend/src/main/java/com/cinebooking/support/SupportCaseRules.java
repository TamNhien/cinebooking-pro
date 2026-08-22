package com.cinebooking.support;
import java.time.*;
import java.util.*;
public final class SupportCaseRules {
    private static final Set<String> OPEN=Set.of("OPEN","IN_PROGRESS","WAITING_CUSTOMER");
    private static final Map<String,Set<String>> TRANSITIONS=Map.of(
        "OPEN",Set.of("IN_PROGRESS","CLOSED"),
        "IN_PROGRESS",Set.of("WAITING_CUSTOMER","RESOLVED","CLOSED"),
        "WAITING_CUSTOMER",Set.of("IN_PROGRESS","RESOLVED","CLOSED"),
        "RESOLVED",Set.of("IN_PROGRESS","CLOSED"),
        "CLOSED",Set.of()
    );
    private SupportCaseRules(){}
    public static Set<String> openStatuses(){return OPEN;}
    public static boolean isOpen(String s){return OPEN.contains(s);}
    public static boolean canTransition(String from,String to){return TRANSITIONS.getOrDefault(from,Set.of()).contains(to);}
    public static Duration sla(String priority){return switch(priority){case "CRITICAL"->Duration.ofHours(4);case "HIGH"->Duration.ofHours(24);case "LOW"->Duration.ofHours(72);default->Duration.ofHours(48);};}
}
