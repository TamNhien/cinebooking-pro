package com.cinebooking.commerce;

import com.cinebooking.audit.AuditService;
import com.cinebooking.common.ApiException;
import com.cinebooking.domain.*;
import com.cinebooking.notification.NotificationService;
import com.cinebooking.user.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.*;
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.*;

import static com.cinebooking.commerce.LoyaltyDtos.*;

@Service
public class LoyaltyService {
    private final UserRepository users;
    private final LoyaltyTransactionRepository transactions;
    private final LoyaltyPointLotRepository lots;
    private final LoyaltyRewardRepository rewards;
    private final LoyaltyRewardRedemptionRepository redemptions;
    private final VoucherRepository vouchers;
    private final ConcessionProductRepository products;
    private final InventoryService inventory;
    private final NotificationService notifications;
    private final AuditService audit;
    private final int expiryMonths;
    private final int expiringSoonDays;

    public LoyaltyService(UserRepository users, LoyaltyTransactionRepository transactions, LoyaltyPointLotRepository lots,
                          LoyaltyRewardRepository rewards, LoyaltyRewardRedemptionRepository redemptions,
                          VoucherRepository vouchers, ConcessionProductRepository products, InventoryService inventory,
                          NotificationService notifications, AuditService audit,
                          @Value("${app.loyalty.point-expiry-months:12}") int expiryMonths,
                          @Value("${app.loyalty.expiring-soon-days:30}") int expiringSoonDays) {
        this.users=users; this.transactions=transactions; this.lots=lots; this.rewards=rewards; this.redemptions=redemptions;
        this.vouchers=vouchers; this.products=products; this.inventory=inventory; this.notifications=notifications; this.audit=audit;
        if(expiryMonths<1||expiryMonths>60)throw new IllegalArgumentException("app.loyalty.point-expiry-months must be 1..60");
        if(expiringSoonDays<1||expiringSoonDays>365)throw new IllegalArgumentException("app.loyalty.expiring-soon-days must be 1..365");
        this.expiryMonths=expiryMonths; this.expiringSoonDays=expiringSoonDays;
    }

    @Transactional
    public LoyaltySummaryResponse summary(String email){
        AppUser u=lockedUser(email); expireDue(u,Instant.now()); return summaryOf(u);
    }

    @Transactional
    public List<LoyaltyTransactionResponse> history(String email){
        AppUser u=lockedUser(email); expireDue(u,Instant.now());
        return transactions.findTop50ByUserIdOrderByCreatedAtDesc(u.getId()).stream().map(this::txDto).toList();
    }

    @Transactional
    public List<LoyaltyRewardResponse> rewardCatalog(String email){
        AppUser u=lockedUser(email); expireDue(u,Instant.now()); int balance=points(u);
        Map<UUID,String> names=new HashMap<>();
        products.findAllById(rewards.findByActiveTrueOrderBySortOrderAscPointsCostAsc().stream().map(LoyaltyReward::getConcessionProductId).filter(Objects::nonNull).toList())
                .forEach(p->names.put(p.getId(),p.getName()));
        return rewards.findByActiveTrueOrderBySortOrderAscPointsCostAsc().stream().map(r->rewardDto(r,balance,names.get(r.getConcessionProductId()))).toList();
    }

    public List<OwnedVoucherResponse> ownedVouchers(String email){
        AppUser u=users.findByEmailIgnoreCase(email).orElseThrow(); Instant now=Instant.now();
        return vouchers.findByOwnerUserIdOrderByCreatedAtDesc(u.getId()).stream()
                .map(v->new OwnedVoucherResponse(v.getId(),v.getCode(),v.getName(),v.getDiscountType(),v.getDiscountValue(),v.getMinOrderAmount(),v.getMaxDiscount(),v.getStartsAt(),v.getEndsAt(),Boolean.TRUE.equals(v.getActive())&&(v.getEndsAt()==null||now.isBefore(v.getEndsAt())))).toList();
    }

    public List<LoyaltyRedemptionResponse> redemptions(String email){
        AppUser u=users.findByEmailIgnoreCase(email).orElseThrow(); Map<UUID,LoyaltyReward> rewardMap=new HashMap<>();
        rewards.findAllById(redemptions.findTop50ByUserIdOrderByRedeemedAtDesc(u.getId()).stream().map(LoyaltyRewardRedemption::getRewardId).collect(java.util.stream.Collectors.toSet())).forEach(r->rewardMap.put(r.getId(),r));
        return redemptions.findTop50ByUserIdOrderByRedeemedAtDesc(u.getId()).stream().map(r->redemptionDto(r,rewardMap.get(r.getRewardId()))).toList();
    }

    @Transactional
    public LoyaltyRedemptionResponse redeemReward(String email,UUID rewardId){
        AppUser u=lockedUser(email); Instant now=Instant.now(); expireDue(u,now);
        LoyaltyReward reward=rewards.findById(rewardId).filter(r->Boolean.TRUE.equals(r.getActive())).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Phần thưởng không tồn tại hoặc đã tạm dừng"));
        int cost=reward.getPointsCost(); if(points(u)<cost)throw new ApiException(HttpStatus.CONFLICT,"Bạn chưa đủ "+cost+" điểm để đổi phần thưởng này");
        debit(u,cost,"REWARD",null,"Đổi điểm: "+reward.getName(),"LOYALTY_REWARD",reward.getId().toString());
        LoyaltyRewardRedemption rd=new LoyaltyRewardRedemption(); rd.setUserId(u.getId());rd.setRewardId(reward.getId());rd.setPointsCost(cost);rd.setRedemptionCode(rewardCode(reward));rd.setStatus("ISSUED");
        if("VOUCHER".equals(reward.getRewardType())){
            Voucher v=issueRewardVoucher(u,reward,now);rd.setVoucherId(v.getId());rd.setRedemptionCode(v.getCode());
        }
        redemptions.save(rd);
        notifications.create(u.getId(),"LOYALTY_REWARD","Đổi điểm thành công","Bạn đã đổi "+cost+" điểm lấy "+reward.getName()+".","/profile");
        return redemptionDto(rd,reward);
    }

    @Transactional
    public BirthdayRewardResponse claimBirthdayReward(String email){
        AppUser u=lockedUser(email); LocalDate today=LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"));
        if(u.getBirthDate()==null)throw new ApiException(HttpStatus.CONFLICT,"Hãy cập nhật ngày sinh trong hồ sơ trước khi nhận quà sinh nhật");
        if(!sameMonthDay(u.getBirthDate(),today))throw new ApiException(HttpStatus.CONFLICT,"Quà sinh nhật chỉ có thể nhận đúng ngày sinh của bạn");
        if(Objects.equals(u.getBirthdayRewardYear(),today.getYear()))throw new ApiException(HttpStatus.CONFLICT,"Bạn đã nhận quà sinh nhật năm nay");
        Instant now=Instant.now(); Voucher v=new Voucher();v.setOwnerUserId(u.getId());v.setCode("BDAY-"+today.getYear()+"-"+shortId(u.getId()));v.setName("Quà sinh nhật CineBooking "+today.getYear());v.setDiscountType("PERCENT");v.setDiscountValue(new BigDecimal("20"));v.setMinOrderAmount(new BigDecimal("100000"));v.setMaxDiscount(new BigDecimal("50000"));v.setStartsAt(now);v.setEndsAt(now.plus(30,ChronoUnit.DAYS));v.setUsageLimit(1);v.setUsedCount(0);v.setActive(true);vouchers.save(v);
        u.setBirthdayRewardYear(today.getYear());users.save(u);
        notifications.create(u.getId(),"LOYALTY_BIRTHDAY","🎂 Quà sinh nhật đã sẵn sàng","Mã "+v.getCode()+" giảm 20%, tối đa 50.000đ và có hiệu lực 30 ngày.","/profile");
        return new BirthdayRewardResponse(true,v.getCode(),v.getEndsAt(),"Chúc mừng sinh nhật! Voucher cá nhân đã được thêm vào tài khoản.");
    }

    @Transactional
    public int awardForPayment(UUID userId,UUID bookingId,BigDecimal paidAmount){
        AppUser u=users.findByIdForUpdate(userId).orElseThrow(); Instant now=Instant.now(); expireDue(u,now);
        int base=paidAmount.divideToIntegralValue(BigDecimal.valueOf(10000)).intValue(); if(base<=0)return 0;
        int awarded=BigDecimal.valueOf(base).multiply(multiplier(tier(lifetime(u)))).setScale(0,RoundingMode.DOWN).intValue(); if(awarded<=0)return 0;
        credit(u,awarded,true,"EARN",bookingId,"Tích điểm từ thanh toán booking "+bookingId,"BOOKING",bookingId.toString(),pointExpiry(now));
        return awarded;
    }

    @Transactional
    public int refreshAvailablePoints(AppUser lockedUser){expireDue(lockedUser,Instant.now());return points(lockedUser);}

    @Transactional
    public void redeemForBooking(AppUser lockedUser,UUID bookingId,int requestedPoints){
        if(requestedPoints<=0)return; expireDue(lockedUser,Instant.now()); if(points(lockedUser)<requestedPoints)throw new ApiException(HttpStatus.CONFLICT,"Số điểm khả dụng đã thay đổi. Hãy tải lại trang và thử lại");
        debit(lockedUser,requestedPoints,"REDEEM",bookingId,"Dùng điểm cho booking "+bookingId,"BOOKING",bookingId.toString());
    }

    @Transactional
    public void refundRedeemedPoints(UUID userId,UUID bookingId,int points,String description){
        if(points<=0)return; AppUser u=users.findByIdForUpdate(userId).orElseThrow(); expireDue(u,Instant.now());
        credit(u,points,false,"REFUND",bookingId,description,"BOOKING",bookingId.toString(),pointExpiry(Instant.now()));
    }

    @Transactional
    public void reverseEarnedPoints(UUID userId,UUID bookingId,int awardedPoints){
        if(awardedPoints<=0)return; AppUser u=users.findByIdForUpdate(userId).orElseThrow(); expireDue(u,Instant.now());
        int remove=Math.min(points(u),awardedPoints); if(remove>0)consumeLots(u.getId(),remove);
        u.setLoyaltyPoints(Math.max(0,points(u)-remove));u.setLoyaltyLifetimePoints(Math.max(0,lifetime(u)-awardedPoints));u.setMembershipTier(tier(lifetime(u)));users.save(u);
        saveTx(u,bookingId,"REVERSAL",awardedPoints,"Thu hồi điểm do hoàn tiền booking "+bookingId,null,"BOOKING",bookingId.toString());
    }

    @Transactional
    public LoyaltySummaryResponse adminAdjust(UUID userId,int delta,String reason,String actor,String ip){
        if(delta==0)throw new ApiException(HttpStatus.BAD_REQUEST,"Số điểm điều chỉnh phải khác 0"); AppUser u=users.findByIdForUpdate(userId).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy khách hàng")); expireDue(u,Instant.now());
        if(delta>0)credit(u,delta,false,"ADJUST_CREDIT",null,"Admin cộng điểm: "+reason,"ADMIN_ADJUSTMENT",actor,pointExpiry(Instant.now()));
        else {int amount=-delta;if(points(u)<amount)throw new ApiException(HttpStatus.CONFLICT,"Không thể trừ quá số điểm khả dụng hiện tại");debit(u,amount,"ADJUST_DEBIT",null,"Admin trừ điểm: "+reason,"ADMIN_ADJUSTMENT",actor);}
        audit.record(actor,"LOYALTY_ADJUST","USER",u.getId().toString(),"delta="+delta+", reason="+reason,ip);
        notifications.create(u.getId(),"LOYALTY_ADJUST","Điểm thành viên đã được điều chỉnh",(delta>0?"+":"")+delta+" điểm · "+reason,"/profile");
        return summaryOf(u);
    }

    @Transactional
    public AdminMemberResponse adminBirthDate(UUID userId, LocalDate birthDate, String reason, String actor, String ip){
        AppUser u=users.findByIdForUpdate(userId).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy khách hàng"));
        if(u.getRole()!=Role.USER)throw new ApiException(HttpStatus.CONFLICT,"Chỉ có thể chỉnh ngày sinh cho tài khoản khách hàng");
        if(birthDate!=null){
            LocalDate today=LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"));
            if(birthDate.isAfter(today)||birthDate.isBefore(LocalDate.of(1900,1,1)))throw new ApiException(HttpStatus.BAD_REQUEST,"Ngày sinh không hợp lệ");
        }
        LocalDate old=u.getBirthDate();u.setBirthDate(birthDate);users.save(u);
        audit.record(actor,"LOYALTY_BIRTHDATE_ADJUST","USER",u.getId().toString(),"old="+old+", new="+birthDate+", reason="+reason,ip);
        return adminMember(u,Instant.now().plus(expiringSoonDays,ChronoUnit.DAYS),lots.findByUserIdAndRemainingPointsGreaterThan(u.getId(),0));
    }

    public List<AdminMemberResponse> adminMembers(){
        Instant cutoff=Instant.now().plus(expiringSoonDays,ChronoUnit.DAYS); Map<UUID,List<LoyaltyPointLot>> byUser=new HashMap<>();
        for(LoyaltyPointLot lot:lots.findByRemainingPointsGreaterThan(0))byUser.computeIfAbsent(lot.getUserId(),k->new ArrayList<>()).add(lot);
        return users.findAllByOrderByCreatedAtDesc().stream().filter(u->u.getRole()==Role.USER).map(u->adminMember(u,cutoff,byUser.getOrDefault(u.getId(),List.of()))).toList();
    }

    @Transactional
    public ConcessionClaimResponse claimConcession(String code,String staffEmail){
        LoyaltyRewardRedemption rd=redemptions.findByCodeForUpdate(code.trim()).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Mã phần thưởng không tồn tại"));
        LoyaltyReward reward=rewards.findById(rd.getRewardId()).orElseThrow(); if(!"CONCESSION".equals(reward.getRewardType()))throw new ApiException(HttpStatus.CONFLICT,"Mã này không phải phần thưởng bắp nước");
        if("CLAIMED".equals(rd.getStatus()))throw new ApiException(HttpStatus.CONFLICT,"Phần thưởng này đã được nhận");
        Instant expiry=rd.getRedeemedAt().plus(reward.getValidityDays(),ChronoUnit.DAYS); if(Instant.now().isAfter(expiry))throw new ApiException(HttpStatus.CONFLICT,"Mã phần thưởng đã hết hạn");
        AppUser staff=users.findByEmailIgnoreCase(staffEmail).orElseThrow(); AppUser customer=users.findById(rd.getUserId()).orElseThrow(); ConcessionProduct product=products.findById(reward.getConcessionProductId()).orElseThrow(); int qty=reward.getConcessionQuantity();
        inventory.consumeLoyaltyReward(product.getId(),qty,staffEmail,rd.getRedemptionCode()); rd.setStatus("CLAIMED");rd.setClaimedAt(Instant.now());rd.setClaimedByUserId(staff.getId());redemptions.save(rd);
        audit.record(staffEmail,"LOYALTY_CONCESSION_CLAIM","LOYALTY_REWARD",rd.getId().toString(),"code="+rd.getRedemptionCode()+", product="+product.getName()+", qty="+qty,null);
        notifications.create(customer.getId(),"LOYALTY_REWARD_CLAIMED","Đã nhận quà thành viên",product.getName()+" x"+qty+" đã được nhân viên xác nhận giao.","/profile");
        return new ConcessionClaimResponse(rd.getRedemptionCode(),reward.getName(),customer.getEmail(),product.getName(),qty,rd.getClaimedAt(),"Đã xác nhận giao phần thưởng.");
    }

    @Transactional
    public int expireSweep(){
        Instant now=Instant.now(); Set<UUID> userIds=new LinkedHashSet<>(); for(LoyaltyPointLot lot:lots.findTop100ByExpiresAtLessThanEqualAndRemainingPointsGreaterThanOrderByExpiresAtAsc(now,0))userIds.add(lot.getUserId()); int expired=0;
        for(UUID uid:userIds){AppUser u=users.findByIdForUpdate(uid).orElse(null);if(u!=null)expired+=expireDue(u,now);}return expired;
    }

    private AdminMemberResponse adminMember(AppUser u,Instant cutoff,List<LoyaltyPointLot> open){int soon=open.stream().filter(l->!l.getExpiresAt().isAfter(cutoff)).mapToInt(LoyaltyPointLot::getRemainingPoints).sum();Instant next=open.stream().map(LoyaltyPointLot::getExpiresAt).min(Comparator.naturalOrder()).orElse(null);return new AdminMemberResponse(u.getId(),u.getEmail(),u.getFullName(),points(u),lifetime(u),tier(lifetime(u)),soon,next,u.getBirthDate());}
    private Instant pointExpiry(Instant base){return base.atZone(ZoneOffset.UTC).plusMonths(expiryMonths).toInstant();}

    public String tierFor(int lifetimePoints){return tier(lifetimePoints);}

    private int expireDue(AppUser u,Instant now){
        List<LoyaltyPointLot> open=lots.findSpendableForUpdate(u.getId()); int expired=0;
        for(LoyaltyPointLot lot:open){if(lot.getExpiresAt().isAfter(now))continue;int n=lot.getRemainingPoints();if(n<=0)continue;expired+=n;lot.setRemainingPoints(0);lot.setExpiredAt(now);lots.save(lot);}
        if(expired>0){u.setLoyaltyPoints(Math.max(0,points(u)-expired));users.save(u);saveTx(u,null,"EXPIRE",expired,"Điểm thành viên hết hạn",null,"POINT_EXPIRY",now.toString());notifications.create(u.getId(),"LOYALTY_EXPIRED",expired+" điểm đã hết hạn","Số dư hiện tại: "+points(u)+" điểm.","/profile");}
        return expired;
    }

    private void credit(AppUser u,int amount,boolean qualifying,String type,UUID bookingId,String description,String refType,String refId,Instant expiresAt){
        u.setLoyaltyPoints(points(u)+amount);if(qualifying){u.setLoyaltyLifetimePoints(lifetime(u)+amount);u.setMembershipTier(tier(lifetime(u)));}users.save(u);
        LoyaltyTransaction tx=saveTx(u,bookingId,type,amount,description,expiresAt,refType,refId);LoyaltyPointLot lot=new LoyaltyPointLot();lot.setUserId(u.getId());lot.setSourceTransactionId(tx.getId());lot.setOriginalPoints(amount);lot.setRemainingPoints(amount);lot.setExpiresAt(expiresAt);lots.save(lot);
    }

    private void debit(AppUser u,int amount,String type,UUID bookingId,String description,String refType,String refId){
        if(amount<=0)return;if(points(u)<amount)throw new ApiException(HttpStatus.CONFLICT,"Không đủ điểm thành viên");consumeLots(u.getId(),amount);u.setLoyaltyPoints(points(u)-amount);users.save(u);saveTx(u,bookingId,type,amount,description,null,refType,refId);
    }

    private void consumeLots(UUID userId,int amount){int left=amount;for(LoyaltyPointLot lot:lots.findSpendableForUpdate(userId)){if(left<=0)break;if(lot.getExpiresAt().isBefore(Instant.now()))continue;int take=Math.min(left,lot.getRemainingPoints());lot.setRemainingPoints(lot.getRemainingPoints()-take);lots.save(lot);left-=take;}if(left>0)throw new ApiException(HttpStatus.CONFLICT,"Ledger điểm không đủ số dư. Hãy tải lại và thử lại");}

    private LoyaltyTransaction saveTx(AppUser u,UUID bookingId,String type,int amount,String description,Instant expiresAt,String refType,String refId){LoyaltyTransaction tx=new LoyaltyTransaction();tx.setUserId(u.getId());tx.setBookingId(bookingId);tx.setTransactionType(type);tx.setPoints(amount);tx.setDescription(description);tx.setExpiresAt(expiresAt);tx.setBalanceAfter(points(u));tx.setReferenceType(refType);tx.setReferenceId(refId);return transactions.save(tx);}

    private Voucher issueRewardVoucher(AppUser u,LoyaltyReward r,Instant now){Voucher v=new Voucher();v.setOwnerUserId(u.getId());v.setCode("RWD-"+r.getCode()+"-"+UUID.randomUUID().toString().substring(0,8).toUpperCase(Locale.ROOT));v.setName(r.getName());v.setDiscountType(r.getDiscountType());v.setDiscountValue(r.getDiscountValue());v.setMinOrderAmount(r.getMinOrderAmount());v.setMaxDiscount(r.getMaxDiscount());v.setStartsAt(now);v.setEndsAt(now.plus(r.getValidityDays(),ChronoUnit.DAYS));v.setUsageLimit(1);v.setUsedCount(0);v.setActive(true);return vouchers.save(v);}
    private String rewardCode(LoyaltyReward r){return "GIFT-"+r.getCode()+"-"+UUID.randomUUID().toString().substring(0,8).toUpperCase(Locale.ROOT);}
    private String shortId(UUID id){return id.toString().replace("-","").substring(0,8).toUpperCase(Locale.ROOT);}
    private boolean sameMonthDay(LocalDate a,LocalDate b){return a.getMonthValue()==b.getMonthValue()&&a.getDayOfMonth()==b.getDayOfMonth();}
    private AppUser lockedUser(String email){AppUser base=users.findByEmailIgnoreCase(email).orElseThrow(()->new ApiException(HttpStatus.UNAUTHORIZED,"Không tìm thấy tài khoản"));return users.findByIdForUpdate(base.getId()).orElseThrow();}
    private int points(AppUser u){return u.getLoyaltyPoints()==null?0:u.getLoyaltyPoints();}
    private int lifetime(AppUser u){return u.getLoyaltyLifetimePoints()==null?0:u.getLoyaltyLifetimePoints();}
    private String tier(int p){if(p>=4000)return "DIAMOND";if(p>=1500)return "GOLD";if(p>=500)return "SILVER";return "BRONZE";}
    private BigDecimal multiplier(String tier){return switch(tier){case "DIAMOND"->new BigDecimal("1.50");case "GOLD"->new BigDecimal("1.25");case "SILVER"->new BigDecimal("1.10");default->BigDecimal.ONE;};}
    private LoyaltySummaryResponse summaryOf(AppUser u){List<LoyaltyPointLot> open=lots.findSpendableForUpdate(u.getId());Instant cutoff=Instant.now().plus(expiringSoonDays,ChronoUnit.DAYS);int soon=open.stream().filter(l->!l.getExpiresAt().isAfter(cutoff)).mapToInt(LoyaltyPointLot::getRemainingPoints).sum();Instant next=open.stream().map(LoyaltyPointLot::getExpiresAt).min(Comparator.naturalOrder()).orElse(null);int lp=lifetime(u);String current=tier(lp);String nextTier=current.equals("BRONZE")?"SILVER":current.equals("SILVER")?"GOLD":current.equals("GOLD")?"DIAMOND":null;Integer nextAt=current.equals("BRONZE")?500:current.equals("SILVER")?1500:current.equals("GOLD")?4000:null;int left=nextAt==null?0:Math.max(0,nextAt-lp);LocalDate today=LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"));boolean eligible=u.getBirthDate()!=null&&sameMonthDay(u.getBirthDate(),today)&&!Objects.equals(u.getBirthdayRewardYear(),today.getYear());return new LoyaltySummaryResponse(points(u),lp,current,multiplier(current),nextTier,nextAt,left,soon,next,expiryMonths,u.getBirthDate(),eligible,u.getBirthdayRewardYear());}
    private LoyaltyTransactionResponse txDto(LoyaltyTransaction t){return new LoyaltyTransactionResponse(t.getId(),t.getBookingId(),t.getTransactionType(),t.getPoints(),t.getDescription(),t.getCreatedAt(),t.getExpiresAt(),t.getBalanceAfter(),t.getReferenceType(),t.getReferenceId());}
    private LoyaltyRewardResponse rewardDto(LoyaltyReward r,int balance,String productName){return new LoyaltyRewardResponse(r.getId(),r.getCode(),r.getName(),r.getDescription(),r.getRewardType(),r.getPointsCost(),balance>=r.getPointsCost(),r.getDiscountType(),r.getDiscountValue(),r.getMinOrderAmount(),r.getMaxDiscount(),r.getValidityDays(),r.getConcessionProductId(),productName,r.getConcessionQuantity());}
    private LoyaltyRedemptionResponse redemptionDto(LoyaltyRewardRedemption rd,LoyaltyReward reward){String name=reward==null?"Phần thưởng":reward.getName();String type=reward==null?"UNKNOWN":reward.getRewardType();String voucherCode=rd.getVoucherId()==null?null:vouchers.findById(rd.getVoucherId()).map(Voucher::getCode).orElse(null);int days=reward==null?30:reward.getValidityDays();return new LoyaltyRedemptionResponse(rd.getId(),rd.getRewardId(),name,type,rd.getRedemptionCode(),voucherCode,rd.getPointsCost(),rd.getStatus(),rd.getRedeemedAt(),rd.getRedeemedAt().plus(days,ChronoUnit.DAYS),rd.getClaimedAt());}
}
