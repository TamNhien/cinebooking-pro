package com.cinebooking.movie;

import com.cinebooking.booking.BookingRepository;
import com.cinebooking.booking.BookingSeatRepository;
import com.cinebooking.common.ApiException;
import com.cinebooking.domain.*;
import com.cinebooking.seat.SeatRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import static com.cinebooking.movie.AdminCatalogDtos.*;
import static com.cinebooking.movie.MovieDtos.*;

@Service
public class AdminCatalogService {
    private final MovieRepository movies; private final CinemaRepository cinemas; private final AuditoriumRepository auditoriums;
    private final SeatRepository seats; private final ShowtimeRepository showtimes; private final BookingRepository bookings;
    private final BookingSeatRepository bookingSeats; private final MovieService movieService;
    public AdminCatalogService(MovieRepository movies,CinemaRepository cinemas,AuditoriumRepository auditoriums,SeatRepository seats,
                               ShowtimeRepository showtimes,BookingRepository bookings,BookingSeatRepository bookingSeats,MovieService movieService){
        this.movies=movies;this.cinemas=cinemas;this.auditoriums=auditoriums;this.seats=seats;this.showtimes=showtimes;this.bookings=bookings;this.bookingSeats=bookingSeats;this.movieService=movieService;
    }

    public List<MovieResponse> movies(){return movies.findAllByOrderByCreatedAtDesc().stream().map(movieService::movieDto).toList();}
    @Transactional public MovieResponse updateMovie(UUID id,AdminMovieRequest r){Movie m=movie(id);apply(m,r);return movieService.movieDto(movies.save(m));}
    @Transactional public void deleteMovie(UUID id){Movie m=movie(id);m.setActive(false);movies.save(m);}
    @Transactional public MovieResponse createMovie(AdminMovieRequest r){Movie m=new Movie();apply(m,r);return movieService.movieDto(movies.save(m));}
    private void apply(Movie m,AdminMovieRequest r){m.setTitle(r.title().trim());m.setDescription(r.description());m.setDurationMinutes(r.durationMinutes());m.setPosterUrl(blank(r.posterUrl()));m.setRating(blank(r.rating()));m.setGenre(blank(r.genre()));m.setLanguage(blank(r.language()));m.setTrailerUrl(blank(r.trailerUrl()));m.setReleaseDate(r.releaseDate());m.setActive(r.active());}

    public List<CinemaResponse> cinemas(){return cinemas.findAllByOrderByNameAsc().stream().map(c->new CinemaResponse(c.getId(),c.getName(),c.getAddress())).toList();}
    @Transactional public CinemaResponse createCinema(CinemaRequest r){Cinema c=new Cinema();c.setName(r.name().trim());c.setAddress(r.address().trim());return cinema(cinemas.save(c));}
    @Transactional public CinemaResponse updateCinema(UUID id,CinemaRequest r){Cinema c=cinemaEntity(id);c.setName(r.name().trim());c.setAddress(r.address().trim());return cinema(cinemas.save(c));}
    @Transactional public void deleteCinema(UUID id){Cinema c=cinemaEntity(id);try{cinemas.delete(c);cinemas.flush();}catch(DataIntegrityViolationException e){throw new ApiException(HttpStatus.CONFLICT,"Không thể xoá rạp đang có suất chiếu/booking. Hãy xoá dữ liệu liên quan trước.");}}

    public List<AuditoriumResponse> auditoriums(){return auditoriums.findAllByOrderByNameAsc().stream().map(this::auditorium).toList();}
    @Transactional public AuditoriumResponse createAuditorium(AuditoriumRequest r){
        requireCinema(r.cinemaId());
        Auditorium a=new Auditorium();
        a.setCinemaId(r.cinemaId());
        a.setName(r.name().trim());
        Auditorium saved=auditoriums.save(a);
        createDefaultSeatLayout(saved.getId());
        return auditorium(saved);
    }
    @Transactional public AuditoriumResponse updateAuditorium(UUID id,AuditoriumRequest r){requireCinema(r.cinemaId());Auditorium a=auditoriumEntity(id);a.setCinemaId(r.cinemaId());a.setName(r.name().trim());return auditorium(auditoriums.save(a));}
    @Transactional public void deleteAuditorium(UUID id){Auditorium a=auditoriumEntity(id);if(showtimes.existsByAuditoriumId(id))throw new ApiException(HttpStatus.CONFLICT,"Phòng đang có suất chiếu, không thể xoá");auditoriums.delete(a);}
    @Transactional public int generateDefaultSeats(UUID auditoriumId){
        requireAuditorium(auditoriumId);
        if(seats.existsByAuditoriumId(auditoriumId)) throw new ApiException(HttpStatus.CONFLICT,"Phòng đã có ghế. Hãy quản lý ghế hiện tại thay vì tạo trùng sơ đồ.");
        return createDefaultSeatLayout(auditoriumId);
    }
    private int createDefaultSeatLayout(UUID auditoriumId){
        List<Seat> layout=new ArrayList<>();
        for(char row='A';row<='H';row++){
            for(int number=1;number<=10;number++){
                Seat seat=new Seat();
                seat.setAuditoriumId(auditoriumId);
                seat.setRowLabel(String.valueOf(row));
                seat.setSeatNumber(number);
                if(row=='H'){
                    seat.setSeatType(SeatType.COUPLE);
                    seat.setPriceModifier(new java.math.BigDecimal("50000"));
                } else if(row>='E' && row<='G'){
                    seat.setSeatType(SeatType.VIP);
                    seat.setPriceModifier(new java.math.BigDecimal("20000"));
                } else {
                    seat.setSeatType(SeatType.STANDARD);
                    seat.setPriceModifier(java.math.BigDecimal.ZERO);
                }
                layout.add(seat);
            }
        }
        seats.saveAll(layout);
        return layout.size();
    }

    public List<SeatAdminResponse> seats(UUID auditoriumId){List<Seat> list=auditoriumId==null?seats.findAllByOrderByRowLabelAscSeatNumberAsc():seats.findByAuditoriumIdOrderByRowLabelAscSeatNumberAsc(auditoriumId);return list.stream().map(this::seat).toList();}
    @Transactional public List<SeatAdminResponse> replaceSeatLayout(UUID auditoriumId,SeatLayoutRequest req){
        requireAuditorium(auditoriumId); List<Seat> current=seats.findByAuditoriumIdOrderByRowLabelAscSeatNumberAsc(auditoriumId);
        if(current.stream().anyMatch(x->bookingSeats.existsBySeatId(x.getId()))) throw new ApiException(HttpStatus.CONFLICT,"Phòng đã có ghế xuất hiện trong booking, không thể thay toàn bộ sơ đồ. Hãy sửa từng ghế hoặc tạo phòng mới.");
        Set<String> unique=new HashSet<>(); List<Seat> created=new ArrayList<>();
        for(SeatLayoutCell c:req.seats()){String row=c.rowLabel().trim().toUpperCase(Locale.ROOT);String key=row+"#"+c.seatNumber();if(!unique.add(key))throw new ApiException(HttpStatus.BAD_REQUEST,"Sơ đồ có ghế trùng "+key);Seat s=new Seat();s.setAuditoriumId(auditoriumId);s.setRowLabel(row);s.setSeatNumber(c.seatNumber());try{s.setSeatType(SeatType.valueOf(c.seatType().trim().toUpperCase(Locale.ROOT)));}catch(Exception e){throw new ApiException(HttpStatus.BAD_REQUEST,"Loại ghế không hợp lệ: "+c.seatType());}s.setPriceModifier(c.priceModifier());created.add(s);}
        seats.deleteByAuditoriumId(auditoriumId);seats.flush();return seats.saveAll(created).stream().map(this::seat).toList();
    }
    @Transactional public SeatAdminResponse createSeat(SeatAdminRequest r){requireAuditorium(r.auditoriumId());Seat s=new Seat();apply(s,r);return seat(seats.save(s));}
    @Transactional public SeatAdminResponse updateSeat(UUID id,SeatAdminRequest r){requireAuditorium(r.auditoriumId());Seat s=seatEntity(id);apply(s,r);return seat(seats.save(s));}
    @Transactional public void deleteSeat(UUID id){Seat s=seatEntity(id);if(bookingSeats.existsBySeatId(id))throw new ApiException(HttpStatus.CONFLICT,"Ghế đã xuất hiện trong booking, không thể xoá");seats.delete(s);}
    private void apply(Seat s,SeatAdminRequest r){s.setAuditoriumId(r.auditoriumId());s.setRowLabel(r.rowLabel().trim().toUpperCase(Locale.ROOT));s.setSeatNumber(r.seatNumber());try{s.setSeatType(SeatType.valueOf(r.seatType().trim().toUpperCase(Locale.ROOT)));}catch(Exception e){throw new ApiException(HttpStatus.BAD_REQUEST,"seatType không hợp lệ");}s.setPriceModifier(r.priceModifier());}

    public List<ShowtimeResponse> showtimes(){return showtimes.findAllByOrderByStartTimeDesc().stream().map(movieService::showtimeDto).toList();}
    @Transactional public ShowtimeResponse createShowtime(ShowtimeAdminRequest r){Showtime s=new Showtime();apply(s,r);return movieService.showtimeDto(showtimes.save(s));}
    @Transactional public ShowtimeResponse updateShowtime(UUID id,ShowtimeAdminRequest r){Showtime s=showtimeEntity(id);apply(s,r);return movieService.showtimeDto(showtimes.save(s));}
    @Transactional public void deleteShowtime(UUID id){Showtime s=showtimeEntity(id);if(bookings.existsByShowtimeId(id))throw new ApiException(HttpStatus.CONFLICT,"Suất chiếu đã có booking, không thể xoá");showtimes.delete(s);}
    private void apply(Showtime s,ShowtimeAdminRequest r){if(!movies.existsById(r.movieId()))throw new ApiException(HttpStatus.BAD_REQUEST,"movieId không tồn tại");requireAuditorium(r.auditoriumId());s.setMovieId(r.movieId());s.setAuditoriumId(r.auditoriumId());s.setStartTime(r.startTime());s.setBasePrice(r.basePrice());try{s.setStatus(ShowtimeStatus.valueOf(r.status().trim().toUpperCase(Locale.ROOT)));}catch(Exception e){throw new ApiException(HttpStatus.BAD_REQUEST,"status suất chiếu không hợp lệ");}}

    private Movie movie(UUID id){return movies.findById(id).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy phim"));}
    private Cinema cinemaEntity(UUID id){return cinemas.findById(id).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy rạp"));}
    private Auditorium auditoriumEntity(UUID id){return auditoriums.findById(id).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy phòng"));}
    private Seat seatEntity(UUID id){return seats.findById(id).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy ghế"));}
    private Showtime showtimeEntity(UUID id){return showtimes.findById(id).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy suất chiếu"));}
    private void requireCinema(UUID id){if(!cinemas.existsById(id))throw new ApiException(HttpStatus.BAD_REQUEST,"cinemaId không tồn tại");}
    private void requireAuditorium(UUID id){if(!auditoriums.existsById(id))throw new ApiException(HttpStatus.BAD_REQUEST,"auditoriumId không tồn tại");}
    private CinemaResponse cinema(Cinema c){return new CinemaResponse(c.getId(),c.getName(),c.getAddress());}
    private AuditoriumResponse auditorium(Auditorium a){return new AuditoriumResponse(a.getId(),a.getCinemaId(),cinemas.findById(a.getCinemaId()).map(Cinema::getName).orElse(""),a.getName());}
    private SeatAdminResponse seat(Seat s){return new SeatAdminResponse(s.getId(),s.getAuditoriumId(),auditoriums.findById(s.getAuditoriumId()).map(Auditorium::getName).orElse(""),s.getRowLabel(),s.getSeatNumber(),s.getSeatType().name(),s.getPriceModifier());}
    private String blank(String s){return s==null||s.isBlank()?null:s.trim();}
}
