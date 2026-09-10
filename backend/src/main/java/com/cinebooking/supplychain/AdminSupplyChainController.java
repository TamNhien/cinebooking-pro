package com.cinebooking.supplychain;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

import static com.cinebooking.supplychain.SupplyChainDtos.*;

@RestController
@RequestMapping("/api/admin/supply-chain")
public class AdminSupplyChainController {
    private final SupplyChainService service;
    public AdminSupplyChainController(SupplyChainService service){this.service=service;}

    @GetMapping("/summary") public SupplyChainSummary summary(){return service.summary();}
    @GetMapping("/artifacts") public List<SoftwareArtifactEvidence> artifacts(@RequestParam(defaultValue="50") int limit){return service.artifacts(limit);}
    @GetMapping("/scans") public List<SoftwareSupplyChainScan> scans(@RequestParam(defaultValue="50") int limit){return service.scans(limit);}
    @PostMapping("/artifacts") public SoftwareArtifactEvidence recordArtifact(@RequestBody RecordArtifactEvidenceRequest body, Authentication auth, HttpServletRequest request){return service.recordArtifact(body,auth.getName(),ip(request));}
    @PostMapping("/scans") public SoftwareSupplyChainScan recordScan(@RequestBody RecordSupplyChainScanRequest body, Authentication auth, HttpServletRequest request){return service.recordScan(body,auth.getName(),ip(request));}

    private String ip(HttpServletRequest r){String x=r.getHeader("X-Forwarded-For");return x==null||x.isBlank()?r.getRemoteAddr():x.split(",")[0].trim();}
}
