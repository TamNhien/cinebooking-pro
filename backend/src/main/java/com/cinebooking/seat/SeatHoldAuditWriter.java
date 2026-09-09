package com.cinebooking.seat;

import com.cinebooking.audit.AuditService;
import com.cinebooking.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class SeatHoldAuditWriter {
    private final AuditService audit;
    private final UserRepository users;

    public SeatHoldAuditWriter(AuditService audit, UserRepository users){this.audit=audit;this.users=users;}

    @Transactional(propagation=Propagation.REQUIRES_NEW)
    public void userEvent(UUID userId,String action,String entityId,String details){
        String email=users.findById(userId).map(x->x.getEmail()).orElse(null);
        audit.record(email,action,"SEAT_HOLD",entityId,details,null);
    }

    @Transactional(propagation=Propagation.REQUIRES_NEW)
    public void systemEvent(String action,String entityId,String details){
        audit.record(null,action,"SEAT_HOLD",entityId,details,null);
    }
}
