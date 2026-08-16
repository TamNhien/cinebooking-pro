package com.cinebooking.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.*;
import java.util.UUID;

@Entity
@Table(name="pricing_rule")
public class PricingRule {
    @Id private UUID id;
    @Column(nullable=false) private String name;
    @Column(name="cinema_id") private UUID cinemaId;
    @Column(name="auditorium_id") private UUID auditoriumId;
    @Column(name="movie_id") private UUID movieId;
    @Column(name="seat_type") private String seatType;
    @Column(name="days_of_week") private String daysOfWeek;
    @Column(name="start_time") private LocalTime startTime;
    @Column(name="end_time") private LocalTime endTime;
    @Column(name="valid_from") private LocalDate validFrom;
    @Column(name="valid_to") private LocalDate validTo;
    @Column(name="adjustment_type",nullable=false) private String adjustmentType;
    @Column(name="adjustment_value",nullable=false) private BigDecimal adjustmentValue;
    @Column(nullable=false) private Integer priority;
    @Column(nullable=false) private Boolean active;
    @Column(name="created_at",nullable=false) private Instant createdAt;
    @Column(name="updated_at",nullable=false) private Instant updatedAt;

    @PrePersist void pre(){
        if(id==null)id=UUID.randomUUID();
        if(priority==null)priority=0;
        if(active==null)active=true;
        Instant now=Instant.now();
        if(createdAt==null)createdAt=now;
        updatedAt=now;
    }
    @PreUpdate void upd(){updatedAt=Instant.now();}

    public UUID getId(){return id;} public void setId(UUID v){id=v;}
    public String getName(){return name;} public void setName(String v){name=v;}
    public UUID getCinemaId(){return cinemaId;} public void setCinemaId(UUID v){cinemaId=v;}
    public UUID getAuditoriumId(){return auditoriumId;} public void setAuditoriumId(UUID v){auditoriumId=v;}
    public UUID getMovieId(){return movieId;} public void setMovieId(UUID v){movieId=v;}
    public String getSeatType(){return seatType;} public void setSeatType(String v){seatType=v;}
    public String getDaysOfWeek(){return daysOfWeek;} public void setDaysOfWeek(String v){daysOfWeek=v;}
    public LocalTime getStartTime(){return startTime;} public void setStartTime(LocalTime v){startTime=v;}
    public LocalTime getEndTime(){return endTime;} public void setEndTime(LocalTime v){endTime=v;}
    public LocalDate getValidFrom(){return validFrom;} public void setValidFrom(LocalDate v){validFrom=v;}
    public LocalDate getValidTo(){return validTo;} public void setValidTo(LocalDate v){validTo=v;}
    public String getAdjustmentType(){return adjustmentType;} public void setAdjustmentType(String v){adjustmentType=v;}
    public BigDecimal getAdjustmentValue(){return adjustmentValue;} public void setAdjustmentValue(BigDecimal v){adjustmentValue=v;}
    public Integer getPriority(){return priority;} public void setPriority(Integer v){priority=v;}
    public Boolean getActive(){return active;} public void setActive(Boolean v){active=v;}
    public Instant getCreatedAt(){return createdAt;} public void setCreatedAt(Instant v){createdAt=v;}
    public Instant getUpdatedAt(){return updatedAt;} public void setUpdatedAt(Instant v){updatedAt=v;}
}
