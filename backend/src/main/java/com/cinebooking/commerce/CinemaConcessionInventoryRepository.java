package com.cinebooking.commerce;

import com.cinebooking.domain.CinemaConcessionInventory;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.util.*;

public interface CinemaConcessionInventoryRepository extends JpaRepository<CinemaConcessionInventory,UUID> {
    List<CinemaConcessionInventory> findByCinemaId(UUID cinemaId);
    Optional<CinemaConcessionInventory> findByCinemaIdAndProductId(UUID cinemaId,UUID productId);
    List<CinemaConcessionInventory> findByCinemaIdIn(Collection<UUID> cinemaIds);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select i from CinemaConcessionInventory i where i.cinemaId=:cinemaId and i.productId in :productIds order by i.productId")
    List<CinemaConcessionInventory> findForUpdate(@Param("cinemaId") UUID cinemaId,@Param("productIds") Collection<UUID> productIds);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select i from CinemaConcessionInventory i where i.productId=:productId and i.cinemaId in :cinemaIds order by i.cinemaId")
    List<CinemaConcessionInventory> findTransferRowsForUpdate(@Param("productId") UUID productId,@Param("cinemaIds") Collection<UUID> cinemaIds);
}
