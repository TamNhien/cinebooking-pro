package com.cinebooking.movie;
import com.cinebooking.domain.Cinema;import org.springframework.data.jpa.repository.JpaRepository;import java.util.*;
public interface CinemaRepository extends JpaRepository<Cinema, UUID> { List<Cinema> findAllByOrderByNameAsc(); }
