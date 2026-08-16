package com.cinebooking.commerce;

import com.cinebooking.domain.ConcessionProduct;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;
import java.util.*;

public interface ConcessionProductRepository extends JpaRepository<ConcessionProduct,UUID>{
    List<ConcessionProduct> findByActiveTrueOrderBySortOrderAscNameAsc();
    List<ConcessionProduct> findAllByOrderBySortOrderAscNameAsc();

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from ConcessionProduct p where p.id in :ids order by p.id")
    List<ConcessionProduct> findAllByIdForUpdate(@Param("ids") Collection<UUID> ids);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from ConcessionProduct p where p.id=:id")
    Optional<ConcessionProduct> findByIdForUpdate(@Param("id") UUID id);
}
