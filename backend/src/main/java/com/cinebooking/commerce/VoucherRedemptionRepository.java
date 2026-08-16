package com.cinebooking.commerce;
import com.cinebooking.domain.VoucherRedemption; import org.springframework.data.jpa.repository.JpaRepository; import java.util.*;
public interface VoucherRedemptionRepository extends JpaRepository<VoucherRedemption,UUID>{ Optional<VoucherRedemption> findByBookingId(UUID bookingId); boolean existsByVoucherIdAndUserId(UUID voucherId,UUID userId); }
