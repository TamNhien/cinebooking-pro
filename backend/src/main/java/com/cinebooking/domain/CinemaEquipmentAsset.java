package com.cinebooking.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name="cinema_equipment_asset")
public class CinemaEquipmentAsset {
    @Id private UUID id;
    @Column(name="cinema_id",nullable=false) private UUID cinemaId;
    @Column(name="auditorium_id") private UUID auditoriumId;
    @Column(name="asset_code",nullable=false,unique=true,length=40) private String assetCode;
    @Column(nullable=false,length=160) private String name;
    @Column(nullable=false,length=30) private String category;
    @Column(nullable=false,length=24) private String status;
    @Column(length=120) private String vendor;
    @Column(name="serial_number",length=120) private String serialNumber;
    @Column(name="installed_on") private LocalDate installedOn;
    @Column(name="last_service_at") private Instant lastServiceAt;
    @Column(name="next_service_due") private LocalDate nextServiceDue;
    @Column(length=1000) private String note;
    @Column(name="created_at",nullable=false) private Instant createdAt;
    @Column(name="updated_at",nullable=false) private Instant updatedAt;

    @PrePersist void prePersist(){if(id==null)id=UUID.randomUUID();if(status==null)status="OPERATIONAL";if(createdAt==null)createdAt=Instant.now();if(updatedAt==null)updatedAt=createdAt;}
    @PreUpdate void preUpdate(){updatedAt=Instant.now();}

    public UUID getId(){return id;} public void setId(UUID v){id=v;}
    public UUID getCinemaId(){return cinemaId;} public void setCinemaId(UUID v){cinemaId=v;}
    public UUID getAuditoriumId(){return auditoriumId;} public void setAuditoriumId(UUID v){auditoriumId=v;}
    public String getAssetCode(){return assetCode;} public void setAssetCode(String v){assetCode=v;}
    public String getName(){return name;} public void setName(String v){name=v;}
    public String getCategory(){return category;} public void setCategory(String v){category=v;}
    public String getStatus(){return status;} public void setStatus(String v){status=v;}
    public String getVendor(){return vendor;} public void setVendor(String v){vendor=v;}
    public String getSerialNumber(){return serialNumber;} public void setSerialNumber(String v){serialNumber=v;}
    public LocalDate getInstalledOn(){return installedOn;} public void setInstalledOn(LocalDate v){installedOn=v;}
    public Instant getLastServiceAt(){return lastServiceAt;} public void setLastServiceAt(Instant v){lastServiceAt=v;}
    public LocalDate getNextServiceDue(){return nextServiceDue;} public void setNextServiceDue(LocalDate v){nextServiceDue=v;}
    public String getNote(){return note;} public void setNote(String v){note=v;}
    public Instant getCreatedAt(){return createdAt;} public void setCreatedAt(Instant v){createdAt=v;}
    public Instant getUpdatedAt(){return updatedAt;} public void setUpdatedAt(Instant v){updatedAt=v;}
}
