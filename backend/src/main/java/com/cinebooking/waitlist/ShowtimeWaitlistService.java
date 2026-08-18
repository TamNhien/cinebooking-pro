package com.cinebooking.waitlist;

import com.cinebooking.common.ApiException;
import com.cinebooking.domain.*;
import com.cinebooking.movie.*;
import com.cinebooking.notification.NotificationService;
import com.cinebooking.seat.SeatService;
import com.cinebooking.user.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;
import static com.cinebooking.waitlist.WaitlistDtos.*;

@Service
public class ShowtimeWaitlistService {
    private final ShowtimeWaitlistRepository repo;
    private final ShowtimeRepository showtimes;
    private final MovieRepository movies;
    private final CinemaRepository cinemas;
    private final AuditoriumRepository auditoriums;
    private final UserRepository users;
    private final SeatService seats;
    private final NotificationService notifications;

    public ShowtimeWaitlistService(ShowtimeWaitlistRepository repo,ShowtimeRepository showtimes,MovieRepository movies,
                                   CinemaRepository cinemas,AuditoriumRepository auditoriums,UserRepository users,
                                   SeatService seats,NotificationService notifications){
        this.repo=repo;this.showtimes=showtimes;this.movies=movies;this.cinemas=cinemas;this.auditoriums=auditoriums;
        this.users=users;this.seats=seats;this.notifications=notifications;
    }

    public WaitlistStatus status(UUID showtimeId,String email){
        Showtime st=showtime(showtimeId);int available=available(showtimeId);
        if(email==null||email.isBlank())return new WaitlistStatus(showtimeId,false,"NONE",available,null,null);
        UUID uid=user(email).getId();
        return repo.findByUserIdAndShowtimeId(uid,showtimeId)
                .map(w->new WaitlistStatus(showtimeId,"ACTIVE".equals(w.getStatus()),w.getStatus(),available,w.getCreatedAt(),w.getNotifiedAt()))
                .orElse(new WaitlistStatus(showtimeId,false,"NONE",available,null,null));
    }

    @Transactional
    public WaitlistStatus subscribe(UUID showtimeId,String email){
        Showtime st=showtime(showtimeId);
        if(!st.getStartTime().isAfter(Instant.now()))throw new ApiException(HttpStatus.CONFLICT,"Suất chiếu đã bắt đầu hoặc đã kết thúc");
        int available=available(showtimeId);
        if(available>0)throw new ApiException(HttpStatus.CONFLICT,"Suất chiếu hiện vẫn còn "+available+" ghế trống. Bạn có thể đặt ngay.");
        UUID uid=user(email).getId();Instant now=Instant.now();
        ShowtimeWaitlist w=repo.findByUserIdAndShowtimeId(uid,showtimeId).orElseGet(ShowtimeWaitlist::new);
        w.setUserId(uid);w.setShowtimeId(showtimeId);w.setStatus("ACTIVE");w.setCreatedAt(now);w.setNotifiedAt(null);w.setLastAvailableCount(0);repo.save(w);
        return new WaitlistStatus(showtimeId,true,"ACTIVE",0,w.getCreatedAt(),null);
    }

    @Transactional
    public WaitlistStatus unsubscribe(UUID showtimeId,String email){
        Showtime st=showtime(showtimeId);UUID uid=user(email).getId();
        repo.findByUserIdAndShowtimeId(uid,showtimeId).ifPresent(w->{w.setStatus("CANCELLED");repo.save(w);});
        return new WaitlistStatus(showtimeId,false,"CANCELLED",available(showtimeId),null,null);
    }

    public List<WaitlistItem> mine(String email){
        UUID uid=user(email).getId();List<WaitlistItem> out=new ArrayList<>();
        for(ShowtimeWaitlist w:repo.findByUserIdOrderByCreatedAtDesc(uid)){
            Showtime st=showtimes.findById(w.getShowtimeId()).orElse(null);if(st==null)continue;
            Movie m=movies.findById(st.getMovieId()).orElse(null);Auditorium a=auditoriums.findById(st.getAuditoriumId()).orElse(null);Cinema c=a==null?null:cinemas.findById(a.getCinemaId()).orElse(null);
            out.add(new WaitlistItem(w.getId(),w.getShowtimeId(),m==null?"Phim":m.getTitle(),st.getStartTime(),c==null?"Rạp":c.getName(),a==null?"Phòng":a.getName(),w.getStatus(),w.getLastAvailableCount(),w.getCreatedAt(),w.getNotifiedAt()));
        }
        return out;
    }

    @Transactional
    public void scanShowtime(UUID showtimeId){
        Showtime st=showtimes.findById(showtimeId).orElse(null);
        if(st==null||!st.getStartTime().isAfter(Instant.now())){repo.expireActive(showtimeId);return;}
        int available=available(showtimeId);if(available<=0)return;
        Movie m=movies.findById(st.getMovieId()).orElse(null);String title=m==null?"Suất chiếu":m.getTitle();
        for(ShowtimeWaitlist w:repo.findByShowtimeIdAndStatus(showtimeId,"ACTIVE")){
            if(repo.claimNotification(w.getId(),Instant.now(),available)!=1)continue;
            String dedupe="WAITLIST:"+w.getId()+":"+w.getCreatedAt().toEpochMilli();
            boolean delivered=notifications.createOnce(w.getUserId(),"WAITLIST_SEAT_AVAILABLE","Có ghế trống trở lại",title+" vừa có "+available+" ghế trống. Đặt sớm trước khi ghế được người khác giữ.","/booking/"+showtimeId,dedupe);
            if(!delivered)repo.reactivate(w.getId());
        }
    }

    public List<UUID> activeShowtimes(){return repo.findDistinctActiveShowtimeIds();}
    private int available(UUID showtimeId){return (int)seats.map(showtimeId,null).seats().stream().filter(s->"AVAILABLE".equals(s.status())).count();}
    private Showtime showtime(UUID id){return showtimes.findById(id).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy suất chiếu"));}
    private AppUser user(String email){return users.findByEmailIgnoreCase(email).orElseThrow(()->new ApiException(HttpStatus.UNAUTHORIZED,"Không tìm thấy tài khoản"));}
}
