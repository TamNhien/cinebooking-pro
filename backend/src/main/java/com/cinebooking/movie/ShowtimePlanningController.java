package com.cinebooking.movie;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

import static com.cinebooking.movie.AdminCatalogDtos.*;

@RestController
@RequestMapping("/api/admin/showtime-planner")
public class ShowtimePlanningController {
    private final ShowtimePlanningService planning;
    private final SmartShowtimePlanningService smart;
    public ShowtimePlanningController(ShowtimePlanningService planning,SmartShowtimePlanningService smart){this.planning=planning;this.smart=smart;}

    @PostMapping("/preview")
    public ShowtimePlanPreview preview(@Valid @RequestBody ShowtimePlanRequest request){return planning.preview(request);}

    @PostMapping("/commit")
    @ResponseStatus(HttpStatus.CREATED)
    public ShowtimePlanCommitResponse commit(@Valid @RequestBody ShowtimePlanRequest request){return planning.commit(request);}

    @PostMapping("/smart/preview")
    public SmartShowtimePlanPreview smartPreview(@Valid @RequestBody SmartShowtimePlanRequest request){return smart.preview(request);}

    @PostMapping("/smart/commit")
    @ResponseStatus(HttpStatus.CREATED)
    public SmartShowtimeCommitResponse smartCommit(@Valid @RequestBody SmartShowtimePlanRequest request,Authentication auth){return smart.commit(request,auth==null?null:auth.getName());}

    @GetMapping("/smart/runs")
    public List<ShowtimePlanningRunResponse> recentRuns(@RequestParam(required=false) UUID cinemaId){return smart.recentRuns(cinemaId);}
}
