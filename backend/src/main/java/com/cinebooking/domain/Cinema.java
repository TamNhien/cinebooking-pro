package com.cinebooking.domain;
import jakarta.persistence.*; import java.util.UUID;
@Entity @Table(name="cinema")
public class Cinema {
 @Id private UUID id; @Column(nullable=false) private String name; @Column(nullable=false) private String address;
 @PrePersist void pre(){if(id==null)id=UUID.randomUUID();}
 public UUID getId(){return id;} public void setId(UUID id){this.id=id;} public String getName(){return name;} public void setName(String name){this.name=name;} public String getAddress(){return address;} public void setAddress(String address){this.address=address;}
}
