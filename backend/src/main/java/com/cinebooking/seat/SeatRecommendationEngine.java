package com.cinebooking.seat;

import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.*;

import static com.cinebooking.seat.SeatDtos.*;

/**
 * V57 Booking & Seat Intelligence 3.0 policy/ranking engine.
 * The recommendation is deterministic and transparent: contiguous availability, center distance,
 * row distance, orphan-seat protection and the real dynamic price already exposed by the seat map.
 */
@Component
public class SeatRecommendationEngine {

    public SelectionValidationResponse validate(List<SeatResponse> seats, Collection<UUID> selectedIds) {
        Set<UUID> selected = selectedIds == null ? Set.of() : new HashSet<>(selectedIds);
        if (selected.isEmpty()) return new SelectionValidationResponse(true, List.of(), "OK");

        Map<String,List<SeatResponse>> rows = groupRows(seats);
        Set<String> before = orphanCodes(rows, Set.of());
        Set<String> after = orphanCodes(rows, selected);
        after.removeAll(before); // never punish a customer for a pre-existing single gap.
        List<String> newOrphans = after.stream().sorted(this::naturalSeatCompare).toList();
        if (newOrphans.isEmpty()) return new SelectionValidationResponse(true, List.of(), "OK");
        return new SelectionValidationResponse(false, newOrphans,
                "Lựa chọn này tạo ghế trống đơn lẻ: " + String.join(", ", newOrphans) + ". Hãy chọn cụm ghế liền nhau.");
    }

    public List<SeatSuggestion> suggest(List<SeatResponse> seats, int count, int limit) {
        if (count < 1) throw new IllegalArgumentException("count must be positive");
        int safeLimit = Math.max(1, Math.min(limit, 10));
        Map<String,List<SeatResponse>> rows = groupRows(seats);
        List<String> rowNames = new ArrayList<>(rows.keySet());
        rowNames.sort(String::compareToIgnoreCase);
        double rowCenter = rowNames.isEmpty() ? 0 : (rowNames.size() - 1) / 2.0;
        List<SeatSuggestion> candidates = new ArrayList<>();

        for (int rowIndex=0; rowIndex<rowNames.size(); rowIndex++) {
            String rowName = rowNames.get(rowIndex);
            List<SeatResponse> row = rows.get(rowName);
            for (int start=0; start+count<=row.size(); start++) {
                List<SeatResponse> group = row.subList(start,start+count);
                if (!isContiguousAvailable(group)) continue;
                Set<UUID> ids = group.stream().map(SeatResponse::id).collect(java.util.stream.Collectors.toSet());
                if (!validate(seats, ids).allowed()) continue;

                double seatCenter = (row.get(0).seatNumber() + row.get(row.size()-1).seatNumber()) / 2.0;
                double groupCenter = group.stream().mapToInt(SeatResponse::seatNumber).average().orElse(seatCenter);
                double seatDistance = Math.abs(groupCenter-seatCenter);
                double rowDistance = Math.abs(rowIndex-rowCenter);
                int centerScore = clamp(100 - (int)Math.round(seatDistance*18));
                int rowScore = clamp(100 - (int)Math.round(rowDistance*12));
                int orphanSafetyScore = 100; // candidate already passed validate(...).

                long accessible = group.stream().filter(s -> "ACCESSIBLE".equals(s.seatType())).count();
                long couple = group.stream().filter(s -> "COUPLE".equals(s.seatType())).count();
                long vip = group.stream().filter(s -> "VIP".equals(s.seatType())).count();
                int inventoryPenalty = (int)(accessible*120) + (count==1 ? (int)(couple*35) : 0); // preserve accessible inventory unless explicitly needed.
                int score = 700 + centerScore + rowScore + orphanSafetyScore - inventoryPenalty + (int)(vip*8);

                BigDecimal total = group.stream().map(SeatResponse::price).reduce(BigDecimal.ZERO, BigDecimal::add);
                BigDecimal dynamic = group.stream().map(SeatResponse::dynamicAdjustment).reduce(BigDecimal.ZERO, BigDecimal::add);
                List<UUID> seatIds = group.stream().map(SeatResponse::id).toList();
                List<String> codes = group.stream().map(SeatResponse::code).toList();
                String quality = score >= 975 ? "BEST" : score >= 930 ? "GREAT" : "GOOD";
                String reason = "V57 · Hàng " + rowName + " · " + count + " ghế liền nhau · gần trung tâm · không tạo ghế trống đơn";
                candidates.add(new SeatSuggestion(seatIds,codes,total,dynamic,score,centerScore,rowScore,orphanSafetyScore,quality,reason));
            }
        }

        return candidates.stream()
                .sorted(Comparator.comparingInt(SeatSuggestion::score).reversed()
                        .thenComparing(SeatSuggestion::totalPrice)
                        .thenComparing(x -> String.join(",",x.seatCodes())))
                .limit(safeLimit)
                .toList();
    }

    private int clamp(int value) { return Math.max(0, Math.min(100, value)); }

    private Map<String,List<SeatResponse>> groupRows(List<SeatResponse> seats) {
        Map<String,List<SeatResponse>> rows = new LinkedHashMap<>();
        if (seats != null) for (SeatResponse seat : seats) rows.computeIfAbsent(seat.rowLabel(), x->new ArrayList<>()).add(seat);
        rows.values().forEach(row -> row.sort(Comparator.comparingInt(SeatResponse::seatNumber)));
        return rows;
    }

    private Set<String> orphanCodes(Map<String,List<SeatResponse>> rows, Set<UUID> selected) {
        Set<String> result = new LinkedHashSet<>();
        for (List<SeatResponse> row : rows.values()) {
            for (int i=1;i<row.size()-1;i++) {
                SeatResponse current=row.get(i);
                if (!isAvailableAfterSelection(current,selected)) continue;
                SeatResponse left=row.get(i-1), right=row.get(i+1);
                if (!adjacent(left,current) || !adjacent(current,right)) continue;
                if (isUnavailableAfterSelection(left,selected) && isUnavailableAfterSelection(right,selected)) result.add(current.code());
            }
        }
        return result;
    }

    private boolean isContiguousAvailable(List<SeatResponse> group) {
        for(int i=0;i<group.size();i++) {
            SeatResponse s=group.get(i);
            if (!"AVAILABLE".equals(s.status())) return false;
            if (i>0 && !adjacent(group.get(i-1),s)) return false;
        }
        return true;
    }

    private boolean adjacent(SeatResponse a, SeatResponse b) {
        return a.rowLabel().equalsIgnoreCase(b.rowLabel()) && b.seatNumber()==a.seatNumber()+1;
    }
    private boolean isAvailableAfterSelection(SeatResponse s, Set<UUID> selected) {
        return "AVAILABLE".equals(s.status()) && !selected.contains(s.id());
    }
    private boolean isUnavailableAfterSelection(SeatResponse s, Set<UUID> selected) {
        return selected.contains(s.id()) || !"AVAILABLE".equals(s.status());
    }
    private int naturalSeatCompare(String a,String b) { return a.compareToIgnoreCase(b); }
}
