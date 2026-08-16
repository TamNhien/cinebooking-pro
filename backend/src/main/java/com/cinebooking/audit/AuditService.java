package com.cinebooking.audit;

import com.cinebooking.domain.AuditLog;
import com.cinebooking.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;

@Service
public class AuditService {
    private final AuditLogRepository logs; private final UserRepository users;
    public AuditService(AuditLogRepository logs,UserRepository users){this.logs=logs;this.users=users;}
    @Transactional public void record(String email,String action,String entityType,String entityId,String details,String ip){
        AuditLog l=new AuditLog(); l.setActorEmail(email); l.setAction(action); l.setEntityType(entityType); l.setEntityId(entityId); l.setDetails(details); l.setIpAddress(ip);
        if(email!=null) users.findByEmailIgnoreCase(email).ifPresent(u->l.setActorUserId(u.getId()));
        logs.save(l);
    }
    public List<AuditItem> recent(){return logs.findTop200ByOrderByCreatedAtDesc().stream().map(x->new AuditItem(x.getId(),x.getActorEmail(),x.getAction(),x.getEntityType(),x.getEntityId(),x.getDetails(),x.getIpAddress(),x.getCreatedAt().toString())).toList();}
    public record AuditItem(UUID id,String actorEmail,String action,String entityType,String entityId,String details,String ipAddress,String createdAt){}
}
