package com.cinebooking.commerce;

import com.cinebooking.booking.BookingRepository;
import com.cinebooking.common.ApiException;
import com.cinebooking.domain.*;
import com.cinebooking.movie.AuditoriumRepository;
import com.cinebooking.movie.CinemaRepository;
import com.cinebooking.movie.ShowtimeRepository;
import com.cinebooking.user.StaffProfileRepository;
import com.cinebooking.user.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

import static com.cinebooking.commerce.InventoryDtos.*;

@Service
public class InventoryService {
    private final ConcessionProductRepository products;
    private final CinemaConcessionInventoryRepository branchInventory;
    private final CinemaConcessionPriceRepository branchPrices;
    private final InventoryMovementRepository movements;
    private final BookingConcessionRepository bookingConcessions;
    private final BookingRepository bookings;
    private final ShowtimeRepository showtimes;
    private final AuditoriumRepository auditoriums;
    private final CinemaRepository cinemas;
    private final UserRepository users;
    private final StaffProfileRepository staffProfiles;

    public InventoryService(ConcessionProductRepository products,CinemaConcessionInventoryRepository branchInventory,
                            CinemaConcessionPriceRepository branchPrices,InventoryMovementRepository movements,
                            BookingConcessionRepository bookingConcessions,BookingRepository bookings,
                            ShowtimeRepository showtimes,AuditoriumRepository auditoriums,CinemaRepository cinemas,
                            UserRepository users,StaffProfileRepository staffProfiles){
        this.products=products;this.branchInventory=branchInventory;this.branchPrices=branchPrices;this.movements=movements;
        this.bookingConcessions=bookingConcessions;this.bookings=bookings;this.showtimes=showtimes;this.auditoriums=auditoriums;this.cinemas=cinemas;
        this.users=users;this.staffProfiles=staffProfiles;
    }

    @Transactional(readOnly=true)
    public List<InventoryBranchOverview> branches(){
        Map<UUID,String> names=cinemas.findAllByOrderByNameAsc().stream().collect(Collectors.toMap(Cinema::getId,Cinema::getName, (a,b)->a,LinkedHashMap::new));
        List<CinemaConcessionInventory> all=branchInventory.findByCinemaIdIn(names.keySet());
        Map<UUID,List<CinemaConcessionInventory>> grouped=all.stream().collect(Collectors.groupingBy(CinemaConcessionInventory::getCinemaId));
        List<InventoryBranchOverview> out=new ArrayList<>();
        for(var e:names.entrySet()){
            List<CinemaConcessionInventory> rows=grouped.getOrDefault(e.getKey(),List.of());
            int tracked=(int)rows.stream().filter(x->Boolean.TRUE.equals(x.getActive())).count();
            int available=rows.stream().mapToInt(this::available).sum();
            int low=(int)rows.stream().filter(x->Boolean.TRUE.equals(x.getActive())&&available(x)>0&&available(x)<=nz(x.getLowStockThreshold())).count();
            int sold=(int)rows.stream().filter(x->Boolean.TRUE.equals(x.getActive())&&available(x)<=0).count();
            out.add(new InventoryBranchOverview(e.getKey(),e.getValue(),tracked,available,low,sold));
        }
        return out;
    }

    @Transactional(readOnly=true)
    public InventorySummary summary(UUID cinemaId){
        Cinema cinema=cinemas.findById(cinemaId).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy rạp"));
        List<ConcessionProduct> allProducts=products.findAllByOrderBySortOrderAscNameAsc();
        Map<UUID,CinemaConcessionInventory> inv=branchInventory.findByCinemaId(cinemaId).stream().collect(Collectors.toMap(CinemaConcessionInventory::getProductId,x->x));
        Map<UUID,CinemaConcessionPrice> prices=branchPrices.findByCinemaId(cinemaId).stream().collect(Collectors.toMap(CinemaConcessionPrice::getProductId,x->x));
        List<InventoryProductResponse> rows=allProducts.stream().map(p->product(cinema,p,inv.get(p.getId()),prices.get(p.getId()))).toList();
        int tracked=(int)rows.stream().filter(InventoryProductResponse::inventoryEnabled).count();
        int onHand=rows.stream().filter(InventoryProductResponse::inventoryEnabled).mapToInt(InventoryProductResponse::stockOnHand).sum();
        int reserved=rows.stream().filter(InventoryProductResponse::inventoryEnabled).mapToInt(InventoryProductResponse::stockReserved).sum();
        int available=rows.stream().filter(InventoryProductResponse::inventoryEnabled).mapToInt(InventoryProductResponse::stockAvailable).sum();
        int low=(int)rows.stream().filter(x->x.inventoryEnabled()&&x.lowStock()&&!x.soldOut()).count();
        int sold=(int)rows.stream().filter(x->x.inventoryEnabled()&&x.soldOut()).count();
        return new InventorySummary(cinemaId,cinema.getName(),rows.size(),tracked,onHand,reserved,available,low,sold,rows);
    }

    @Transactional(readOnly=true)
    public List<InventoryMovementResponse> history(UUID cinemaId,UUID productId){
        List<InventoryMovement> list;
        if(cinemaId!=null&&productId!=null)list=movements.findTop200ByCinemaIdAndProductIdOrderByCreatedAtDesc(cinemaId,productId);
        else if(cinemaId!=null)list=movements.findTop200ByCinemaIdOrderByCreatedAtDesc(cinemaId);
        else if(productId!=null)list=movements.findTop200ByProductIdOrderByCreatedAtDesc(productId);
        else list=movements.findTop200ByOrderByCreatedAtDesc();
        Map<UUID,String> productNames=products.findAllById(list.stream().map(InventoryMovement::getProductId).collect(Collectors.toSet())).stream().collect(Collectors.toMap(ConcessionProduct::getId,ConcessionProduct::getName));
        Map<UUID,String> cinemaNames=cinemas.findAllById(list.stream().map(InventoryMovement::getCinemaId).filter(Objects::nonNull).collect(Collectors.toSet())).stream().collect(Collectors.toMap(Cinema::getId,Cinema::getName));
        return list.stream().map(m->new InventoryMovementResponse(m.getId(),m.getProductId(),productNames.getOrDefault(m.getProductId(),"Sản phẩm"),m.getCinemaId(),cinemaNames.getOrDefault(m.getCinemaId(),"Kho cũ toàn hệ thống"),m.getBookingId(),m.getMovementType(),nz(m.getQuantityDelta()),nz(m.getReservedDelta()),nz(m.getStockAfter()),nz(m.getReservedAfter()),m.getActorEmail(),m.getReferenceKey(),m.getNote(),m.getCreatedAt())).toList();
    }

    @Transactional
    public InventoryProductResponse adjust(InventoryAdjustmentRequest req,String actorEmail){
        Cinema cinema=cinemas.findById(req.cinemaId()).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy rạp"));
        ConcessionProduct p=products.findById(req.productId()).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy sản phẩm"));
        CinemaConcessionInventory row=lockedOne(req.cinemaId(),req.productId());
        String op=req.operation().trim().toUpperCase(Locale.ROOT);int old=nz(row.getStockOnHand());int reserved=nz(row.getStockReserved());int next=old;
        if("RESTOCK".equals(op)){if(req.quantity()<=0)throw new ApiException(HttpStatus.BAD_REQUEST,"Số lượng nhập kho phải lớn hơn 0");next=old+req.quantity();}
        else if("SET".equals(op)){next=req.quantity();if(next<reserved)throw new ApiException(HttpStatus.CONFLICT,"Tồn kho mới không thể nhỏ hơn số lượng đang giữ cho booking PENDING ("+reserved+")");}
        else if("WASTE".equals(op)){if(req.quantity()<=0)throw new ApiException(HttpStatus.BAD_REQUEST,"Số lượng hao hụt phải lớn hơn 0");if(available(row)<req.quantity())throw new ApiException(HttpStatus.CONFLICT,"Không thể ghi hao hụt vượt số lượng khả dụng");next=old-req.quantity();}
        else throw new ApiException(HttpStatus.BAD_REQUEST,"operation phải là RESTOCK, SET hoặc WASTE");
        row.setStockOnHand(next);if(req.lowStockThreshold()!=null)row.setLowStockThreshold(req.lowStockThreshold());if(req.targetStock()!=null)row.setTargetStock(req.targetStock());branchInventory.save(row);
        String type="RESTOCK".equals(op)?"RESTOCK":"WASTE".equals(op)?"WASTE":"ADJUSTMENT";
        record(row,null,type,next-old,0,actorEmail,null,blank(req.note())==null?("RESTOCK".equals(op)?"Nhập kho chi nhánh":"WASTE".equals(op)?"Ghi nhận hao hụt":"Kiểm kê điều chỉnh tồn"):blank(req.note()));
        return product(cinema,p,row,branchPrices.findByCinemaIdAndProductId(req.cinemaId(),req.productId()).orElse(null));
    }

    @Transactional
    public InventoryTransferResponse transfer(InventoryTransferRequest req,String actorEmail){
        if(req.fromCinemaId().equals(req.toCinemaId()))throw new ApiException(HttpStatus.BAD_REQUEST,"Rạp nguồn và rạp nhận phải khác nhau");
        ConcessionProduct p=products.findById(req.productId()).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy sản phẩm"));
        Map<UUID,Cinema> cinemaMap=cinemas.findAllById(List.of(req.fromCinemaId(),req.toCinemaId())).stream().collect(Collectors.toMap(Cinema::getId,x->x));
        if(cinemaMap.size()!=2)throw new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy rạp nguồn hoặc rạp nhận");
        List<CinemaConcessionInventory> locked=branchInventory.findTransferRowsForUpdate(req.productId(),List.of(req.fromCinemaId(),req.toCinemaId()));
        Map<UUID,CinemaConcessionInventory> byCinema=locked.stream().collect(Collectors.toMap(CinemaConcessionInventory::getCinemaId,x->x));
        CinemaConcessionInventory from=byCinema.get(req.fromCinemaId()),to=byCinema.get(req.toCinemaId());
        if(from==null||to==null)throw new ApiException(HttpStatus.CONFLICT,"Sản phẩm chưa được cấu hình kho tại một trong hai rạp");
        if(available(from)<req.quantity())throw new ApiException(HttpStatus.CONFLICT,"Kho nguồn chỉ còn "+available(from)+" phần khả dụng");
        from.setStockOnHand(nz(from.getStockOnHand())-req.quantity());to.setStockOnHand(nz(to.getStockOnHand())+req.quantity());branchInventory.saveAll(List.of(from,to));
        String ref="TRANSFER:"+UUID.randomUUID();String note=blank(req.note())==null?"Điều chuyển tồn kho giữa các rạp":blank(req.note());
        record(from,null,"TRANSFER_OUT",-req.quantity(),0,actorEmail,ref,note+" → "+cinemaMap.get(req.toCinemaId()).getName());
        record(to,null,"TRANSFER_IN",req.quantity(),0,actorEmail,ref,note+" ← "+cinemaMap.get(req.fromCinemaId()).getName());
        return new InventoryTransferResponse(ref,p.getId(),p.getName(),from.getCinemaId(),cinemaMap.get(from.getCinemaId()).getName(),to.getCinemaId(),cinemaMap.get(to.getCinemaId()).getName(),req.quantity(),available(from),available(to));
    }

    @Transactional
    public BranchPriceResponse setPrice(BranchPriceRequest req){
        Cinema cinema=cinemas.findById(req.cinemaId()).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy rạp"));
        ConcessionProduct p=products.findById(req.productId()).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy sản phẩm"));
        CinemaConcessionPrice price=branchPrices.findByCinemaIdAndProductId(req.cinemaId(),req.productId()).orElseGet(()->{CinemaConcessionPrice x=new CinemaConcessionPrice();x.setCinemaId(req.cinemaId());x.setProductId(req.productId());return x;});
        price.setPrice(req.price());price.setActive(req.active()==null?true:req.active());price=branchPrices.save(price);
        return new BranchPriceResponse(cinema.getId(),p.getId(),p.getName(),p.getPrice(),price.getPrice(),Boolean.TRUE.equals(price.getActive()),price.getPrice().compareTo(p.getPrice())!=0,price.getUpdatedAt());
    }

    @Transactional
    public void reserveForBooking(UUID bookingId,UUID cinemaId,List<BookingConcession> rows){
        Map<UUID,Integer> qty=quantities(rows);if(qty.isEmpty())return;Map<UUID,CinemaConcessionInventory> locked=lock(cinemaId,qty.keySet());
        for(var e:qty.entrySet()){CinemaConcessionInventory row=locked.get(e.getKey());ConcessionProduct p=products.findById(e.getKey()).orElse(null);if(row==null||p==null)throw new ApiException(HttpStatus.CONFLICT,"Sản phẩm chưa được cấu hình tại rạp này");if(!Boolean.TRUE.equals(p.getInventoryEnabled())||!Boolean.TRUE.equals(row.getActive()))continue;if(movements.existsByBookingIdAndProductIdAndMovementType(bookingId,p.getId(),"RESERVE"))continue;int available=available(row),requested=e.getValue();if(available<requested)throw new ApiException(HttpStatus.CONFLICT,"Sản phẩm "+p.getName()+" tại rạp này chỉ còn "+available+" phần khả dụng");row.setStockReserved(nz(row.getStockReserved())+requested);branchInventory.save(row);record(row,bookingId,"RESERVE",0,requested,null,null,"Giữ tồn kho tại rạp cho booking chờ thanh toán");}
    }

    @Transactional
    public void releaseReservation(UUID bookingId,String reason){mutateBookingInventory(bookingId,"RELEASE",reason,false);}
    @Transactional
    public void finalizeSale(UUID bookingId){mutateBookingInventory(bookingId,"SALE","Xuất kho tại rạp khi thanh toán thành công",false);}
    @Transactional
    public void restoreForRefund(UUID bookingId){mutateBookingInventory(bookingId,"REFUND","Hoàn kho tại rạp do booking được hoàn tiền",true);}

    @Transactional
    public void consumeLoyaltyReward(UUID productId,int quantity,String actorEmail,String rewardCode){
        if(quantity<=0)throw new ApiException(HttpStatus.BAD_REQUEST,"Số lượng phần thưởng không hợp lệ");
        AppUser staff=users.findByEmailIgnoreCase(actorEmail).orElseThrow();UUID cinemaId=staffProfiles.findById(staff.getId()).map(StaffProfile::getCinemaId).orElseGet(()->cinemas.findAllByOrderByNameAsc().stream().findFirst().map(Cinema::getId).orElseThrow());
        ConcessionProduct p=products.findById(productId).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Sản phẩm phần thưởng không còn tồn tại"));if(!Boolean.TRUE.equals(p.getActive()))throw new ApiException(HttpStatus.CONFLICT,"Sản phẩm phần thưởng đang tạm dừng");if(!Boolean.TRUE.equals(p.getInventoryEnabled()))return;
        CinemaConcessionInventory row=lockedOne(cinemaId,productId);if(available(row)<quantity)throw new ApiException(HttpStatus.CONFLICT,"Sản phẩm "+p.getName()+" tại rạp hiện không đủ tồn kho để giao phần thưởng");row.setStockOnHand(nz(row.getStockOnHand())-quantity);branchInventory.save(row);record(row,null,"LOYALTY_REWARD",-quantity,0,actorEmail,"LOYALTY:"+rewardCode,"Đổi điểm loyalty · "+rewardCode);
    }

    private void mutateBookingInventory(UUID bookingId,String event,String note,boolean refund){
        List<BookingConcession> rows=bookingConcessions.findByBookingId(bookingId);Map<UUID,Integer> qty=quantities(rows);if(qty.isEmpty())return;UUID cinemaId=cinemaForBooking(bookingId);Map<UUID,CinemaConcessionInventory> locked=lock(cinemaId,qty.keySet());
        for(var e:qty.entrySet()){CinemaConcessionInventory row=locked.get(e.getKey());if(row==null)continue;UUID productId=e.getKey();int amount=e.getValue();boolean hasReserve=movements.existsByBookingIdAndProductIdAndMovementType(bookingId,productId,"RESERVE");boolean hasSale=movements.existsByBookingIdAndProductIdAndMovementType(bookingId,productId,"SALE");
            if("RELEASE".equals(event)){if(hasSale||movements.existsByBookingIdAndProductIdAndMovementType(bookingId,productId,"RELEASE")||!hasReserve)continue;int release=Math.min(nz(row.getStockReserved()),amount);row.setStockReserved(nz(row.getStockReserved())-release);branchInventory.save(row);record(row,bookingId,"RELEASE",0,-release,null,null,note);}
            else if("SALE".equals(event)){if(hasSale)continue;if(hasReserve){if(nz(row.getStockReserved())<amount)throw new ApiException(HttpStatus.CONFLICT,"Tồn kho giữ không đủ để hoàn tất đơn");row.setStockReserved(nz(row.getStockReserved())-amount);}else if(available(row)<amount)throw new ApiException(HttpStatus.CONFLICT,"Tồn kho tại rạp không đủ để hoàn tất thanh toán");if(nz(row.getStockOnHand())<amount)throw new ApiException(HttpStatus.CONFLICT,"Sản phẩm tại rạp đã hết tồn kho");row.setStockOnHand(nz(row.getStockOnHand())-amount);branchInventory.save(row);record(row,bookingId,"SALE",-amount,hasReserve?-amount:0,null,null,note);}
            else if(refund){if(!hasSale||movements.existsByBookingIdAndProductIdAndMovementType(bookingId,productId,"REFUND"))continue;row.setStockOnHand(nz(row.getStockOnHand())+amount);branchInventory.save(row);record(row,bookingId,"REFUND",amount,0,null,null,note);}
        }
    }

    private UUID cinemaForBooking(UUID bookingId){Booking b=bookings.findById(bookingId).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy booking"));Showtime s=showtimes.findById(b.getShowtimeId()).orElseThrow();Auditorium a=auditoriums.findById(s.getAuditoriumId()).orElseThrow();return a.getCinemaId();}
    private Map<UUID,Integer> quantities(List<BookingConcession> rows){Map<UUID,Integer> qty=new LinkedHashMap<>();if(rows!=null)for(BookingConcession row:rows)if(row.getProductId()!=null&&row.getQuantity()!=null&&row.getQuantity()>0)qty.merge(row.getProductId(),row.getQuantity(),Integer::sum);return qty;}
    private Map<UUID,CinemaConcessionInventory> lock(UUID cinemaId,Collection<UUID> ids){return branchInventory.findForUpdate(cinemaId,ids).stream().collect(Collectors.toMap(CinemaConcessionInventory::getProductId,x->x,(a,b)->a,LinkedHashMap::new));}
    private CinemaConcessionInventory lockedOne(UUID cinemaId,UUID productId){Map<UUID,CinemaConcessionInventory> rows=lock(cinemaId,List.of(productId));CinemaConcessionInventory row=rows.get(productId);if(row==null)throw new ApiException(HttpStatus.CONFLICT,"Sản phẩm chưa được cấu hình kho tại rạp này");return row;}
    private int available(CinemaConcessionInventory row){return Math.max(0,nz(row.getStockOnHand())-nz(row.getStockReserved()));}
    private InventoryProductResponse product(Cinema cinema,ConcessionProduct p,CinemaConcessionInventory row,CinemaConcessionPrice price){boolean tracked=Boolean.TRUE.equals(p.getInventoryEnabled())&&row!=null&&Boolean.TRUE.equals(row.getActive());int on=row==null?0:nz(row.getStockOnHand()),reserved=row==null?0:nz(row.getStockReserved()),available=Math.max(0,on-reserved),threshold=row==null?nz(p.getLowStockThreshold()):nz(row.getLowStockThreshold()),target=row==null?0:nz(row.getTargetStock());BigDecimal effective=price!=null&&Boolean.TRUE.equals(price.getActive())?price.getPrice():p.getPrice();boolean override=price!=null&&Boolean.TRUE.equals(price.getActive())&&effective.compareTo(p.getPrice())!=0;return new InventoryProductResponse(p.getId(),cinema.getId(),cinema.getName(),p.getName(),p.getPrice(),effective,override,Boolean.TRUE.equals(p.getActive())&&row!=null&&Boolean.TRUE.equals(row.getActive()),tracked,on,reserved,available,threshold,target,tracked&&available<=threshold,tracked&&available<=0);}
    private void record(CinemaConcessionInventory row,UUID bookingId,String type,int qtyDelta,int reservedDelta,String actor,String referenceKey,String note){InventoryMovement m=new InventoryMovement();m.setProductId(row.getProductId());m.setCinemaId(row.getCinemaId());m.setBookingId(bookingId);m.setMovementType(type);m.setQuantityDelta(qtyDelta);m.setReservedDelta(reservedDelta);m.setStockAfter(nz(row.getStockOnHand()));m.setReservedAfter(nz(row.getStockReserved()));m.setActorEmail(actor);m.setReferenceKey(referenceKey);m.setNote(note);movements.save(m);}
    private int nz(Integer v){return v==null?0:v;} private String blank(String s){return s==null||s.isBlank()?null:s.trim();}
}
