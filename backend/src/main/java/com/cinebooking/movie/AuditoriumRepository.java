package com.cinebooking.movie;
import com.cinebooking.domain.Auditorium;import org.springframework.data.jpa.repository.JpaRepository;import java.util.*;
public interface AuditoriumRepository extends JpaRepository<Auditorium, UUID> { List<Auditorium> findAllByOrderByNameAsc(); }
