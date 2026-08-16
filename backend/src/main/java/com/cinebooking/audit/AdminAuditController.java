package com.cinebooking.audit;
import org.springframework.web.bind.annotation.*;
import java.util.*;
@RestController @RequestMapping("/api/admin/audit")
public class AdminAuditController {
    private final AuditService audit; public AdminAuditController(AuditService audit){this.audit=audit;}
    @GetMapping public List<AuditService.AuditItem> recent(){return audit.recent();}
}
