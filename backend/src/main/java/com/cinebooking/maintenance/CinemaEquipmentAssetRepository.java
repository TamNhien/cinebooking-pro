package com.cinebooking.maintenance;

import com.cinebooking.domain.CinemaEquipmentAsset;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.*;

public interface CinemaEquipmentAssetRepository extends JpaRepository<CinemaEquipmentAsset,UUID> {
    List<CinemaEquipmentAsset> findByCinemaIdOrderByAssetCodeAsc(UUID cinemaId);
    boolean existsByAssetCodeIgnoreCase(String assetCode);
    Optional<CinemaEquipmentAsset> findByAssetCodeIgnoreCase(String assetCode);
    long countByCinemaIdAndStatus(UUID cinemaId,String status);
    long countByCinemaIdAndNextServiceDueBetween(UUID cinemaId,LocalDate from,LocalDate to);
}
