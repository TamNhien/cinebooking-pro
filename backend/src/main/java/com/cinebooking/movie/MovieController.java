package com.cinebooking.movie;

import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;

import static com.cinebooking.movie.MovieDtos.*;

@RestController
@RequestMapping("/api")
public class MovieController {
    private final MovieService service;
    public MovieController(MovieService service){this.service=service;}
    @GetMapping("/movies") public List<MovieResponse> movies(){return service.listMovies();}
    @GetMapping("/movies/{id}") public MovieResponse movie(@PathVariable UUID id){return service.getMovie(id);}
    @GetMapping("/cinemas") public List<CinemaPublicResponse> cinemas(){return service.listCinemas();}
    @GetMapping("/showtimes") public List<ShowtimeResponse> showtimes(@RequestParam(required=false) UUID movieId){return service.listShowtimes(movieId);}
    @GetMapping("/showtimes/{id}") public ShowtimeResponse showtime(@PathVariable UUID id){return service.getShowtime(id);}
}
