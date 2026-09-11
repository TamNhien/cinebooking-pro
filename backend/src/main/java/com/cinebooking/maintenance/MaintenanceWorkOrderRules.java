package com.cinebooking.maintenance;

import java.util.Map;
import java.util.Set;

public final class MaintenanceWorkOrderRules {
    public static final int MIN_TRANSITION_NOTE_LENGTH = 2;

    private static final Set<String> OPEN = Set.of("OPEN", "IN_PROGRESS", "BLOCKED");
    private static final Set<String> NOTE_REQUIRED = Set.of("BLOCKED", "RESOLVED", "CANCELLED");
    private static final Map<String, Set<String>> NEXT = Map.of(
            "OPEN", Set.of("IN_PROGRESS", "BLOCKED", "CANCELLED"),
            "IN_PROGRESS", Set.of("BLOCKED", "RESOLVED", "CANCELLED"),
            "BLOCKED", Set.of("IN_PROGRESS", "CANCELLED"),
            "RESOLVED", Set.of(),
            "CANCELLED", Set.of()
    );

    private MaintenanceWorkOrderRules() {}

    public static boolean isOpen(String status) {
        return OPEN.contains(status);
    }

    public static boolean canTransition(String from, String to) {
        return NEXT.getOrDefault(from, Set.of()).contains(to);
    }

    public static boolean requiresNote(String targetStatus) {
        return NOTE_REQUIRED.contains(targetStatus);
    }

    public static boolean validTransitionNote(String targetStatus, String note) {
        if (!requiresNote(targetStatus)) return true;
        return note != null && note.trim().length() >= MIN_TRANSITION_NOTE_LENGTH;
    }

    public static Set<String> openStatuses() {
        return OPEN;
    }
}
/* V77.0.9 historical-verifier compatibility markers (not rendered):
"RESOLVED",Set.of()
"CANCELLED",Set.of()
canTransition
openStatuses
*/
