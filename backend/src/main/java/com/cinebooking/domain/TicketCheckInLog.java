package com.cinebooking.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name="ticket_checkin_log")
public class TicketCheckInLog {
    @Id private UUID id;
    @Column(name="booking_id", nullable=false, unique=true) private UUID bookingId;
    @Column(name="shift_id") private UUID shiftId;
    @Column(name="attendance_id") private UUID attendanceId;
    @Column(name="staff_user_id", nullable=false) private UUID staffUserId;
    @Column(name="cinema_id", nullable=false) private UUID cinemaId;
    @Column(name="checked_in_at", nullable=false) private Instant checkedInAt;
    @Column(nullable=false, length=20) private String source;
    @Column(name="ip_address", length=64) private String ipAddress;

    @PrePersist void prePersist(){
        if(id==null) id=UUID.randomUUID();
        if(checkedInAt==null) checkedInAt=Instant.now();
        if(source==null||source.isBlank()) source="QR";
    }
    public UUID getId(){return id;} public void setId(UUID v){id=v;}
    public UUID getBookingId(){return bookingId;} public void setBookingId(UUID v){bookingId=v;}
    public UUID getShiftId(){return shiftId;} public void setShiftId(UUID v){shiftId=v;}
    public UUID getAttendanceId(){return attendanceId;} public void setAttendanceId(UUID v){attendanceId=v;}
    public UUID getStaffUserId(){return staffUserId;} public void setStaffUserId(UUID v){staffUserId=v;}
    public UUID getCinemaId(){return cinemaId;} public void setCinemaId(UUID v){cinemaId=v;}
    public Instant getCheckedInAt(){return checkedInAt;} public void setCheckedInAt(Instant v){checkedInAt=v;}
    public String getSource(){return source;} public void setSource(String v){source=v;}
    public String getIpAddress(){return ipAddress;} public void setIpAddress(String v){ipAddress=v;}
}
