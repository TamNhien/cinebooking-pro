package com.cinebooking.operations;

import com.cinebooking.audit.AuditService;
import com.cinebooking.booking.BookingRepository;
import com.cinebooking.common.ApiException;
import com.cinebooking.domain.*;
import com.cinebooking.movie.*;
import com.cinebooking.user.UserRepository;
import com.cinebooking.staffops.StaffAttendanceRepository;
import com.cinebooking.staffops.StaffGatePolicyService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.*;
import java.util.*;

@Service
public class CheckInService {
    private final TicketTokenService tokens; private final BookingRepository bookings; private final ShowtimeRepository showtimes; private final MovieRepository movies; private final AuditoriumRepository auditoriums; private final CinemaRepository cinemas; private final UserRepository users; private final AuditService audit; private final StaffGatePolicyService gate; private final StaffAttendanceRepository attendance; private final TicketCheckInLogRepository logs; private final long earlyMinutes; private final long lateMinutes;
    public CheckInService(TicketTokenService tokens,BookingRepository bookings,ShowtimeRepository showtimes,MovieRepository movies,AuditoriumRepository auditoriums,CinemaRepository cinemas,UserRepository users,AuditService audit,StaffGatePolicyService gate,StaffAttendanceRepository attendance,TicketCheckInLogRepository logs,@Value("${app.checkin.early-minutes:2880}") long earlyMinutes,@Value("${app.checkin.late-minutes:240}") long lateMinutes){this.tokens=tokens;this.bookings=bookings;this.showtimes=showtimes;this.movies=movies;this.auditoriums=auditoriums;this.cinemas=cinemas;this.users=users;this.audit=audit;this.gate=gate;this.attendance=attendance;this.logs=logs;this.earlyMinutes=earlyMinutes;this.lateMinutes=lateMinutes;}

    public Preview preview(String payload,String staffEmail){
        TicketContext ctx=resolve(payload,false);
        String message="Vé hợp lệ và sẵn sàng check-in."; boolean allowed=true;
        try{gate.requireCanScan(staffEmail,ctx.cinema().getId());}
        catch(ApiException e){allowed=false;message=e.getMessage();}
        if(allowed&&ctx.booking().getStatus()!=BookingStatus.CONFIRMED){allowed=false;message="Vé không còn ở trạng thái hợp lệ: "+ctx.booking().getStatus();}
        if(allowed&&ctx.booking().getCheckedInAt()!=null){allowed=false;message="Vé đã check-in lúc "+ctx.booking().getCheckedInAt();}
        if(allowed&&!withinTicketWindow(ctx.showtime())){allowed=false;message="Vé chưa đến hoặc đã quá khung thời gian check-in";}
        return new Preview(ctx.booking().getId(),ctx.movie().getTitle(),ctx.cinema().getName(),ctx.auditorium().getName(),ctx.showtime().getStartTime(),allowed,message);
    }

    @Transactional public Result checkIn(String payload,String staffEmail,String ip){
        TicketContext ctx=resolve(payload,true); Booking b=ctx.booking(); Showtime st=ctx.showtime(); Movie m=ctx.movie(); Auditorium a=ctx.auditorium(); Cinema c=ctx.cinema();
        gate.requireCanScan(staffEmail,c.getId());
        if(b.getStatus()!=BookingStatus.CONFIRMED)throw new ApiException(HttpStatus.CONFLICT,"Vé không còn ở trạng thái hợp lệ: "+b.getStatus());
        if(b.getCheckedInAt()!=null)throw new ApiException(HttpStatus.CONFLICT,"Vé đã check-in lúc "+b.getCheckedInAt());
        if(!withinTicketWindow(st))throw new ApiException(HttpStatus.CONFLICT,"Vé chưa đến hoặc đã quá khung thời gian check-in");
        Instant now=Instant.now(); AppUser staff=users.findByEmailIgnoreCase(staffEmail).orElseThrow(); b.setCheckedInAt(now);b.setCheckedInBy(staff.getId());bookings.save(b);

        TicketCheckInLog log=new TicketCheckInLog();
        log.setBookingId(b.getId()); log.setStaffUserId(staff.getId()); log.setCinemaId(c.getId()); log.setCheckedInAt(now); log.setIpAddress(ip);
        log.setSource(payload!=null&&payload.trim().startsWith("http")?"URL":"QR");
        attendance.findFirstByStaffUserIdAndCheckOutAtIsNullOrderByCheckInAtDesc(staff.getId()).ifPresent(active->{log.setAttendanceId(active.getId());log.setShiftId(active.getShiftId());});
        logs.save(log);
        audit.record(staffEmail,"TICKET_CHECK_IN","BOOKING",b.getId().toString(),m.getTitle()+" · "+c.getName()+" · "+a.getName(),ip);
        return new Result(b.getId(),m.getTitle(),c.getName(),a.getName(),st.getStartTime(),now,"CHECKED_IN");
    }

    @Transactional public Result adminManualCheckIn(UUID bookingId,String adminEmail,String ip){
        Booking b=bookings.findByIdForUpdate(bookingId).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy booking"));
        Showtime st=showtimes.findById(b.getShowtimeId()).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy suất chiếu"));
        Movie m=movies.findById(st.getMovieId()).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy phim"));
        Auditorium a=auditoriums.findById(st.getAuditoriumId()).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy phòng chiếu"));
        Cinema c=cinemas.findById(a.getCinemaId()).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy rạp"));
        if(b.getStatus()!=BookingStatus.CONFIRMED)throw new ApiException(HttpStatus.CONFLICT,"Chỉ booking CONFIRMED mới được check-in");
        if(b.getCheckedInAt()!=null)throw new ApiException(HttpStatus.CONFLICT,"Vé đã check-in lúc "+b.getCheckedInAt());
        if(!withinTicketWindow(st))throw new ApiException(HttpStatus.CONFLICT,"Vé chưa đến hoặc đã quá khung thời gian check-in");
        AppUser admin=users.findByEmailIgnoreCase(adminEmail).orElseThrow(()->new ApiException(HttpStatus.UNAUTHORIZED,"Không tìm thấy tài khoản Admin"));
        if(admin.getRole()!=Role.ADMIN)throw new ApiException(HttpStatus.FORBIDDEN,"Chỉ Admin mới được check-in thủ công");
        Instant now=Instant.now(); b.setCheckedInAt(now);b.setCheckedInBy(admin.getId());bookings.save(b);
        TicketCheckInLog log=new TicketCheckInLog();log.setBookingId(b.getId());log.setStaffUserId(admin.getId());log.setCinemaId(c.getId());log.setCheckedInAt(now);log.setIpAddress(ip);log.setSource("MANUAL");logs.save(log);
        audit.record(adminEmail,"TICKET_CHECK_IN_MANUAL","BOOKING",b.getId().toString(),m.getTitle()+" · "+c.getName()+" · "+a.getName(),ip);
        return new Result(b.getId(),m.getTitle(),c.getName(),a.getName(),st.getStartTime(),now,"CHECKED_IN");
    }

    public List<HistoryItem> history(String staffEmail){
        AppUser staff=users.findByEmailIgnoreCase(staffEmail).orElseThrow(()->new ApiException(HttpStatus.UNAUTHORIZED,"Không tìm thấy tài khoản"));
        return logs.findTop50ByStaffUserIdOrderByCheckedInAtDesc(staff.getId()).stream().map(this::historyItem).toList();
    }

    private TicketContext resolve(String payload,boolean lock){
        var parsed=tokens.verify(payload);
        Booking b=(lock?bookings.findByIdForUpdate(parsed.bookingId()):bookings.findById(parsed.bookingId())).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy vé"));
        if(!b.getShowtimeId().equals(parsed.showtimeId()))throw new ApiException(HttpStatus.BAD_REQUEST,"QR không khớp suất chiếu");
        int currentVersion=b.getTicketVersion()==null?1:b.getTicketVersion();
        if(parsed.ticketVersion()!=currentVersion)throw new ApiException(HttpStatus.CONFLICT,"QR vé đã hết hiệu lực do vé được chuyển sang tài khoản khác. Hãy dùng QR mới trong Ví vé.");
        Showtime st=showtimes.findById(b.getShowtimeId()).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy suất chiếu"));
        Movie m=movies.findById(st.getMovieId()).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy phim"));
        Auditorium a=auditoriums.findById(st.getAuditoriumId()).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy phòng chiếu"));
        Cinema c=cinemas.findById(a.getCinemaId()).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy rạp"));
        return new TicketContext(b,st,m,a,c);
    }
    private boolean withinTicketWindow(Showtime st){Instant now=Instant.now();return !now.isBefore(st.getStartTime().minusSeconds(earlyMinutes*60))&&!now.isAfter(st.getStartTime().plusSeconds(lateMinutes*60));}
    private HistoryItem historyItem(TicketCheckInLog log){
        Booking b=bookings.findById(log.getBookingId()).orElse(null); if(b==null)return new HistoryItem(log.getBookingId(),"-","-","-",log.getCheckedInAt(),log.getSource());
        Showtime st=showtimes.findById(b.getShowtimeId()).orElse(null); if(st==null)return new HistoryItem(log.getBookingId(),"-","-","-",log.getCheckedInAt(),log.getSource());
        Movie m=movies.findById(st.getMovieId()).orElse(null); Auditorium a=auditoriums.findById(st.getAuditoriumId()).orElse(null); Cinema c=a==null?null:cinemas.findById(a.getCinemaId()).orElse(null);
        return new HistoryItem(log.getBookingId(),m==null?"-":m.getTitle(),c==null?"-":c.getName(),a==null?"-":a.getName(),log.getCheckedInAt(),log.getSource());
    }

    private record TicketContext(Booking booking,Showtime showtime,Movie movie,Auditorium auditorium,Cinema cinema){}
    public record Preview(UUID bookingId,String movieTitle,String cinemaName,String auditoriumName,Instant showtimeStart,boolean allowed,String message){}
    public record Result(UUID bookingId,String movieTitle,String cinemaName,String auditoriumName,Instant showtimeStart,Instant checkedInAt,String status){}
    public record HistoryItem(UUID bookingId,String movieTitle,String cinemaName,String auditoriumName,Instant checkedInAt,String source){}
}
