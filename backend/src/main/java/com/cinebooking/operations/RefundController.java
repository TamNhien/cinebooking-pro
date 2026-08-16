package com.cinebooking.operations;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.*;
@RestController
public class RefundController {
    private final RefundService service; public RefundController(RefundService service){this.service=service;}
    @PostMapping("/api/bookings/{id}/refund-request") public RefundService.RefundView request(@PathVariable UUID id,@Valid @RequestBody RefundRequest body,Authentication auth,HttpServletRequest req){return service.request(id,auth.getName(),body.reason(),ip(req));}
    @GetMapping("/api/admin/refunds") public List<RefundService.RefundView> queue(){return service.queue();}
    @PostMapping("/api/admin/refunds/{id}/approve") public RefundService.RefundView approve(@PathVariable UUID id,Authentication auth,HttpServletRequest req){return service.approve(id,auth.getName(),ip(req));}
    @PostMapping("/api/admin/refunds/{id}/reject") public RefundService.RefundView reject(@PathVariable UUID id,Authentication auth,HttpServletRequest req){return service.reject(id,auth.getName(),ip(req));}
    private String ip(HttpServletRequest r){String x=r.getHeader("X-Forwarded-For");return x==null||x.isBlank()?r.getRemoteAddr():x.split(",")[0].trim();}
    public record RefundRequest(@Size(max=500) String reason){}
}
