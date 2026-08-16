package com.cinebooking.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "movie")
public class Movie {
    @Id private UUID id;
    @Column(nullable=false) private String title;
    @Column(columnDefinition="text") private String description;
    @Column(name="duration_minutes", nullable=false) private Integer durationMinutes;
    @Column(name="poster_url", columnDefinition="text") private String posterUrl;
    private String rating;
    @Column(length=200) private String genre;
    @Column(name="movie_language", length=80) private String language;
    @Column(name="trailer_url", columnDefinition="text") private String trailerUrl;
    @Column(name="release_date") private LocalDate releaseDate;
    @Column(nullable=false) private Boolean active;
    @Column(name="created_at", nullable=false) private Instant createdAt;
    @PrePersist void pre(){ if(id==null)id=UUID.randomUUID(); if(active==null)active=true; if(createdAt==null)createdAt=Instant.now(); }
    public UUID getId(){return id;} public void setId(UUID id){this.id=id;}
    public String getTitle(){return title;} public void setTitle(String title){this.title=title;}
    public String getDescription(){return description;} public void setDescription(String description){this.description=description;}
    public Integer getDurationMinutes(){return durationMinutes;} public void setDurationMinutes(Integer durationMinutes){this.durationMinutes=durationMinutes;}
    public String getPosterUrl(){return posterUrl;} public void setPosterUrl(String posterUrl){this.posterUrl=posterUrl;}
    public String getRating(){return rating;} public void setRating(String rating){this.rating=rating;}
    public String getGenre(){return genre;} public void setGenre(String genre){this.genre=genre;}
    public String getLanguage(){return language;} public void setLanguage(String language){this.language=language;}
    public String getTrailerUrl(){return trailerUrl;} public void setTrailerUrl(String trailerUrl){this.trailerUrl=trailerUrl;}
    public LocalDate getReleaseDate(){return releaseDate;} public void setReleaseDate(LocalDate releaseDate){this.releaseDate=releaseDate;}
    public Boolean getActive(){return active;} public void setActive(Boolean active){this.active=active;}
    public Instant getCreatedAt(){return createdAt;} public void setCreatedAt(Instant createdAt){this.createdAt=createdAt;}
}
