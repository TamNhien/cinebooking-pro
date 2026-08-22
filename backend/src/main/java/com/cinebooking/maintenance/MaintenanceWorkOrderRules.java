package com.cinebooking.maintenance;

import java.util.*;

public final class MaintenanceWorkOrderRules {
    private static final Set<String> OPEN = Set.of("OPEN","IN_PROGRESS","BLOCKED");
    private static final Map<String,Set<String>> NEXT = Map.of(
            "OPEN",Set.of("IN_PROGRESS","BLOCKED","CANCELLED"),
            "IN_PROGRESS",Set.of("BLOCKED","RESOLVED","CANCELLED"),
            "BLOCKED",Set.of("IN_PROGRESS","CANCELLED"),
            "RESOLVED",Set.of(),
            "CANCELLED",Set.of()
    );
    private MaintenanceWorkOrderRules(){}
    public static boolean isOpen(String status){return OPEN.contains(status);}
    public static boolean canTransition(String from,String to){return NEXT.getOrDefault(from,Set.of()).contains(to);}
    public static Set<String> openStatuses(){return OPEN;}
}
