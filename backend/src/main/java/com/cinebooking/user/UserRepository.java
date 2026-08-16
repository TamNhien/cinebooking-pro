package com.cinebooking.user;
import com.cinebooking.domain.AppUser; import jakarta.persistence.LockModeType; import org.springframework.data.jpa.repository.*; import org.springframework.data.repository.query.Param; import java.util.*;
public interface UserRepository extends JpaRepository<AppUser, UUID> {
 Optional<AppUser> findByEmailIgnoreCase(String email); boolean existsByEmailIgnoreCase(String email); List<AppUser> findAllByOrderByCreatedAtDesc();
 @Lock(LockModeType.PESSIMISTIC_WRITE) @Query("select u from AppUser u where u.id=:id") Optional<AppUser> findByIdForUpdate(@Param("id") UUID id);
}
