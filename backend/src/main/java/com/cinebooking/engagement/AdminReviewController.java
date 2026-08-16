package com.cinebooking.engagement;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import java.util.*;
import static com.cinebooking.engagement.EngagementDtos.*;

@RestController
@RequestMapping("/api/admin/reviews")
public class AdminReviewController {
    private final MovieEngagementService service;
    public AdminReviewController(MovieEngagementService service){this.service=service;}
    @GetMapping public List<ReviewResponse> list(){ return service.adminList(); }
    @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) public void delete(@PathVariable UUID id){ service.adminDelete(id); }
}
