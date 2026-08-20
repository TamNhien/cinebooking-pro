package com.cinebooking.commerce;

import com.cinebooking.common.ApiException;
import com.cinebooking.domain.BookingConcession;
import com.cinebooking.domain.ConcessionProduct;
import com.cinebooking.domain.InventoryMovement;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

import static com.cinebooking.commerce.InventoryDtos.*;

@Service
public class InventoryService {
    private final ConcessionProductRepository products;
    private final InventoryMovementRepository movements;
    private final BookingConcessionRepository bookingConcessions;

    public InventoryService(ConcessionProductRepository products,
                            InventoryMovementRepository movements,
                            BookingConcessionRepository bookingConcessions) {
        this.products=products; this.movements=movements; this.bookingConcessions=bookingConcessions;
    }

    public InventorySummary summary(){
        List<ConcessionProduct> all=products.findAllByOrderBySortOrderAscNameAsc();
        List<InventoryProductResponse> rows=all.stream().map(this::product).toList();
        int tracked=(int)rows.stream().filter(InventoryProductResponse::inventoryEnabled).count();
        int onHand=rows.stream().filter(InventoryProductResponse::inventoryEnabled).mapToInt(InventoryProductResponse::stockOnHand).sum();
        int reserved=rows.stream().filter(InventoryProductResponse::inventoryEnabled).mapToInt(InventoryProductResponse::stockReserved).sum();
        int available=rows.stream().filter(InventoryProductResponse::inventoryEnabled).mapToInt(InventoryProductResponse::stockAvailable).sum();
        int low=(int)rows.stream().filter(x->x.inventoryEnabled()&&x.lowStock()&&!x.soldOut()).count();
        int sold=(int)rows.stream().filter(x->x.inventoryEnabled()&&x.soldOut()).count();
        return new InventorySummary(rows.size(),tracked,onHand,reserved,available,low,sold,rows);
    }

    public List<InventoryMovementResponse> history(UUID productId){
        List<InventoryMovement> list=productId==null?movements.findTop200ByOrderByCreatedAtDesc():movements.findTop200ByProductIdOrderByCreatedAtDesc(productId);
        Map<UUID,String> names=products.findAllById(list.stream().map(InventoryMovement::getProductId).collect(Collectors.toSet())).stream()
                .collect(Collectors.toMap(ConcessionProduct::getId, ConcessionProduct::getName));
        return list.stream().map(m->new InventoryMovementResponse(m.getId(),m.getProductId(),names.getOrDefault(m.getProductId(),"Sản phẩm"),m.getBookingId(),m.getMovementType(),
                nz(m.getQuantityDelta()),nz(m.getReservedDelta()),nz(m.getStockAfter()),nz(m.getReservedAfter()),m.getActorEmail(),m.getNote(),m.getCreatedAt())).toList();
    }

    @Transactional
    public InventoryProductResponse adjust(InventoryAdjustmentRequest req,String actorEmail){
        ConcessionProduct p=products.findByIdForUpdate(req.productId()).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy sản phẩm"));
        String op=req.operation().trim().toUpperCase(Locale.ROOT);
        int old=nz(p.getStockOnHand()); int reserved=nz(p.getStockReserved()); int next;
        if("RESTOCK".equals(op)){
            if(req.quantity()<=0)throw new ApiException(HttpStatus.BAD_REQUEST,"Số lượng nhập kho phải lớn hơn 0");
            next=old+req.quantity();
        }else if("SET".equals(op)){
            next=req.quantity();
            if(next<reserved)throw new ApiException(HttpStatus.CONFLICT,"Tồn kho mới không thể nhỏ hơn số lượng đang giữ cho đơn chờ thanh toán ("+reserved+")");
        }else throw new ApiException(HttpStatus.BAD_REQUEST,"operation phải là RESTOCK hoặc SET");
        p.setStockOnHand(next); products.save(p);
        record(p,null,"RESTOCK".equals(op)?"RESTOCK":"ADJUSTMENT",next-old,0,actorEmail,blank(req.note())==null?("RESTOCK".equals(op)?"Nhập kho":"Điều chỉnh tồn kho"):blank(req.note()));
        return product(p);
    }

    @Transactional
    public void reserveForBooking(UUID bookingId,List<BookingConcession> rows){
        Map<UUID,Integer> qty=quantities(rows); if(qty.isEmpty())return;
        Map<UUID,ConcessionProduct> locked=lock(qty.keySet());
        for(var e:qty.entrySet()){
            ConcessionProduct p=locked.get(e.getKey());
            if(p==null)throw new ApiException(HttpStatus.CONFLICT,"Sản phẩm bắp nước không còn tồn tại");
            if(!Boolean.TRUE.equals(p.getInventoryEnabled()))continue;
            if(movements.existsByBookingIdAndProductIdAndMovementType(bookingId,p.getId(),"RESERVE"))continue;
            int available=available(p), requested=e.getValue();
            if(available<requested)throw new ApiException(HttpStatus.CONFLICT,"Sản phẩm "+p.getName()+" chỉ còn "+available+" phần khả dụng");
            p.setStockReserved(nz(p.getStockReserved())+requested); products.save(p);
            record(p,bookingId,"RESERVE",0,requested,null,"Giữ tồn kho cho booking chờ thanh toán");
        }
    }

    @Transactional
    public void releaseReservation(UUID bookingId,String reason){
        List<BookingConcession> rows=bookingConcessions.findByBookingId(bookingId); Map<UUID,Integer> qty=quantities(rows); if(qty.isEmpty())return;
        Map<UUID,ConcessionProduct> locked=lock(qty.keySet());
        for(var e:qty.entrySet()){
            ConcessionProduct p=locked.get(e.getKey()); if(p==null)continue;
            if(movements.existsByBookingIdAndProductIdAndMovementType(bookingId,p.getId(),"SALE"))continue;
            if(movements.existsByBookingIdAndProductIdAndMovementType(bookingId,p.getId(),"RELEASE"))continue;
            if(!movements.existsByBookingIdAndProductIdAndMovementType(bookingId,p.getId(),"RESERVE"))continue; // legacy booking before V19
            int release=Math.min(nz(p.getStockReserved()),e.getValue());
            p.setStockReserved(nz(p.getStockReserved())-release); products.save(p);
            record(p,bookingId,"RELEASE",0,-release,null,reason==null?"Giải phóng tồn kho đã giữ":reason);
        }
    }

    @Transactional
    public void finalizeSale(UUID bookingId){
        List<BookingConcession> rows=bookingConcessions.findByBookingId(bookingId); Map<UUID,Integer> qty=quantities(rows); if(qty.isEmpty())return;
        Map<UUID,ConcessionProduct> locked=lock(qty.keySet());
        for(var e:qty.entrySet()){
            ConcessionProduct p=locked.get(e.getKey()); if(p==null)throw new ApiException(HttpStatus.CONFLICT,"Sản phẩm bắp nước không còn tồn tại");
            if(movements.existsByBookingIdAndProductIdAndMovementType(bookingId,p.getId(),"SALE"))continue;
            boolean reservedMovement=movements.existsByBookingIdAndProductIdAndMovementType(bookingId,p.getId(),"RESERVE");
            if(!Boolean.TRUE.equals(p.getInventoryEnabled())&&!reservedMovement)continue;
            int requested=e.getValue(); int reservedDelta=0;
            if(reservedMovement){
                if(nz(p.getStockReserved())<requested)throw new ApiException(HttpStatus.CONFLICT,"Tồn kho giữ cho "+p.getName()+" không còn đủ để hoàn tất đơn");
                reservedDelta=-requested;
            }else{
                // Compatibility for a PENDING booking created just before the V19 deployment.
                if(available(p)<requested)throw new ApiException(HttpStatus.CONFLICT,"Sản phẩm "+p.getName()+" không đủ tồn kho để hoàn tất thanh toán");
            }
            if(nz(p.getStockOnHand())<requested)throw new ApiException(HttpStatus.CONFLICT,"Sản phẩm "+p.getName()+" đã hết tồn kho");
            p.setStockOnHand(nz(p.getStockOnHand())-requested);
            if(reservedDelta<0)p.setStockReserved(nz(p.getStockReserved())-requested);
            products.save(p);
            record(p,bookingId,"SALE",-requested,reservedDelta,null,"Xuất kho khi thanh toán thành công");
        }
    }

    @Transactional
    public void consumeLoyaltyReward(UUID productId,int quantity,String actorEmail,String rewardCode){
        if(quantity<=0)throw new ApiException(HttpStatus.BAD_REQUEST,"Số lượng phần thưởng không hợp lệ");
        ConcessionProduct p=products.findByIdForUpdate(productId).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Sản phẩm phần thưởng không còn tồn tại"));
        if(!Boolean.TRUE.equals(p.getActive()))throw new ApiException(HttpStatus.CONFLICT,"Sản phẩm phần thưởng đang tạm dừng");
        if(!Boolean.TRUE.equals(p.getInventoryEnabled()))return;
        if(available(p)<quantity)throw new ApiException(HttpStatus.CONFLICT,"Sản phẩm "+p.getName()+" hiện không đủ tồn kho để giao phần thưởng");
        p.setStockOnHand(nz(p.getStockOnHand())-quantity);products.save(p);
        record(p,null,"LOYALTY_REWARD",-quantity,0,actorEmail,"Đổi điểm loyalty · "+rewardCode);
    }

    @Transactional
    public void restoreForRefund(UUID bookingId){
        List<BookingConcession> rows=bookingConcessions.findByBookingId(bookingId); Map<UUID,Integer> qty=quantities(rows); if(qty.isEmpty())return;
        Map<UUID,ConcessionProduct> locked=lock(qty.keySet());
        for(var e:qty.entrySet()){
            ConcessionProduct p=locked.get(e.getKey()); if(p==null)continue;
            if(!movements.existsByBookingIdAndProductIdAndMovementType(bookingId,p.getId(),"SALE"))continue; // historical pre-V19 sale: no inventory accounting to reverse
            if(movements.existsByBookingIdAndProductIdAndMovementType(bookingId,p.getId(),"REFUND"))continue;
            int quantity=e.getValue(); p.setStockOnHand(nz(p.getStockOnHand())+quantity); products.save(p);
            record(p,bookingId,"REFUND",quantity,0,null,"Hoàn kho do booking được hoàn tiền");
        }
    }

    private Map<UUID,Integer> quantities(List<BookingConcession> rows){
        Map<UUID,Integer> qty=new LinkedHashMap<>();
        if(rows==null)return qty;
        for(BookingConcession row:rows)if(row.getProductId()!=null&&row.getQuantity()!=null&&row.getQuantity()>0)qty.merge(row.getProductId(),row.getQuantity(),Integer::sum);
        return qty;
    }
    private Map<UUID,ConcessionProduct> lock(Collection<UUID> ids){return products.findAllByIdForUpdate(ids).stream().collect(Collectors.toMap(ConcessionProduct::getId, Function.identity(),(a,b)->a,LinkedHashMap::new));}
    private int available(ConcessionProduct p){return Math.max(0,nz(p.getStockOnHand())-nz(p.getStockReserved()));}
    private InventoryProductResponse product(ConcessionProduct p){int available=available(p);boolean tracked=Boolean.TRUE.equals(p.getInventoryEnabled());boolean sold=tracked&&available<=0;boolean low=tracked&&available<=nz(p.getLowStockThreshold());return new InventoryProductResponse(p.getId(),p.getName(),p.getPrice(),Boolean.TRUE.equals(p.getActive()),tracked,nz(p.getStockOnHand()),nz(p.getStockReserved()),available,nz(p.getLowStockThreshold()),low,sold);}
    private void record(ConcessionProduct p,UUID bookingId,String type,int qtyDelta,int reservedDelta,String actor,String note){InventoryMovement m=new InventoryMovement();m.setProductId(p.getId());m.setBookingId(bookingId);m.setMovementType(type);m.setQuantityDelta(qtyDelta);m.setReservedDelta(reservedDelta);m.setStockAfter(nz(p.getStockOnHand()));m.setReservedAfter(nz(p.getStockReserved()));m.setActorEmail(actor);m.setNote(note);movements.save(m);}
    private int nz(Integer v){return v==null?0:v;}
    private String blank(String s){return s==null||s.isBlank()?null:s.trim();}
}
