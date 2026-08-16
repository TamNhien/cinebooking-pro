package com.cinebooking.movie;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

import static com.cinebooking.movie.AdminCatalogDtos.*;
import static com.cinebooking.movie.MovieDtos.*;

@RestController
@RequestMapping("/api/admin")
public class AdminMovieController {
    private final AdminCatalogService service;
    public AdminMovieController(AdminCatalogService service){this.service=service;}

    @GetMapping("/movies") public List<MovieResponse> movies(){return service.movies();}
    @PostMapping("/movies") @ResponseStatus(HttpStatus.CREATED) public MovieResponse createMovie(@Valid @RequestBody AdminMovieRequest req){return service.createMovie(req);}
    @PutMapping("/movies/{id}") public MovieResponse updateMovie(@PathVariable UUID id,@Valid @RequestBody AdminMovieRequest req){return service.updateMovie(id,req);}
    @DeleteMapping("/movies/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) public void deleteMovie(@PathVariable UUID id){service.deleteMovie(id);}

    @GetMapping("/cinemas") public List<CinemaResponse> cinemas(){return service.cinemas();}
    @PostMapping("/cinemas") @ResponseStatus(HttpStatus.CREATED) public CinemaResponse createCinema(@Valid @RequestBody CinemaRequest req){return service.createCinema(req);}
    @PutMapping("/cinemas/{id}") public CinemaResponse updateCinema(@PathVariable UUID id,@Valid @RequestBody CinemaRequest req){return service.updateCinema(id,req);}
    @DeleteMapping("/cinemas/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) public void deleteCinema(@PathVariable UUID id){service.deleteCinema(id);}

    @GetMapping("/auditoriums") public List<AuditoriumResponse> auditoriums(){return service.auditoriums();}
    @PostMapping("/auditoriums") @ResponseStatus(HttpStatus.CREATED) public AuditoriumResponse createAuditorium(@Valid @RequestBody AuditoriumRequest req){return service.createAuditorium(req);}
    @PutMapping("/auditoriums/{id}") public AuditoriumResponse updateAuditorium(@PathVariable UUID id,@Valid @RequestBody AuditoriumRequest req){return service.updateAuditorium(id,req);}
    @DeleteMapping("/auditoriums/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) public void deleteAuditorium(@PathVariable UUID id){service.deleteAuditorium(id);}
    @PostMapping("/auditoriums/{id}/generate-seats") public java.util.Map<String,Integer> generateSeats(@PathVariable UUID id){return java.util.Map.of("created",service.generateDefaultSeats(id));}
    @PutMapping("/auditoriums/{id}/seat-layout") public List<SeatAdminResponse> saveLayout(@PathVariable UUID id,@Valid @RequestBody SeatLayoutRequest req){return service.replaceSeatLayout(id,req);}

    @GetMapping("/seats") public List<SeatAdminResponse> seats(@RequestParam(required=false) UUID auditoriumId){return service.seats(auditoriumId);}
    @PostMapping("/seats") @ResponseStatus(HttpStatus.CREATED) public SeatAdminResponse createSeat(@Valid @RequestBody SeatAdminRequest req){return service.createSeat(req);}
    @PutMapping("/seats/{id}") public SeatAdminResponse updateSeat(@PathVariable UUID id,@Valid @RequestBody SeatAdminRequest req){return service.updateSeat(id,req);}
    @DeleteMapping("/seats/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) public void deleteSeat(@PathVariable UUID id){service.deleteSeat(id);}

    @GetMapping("/showtimes") public List<ShowtimeResponse> showtimes(){return service.showtimes();}
    @PostMapping("/showtimes") @ResponseStatus(HttpStatus.CREATED) public ShowtimeResponse createShowtime(@Valid @RequestBody ShowtimeAdminRequest req){return service.createShowtime(req);}
    @PutMapping("/showtimes/{id}") public ShowtimeResponse updateShowtime(@PathVariable UUID id,@Valid @RequestBody ShowtimeAdminRequest req){return service.updateShowtime(id,req);}
    @DeleteMapping("/showtimes/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) public void deleteShowtime(@PathVariable UUID id){service.deleteShowtime(id);}
}
