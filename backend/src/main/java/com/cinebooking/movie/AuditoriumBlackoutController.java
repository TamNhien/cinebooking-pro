package com.cinebooking.movie;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

import static com.cinebooking.movie.AdminCatalogDtos.*;

@RestController
@RequestMapping("/api/admin/auditorium-blackouts")
public class AuditoriumBlackoutController {
    private final AuditoriumBlackoutService service;
    public AuditoriumBlackoutController(AuditoriumBlackoutService service) { this.service = service; }

    @GetMapping
    public List<AuditoriumBlackoutResponse> list(@RequestParam(required = false) UUID auditoriumId) {
        return service.list(auditoriumId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public AuditoriumBlackoutResponse create(@Valid @RequestBody AuditoriumBlackoutRequest request) {
        return service.create(request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) { service.delete(id); }
}
