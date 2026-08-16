package com.cinebooking.user;

import com.cinebooking.domain.StaffProfile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface StaffProfileRepository extends JpaRepository<StaffProfile, UUID> {
    Optional<StaffProfile> findByEmployeeCodeIgnoreCase(String employeeCode);
    List<StaffProfile> findAllByDeletedAtIsNullOrderByEmployeeCodeAsc();
}
