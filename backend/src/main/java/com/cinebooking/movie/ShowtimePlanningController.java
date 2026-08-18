package com.cinebooking.movie;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import static com.cinebooking.movie.AdminCatalogDtos.*;

@RestController
@RequestMapping("/api/admin/showtime-planner")
public class ShowtimePlanningController {
    private final ShowtimePlanningService planning;
    public ShowtimePlanningController(ShowtimePlanningService planning){this.planning=planning;}

    @PostMapping("/preview")
    public ShowtimePlanPreview preview(@Valid @RequestBody ShowtimePlanRequest request){return planning.preview(request);}

    @PostMapping("/commit")
    @ResponseStatus(HttpStatus.CREATED)
    public ShowtimePlanCommitResponse commit(@Valid @RequestBody ShowtimePlanRequest request){return planning.commit(request);}
}
