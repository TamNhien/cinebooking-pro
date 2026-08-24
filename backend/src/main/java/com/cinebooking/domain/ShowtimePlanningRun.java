package com.cinebooking.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

@Entity
@Table(name="showtime_planning_run")
public class ShowtimePlanningRun {
    @Id private UUID id;
    @Column(name="cinema_id",nullable=false) private UUID cinemaId;
    @Column(name="movie_id",nullable=false) private UUID movieId;
    @Column(name="from_date",nullable=false) private LocalDate fromDate;
    @Column(name="to_date",nullable=false) private LocalDate toDate;
    @Column(name="target_per_day",nullable=false) private Integer targetPerDay;
    @Column(name="operating_start",nullable=false) private LocalTime operatingStart;
    @Column(name="operating_end",nullable=false) private LocalTime operatingEnd;
    @Column(name="interval_minutes",nullable=false) private Integer intervalMinutes;
    @Column(name="base_price",nullable=false) private BigDecimal basePrice;
    @Column(name="requested_slots",nullable=false) private Integer requestedSlots;
    @Column(name="suggested_slots",nullable=false) private Integer suggestedSlots;
    @Column(name="conflict_count",nullable=false) private Integer conflictCount;
    @Column(name="historical_samples",nullable=false) private Integer historicalSamples;
    @Column(nullable=false,length=40) private String strategy;
    @Column(nullable=false,length=20) private String status;
    @Column(name="created_by") private String createdBy;
    @Column(name="plan_json",nullable=false,columnDefinition="text") private String planJson;
    @Column(name="created_at",nullable=false) private Instant createdAt;
    @Column(name="committed_at") private Instant committedAt;

    @PrePersist void pre(){
        if(id==null) id=UUID.randomUUID();
        if(requestedSlots==null) requestedSlots=0;
        if(suggestedSlots==null) suggestedSlots=0;
        if(conflictCount==null) conflictCount=0;
        if(historicalSamples==null) historicalSamples=0;
        if(strategy==null||strategy.isBlank()) strategy="DEMAND_BALANCED";
        if(status==null||status.isBlank()) status="COMMITTED";
        if(planJson==null) planJson="[]";
        if(createdAt==null) createdAt=Instant.now();
    }

    public UUID getId(){return id;} public void setId(UUID v){id=v;}
    public UUID getCinemaId(){return cinemaId;} public void setCinemaId(UUID v){cinemaId=v;}
    public UUID getMovieId(){return movieId;} public void setMovieId(UUID v){movieId=v;}
    public LocalDate getFromDate(){return fromDate;} public void setFromDate(LocalDate v){fromDate=v;}
    public LocalDate getToDate(){return toDate;} public void setToDate(LocalDate v){toDate=v;}
    public Integer getTargetPerDay(){return targetPerDay;} public void setTargetPerDay(Integer v){targetPerDay=v;}
    public LocalTime getOperatingStart(){return operatingStart;} public void setOperatingStart(LocalTime v){operatingStart=v;}
    public LocalTime getOperatingEnd(){return operatingEnd;} public void setOperatingEnd(LocalTime v){operatingEnd=v;}
    public Integer getIntervalMinutes(){return intervalMinutes;} public void setIntervalMinutes(Integer v){intervalMinutes=v;}
    public BigDecimal getBasePrice(){return basePrice;} public void setBasePrice(BigDecimal v){basePrice=v;}
    public Integer getRequestedSlots(){return requestedSlots;} public void setRequestedSlots(Integer v){requestedSlots=v;}
    public Integer getSuggestedSlots(){return suggestedSlots;} public void setSuggestedSlots(Integer v){suggestedSlots=v;}
    public Integer getConflictCount(){return conflictCount;} public void setConflictCount(Integer v){conflictCount=v;}
    public Integer getHistoricalSamples(){return historicalSamples;} public void setHistoricalSamples(Integer v){historicalSamples=v;}
    public String getStrategy(){return strategy;} public void setStrategy(String v){strategy=v;}
    public String getStatus(){return status;} public void setStatus(String v){status=v;}
    public String getCreatedBy(){return createdBy;} public void setCreatedBy(String v){createdBy=v;}
    public String getPlanJson(){return planJson;} public void setPlanJson(String v){planJson=v;}
    public Instant getCreatedAt(){return createdAt;} public void setCreatedAt(Instant v){createdAt=v;}
    public Instant getCommittedAt(){return committedAt;} public void setCommittedAt(Instant v){committedAt=v;}
}
