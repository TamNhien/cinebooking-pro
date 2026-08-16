package com.cinebooking.domain;
import jakarta.persistence.*; import java.util.UUID;
@Entity @Table(name="auditorium")
public class Auditorium {
 @Id private UUID id; @Column(name="cinema_id",nullable=false) private UUID cinemaId; @Column(nullable=false) private String name;
 @PrePersist void pre(){if(id==null)id=UUID.randomUUID();}
 public UUID getId(){return id;} public void setId(UUID id){this.id=id;} public UUID getCinemaId(){return cinemaId;} public void setCinemaId(UUID cinemaId){this.cinemaId=cinemaId;} public String getName(){return name;} public void setName(String name){this.name=name;}
}
