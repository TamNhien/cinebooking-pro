package com.cinebooking.seat;

import com.cinebooking.domain.SeatHoldRecord;
import com.cinebooking.websocket.SeatEventPublisher;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.*;

@Component
public class SeatHoldExpiryJob {
    private final SeatHoldService holds;
    private final SeatEventPublisher events;
    private final int batchSize;

    public SeatHoldExpiryJob(SeatHoldService holds,SeatEventPublisher events,
                             @Value("${app.seat-hold.expiry-batch-size:200}") int batchSize){
        this.holds=holds;this.events=events;this.batchSize=Math.max(10,Math.min(batchSize,200));
    }

    @Scheduled(fixedDelayString="${app.seat-hold.expiry-scan-ms:5000}")
    public void expire(){
        List<SeatHoldRecord> expired=holds.expireBatch(batchSize);
        Map<UUID,List<UUID>> byShowtime=new HashMap<>();
        for(SeatHoldRecord row:expired) byShowtime.computeIfAbsent(row.getShowtimeId(),k->new ArrayList<>()).add(row.getSeatId());
        byShowtime.forEach((showtimeId,seatIds)->events.publish(showtimeId,"HOLD_EXPIRED",seatIds));
    }
}
