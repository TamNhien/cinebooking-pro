package com.cinebooking.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name="staff_attendance")
public class StaffAttendance {
    @Id private UUID id;
    @Column(name="shift_id", nullable=false, unique=true) private UUID shiftId;
    @Column(name="staff_user_id", nullable=false) private UUID staffUserId;
    @Column(name="cinema_id", nullable=false) private UUID cinemaId;
    @Column(name="check_in_at", nullable=false) private Instant checkInAt;
    @Column(name="check_out_at") private Instant checkOutAt;
    @Column(nullable=false, length=20) private String status;
    @Column(name="check_in_ip", length=64) private String checkInIp;
    @Column(name="check_out_ip", length=64) private String checkOutIp;
    @Column(name="late_minutes",nullable=false) private int lateMinutes;
    @Column(name="early_leave_minutes",nullable=false) private int earlyLeaveMinutes;
    @Column(name="worked_minutes") private Integer workedMinutes;
    @Column(name="punctuality_status",nullable=false,length=20) private String punctualityStatus;
    @Column(name="created_at", nullable=false) private Instant createdAt;
    @Column(name="updated_at", nullable=false) private Instant updatedAt;
    @PrePersist void prePersist(){if(id==null)id=UUID.randomUUID();if(status==null)status="WORKING";if(punctualityStatus==null)punctualityStatus="ON_TIME";if(createdAt==null)createdAt=Instant.now();if(updatedAt==null)updatedAt=Instant.now();}
    @PreUpdate void preUpdate(){updatedAt=Instant.now();}
    public UUID getId(){return id;} public void setId(UUID v){id=v;}
    public UUID getShiftId(){return shiftId;} public void setShiftId(UUID v){shiftId=v;}
    public UUID getStaffUserId(){return staffUserId;} public void setStaffUserId(UUID v){staffUserId=v;}
    public UUID getCinemaId(){return cinemaId;} public void setCinemaId(UUID v){cinemaId=v;}
    public Instant getCheckInAt(){return checkInAt;} public void setCheckInAt(Instant v){checkInAt=v;}
    public Instant getCheckOutAt(){return checkOutAt;} public void setCheckOutAt(Instant v){checkOutAt=v;}
    public String getStatus(){return status;} public void setStatus(String v){status=v;}
    public String getCheckInIp(){return checkInIp;} public void setCheckInIp(String v){checkInIp=v;}
    public String getCheckOutIp(){return checkOutIp;} public void setCheckOutIp(String v){checkOutIp=v;}
    public int getLateMinutes(){return lateMinutes;} public void setLateMinutes(int v){lateMinutes=v;}
    public int getEarlyLeaveMinutes(){return earlyLeaveMinutes;} public void setEarlyLeaveMinutes(int v){earlyLeaveMinutes=v;}
    public Integer getWorkedMinutes(){return workedMinutes;} public void setWorkedMinutes(Integer v){workedMinutes=v;}
    public String getPunctualityStatus(){return punctualityStatus;} public void setPunctualityStatus(String v){punctualityStatus=v;}
    public Instant getCreatedAt(){return createdAt;} public void setCreatedAt(Instant v){createdAt=v;}
    public Instant getUpdatedAt(){return updatedAt;} public void setUpdatedAt(Instant v){updatedAt=v;}
}
