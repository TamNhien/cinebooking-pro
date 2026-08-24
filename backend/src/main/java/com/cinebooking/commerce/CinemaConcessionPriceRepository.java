package com.cinebooking.commerce;

import com.cinebooking.domain.CinemaConcessionPrice;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;

public interface CinemaConcessionPriceRepository extends JpaRepository<CinemaConcessionPrice,UUID> {
    List<CinemaConcessionPrice> findByCinemaId(UUID cinemaId);
    Optional<CinemaConcessionPrice> findByCinemaIdAndProductId(UUID cinemaId,UUID productId);
}
