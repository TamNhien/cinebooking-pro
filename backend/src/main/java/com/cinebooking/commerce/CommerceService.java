package com.cinebooking.commerce;

import com.cinebooking.common.ApiException;
import com.cinebooking.domain.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.*; import java.time.Instant; import java.util.*;
import static com.cinebooking.commerce.CommerceDtos.*;

@Service
public class CommerceService {
 private final ConcessionProductRepository products; private final VoucherRepository vouchers; private final VoucherRedemptionRepository redemptions; private final BookingConcessionRepository bookingConcessions;
 public CommerceService(ConcessionProductRepository products,VoucherRepository vouchers,VoucherRedemptionRepository redemptions,BookingConcessionRepository bookingConcessions){this.products=products;this.vouchers=vouchers;this.redemptions=redemptions;this.bookingConcessions=bookingConcessions;}
 public List<ProductResponse> publicProducts(){return products.findByActiveTrueOrderBySortOrderAscNameAsc().stream().map(this::productDto).toList();}
 public List<ProductResponse> allProducts(){return products.findAllByOrderBySortOrderAscNameAsc().stream().map(this::productDto).toList();}
 @Transactional public ProductResponse saveProduct(UUID id,ProductRequest r){ConcessionProduct p=id==null?new ConcessionProduct():products.findById(id).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy sản phẩm"));p.setName(r.name().trim());p.setDescription(blank(r.description()));p.setPrice(r.price());p.setImageUrl(blank(r.imageUrl()));p.setActive(r.active()==null?true:r.active());p.setSortOrder(r.sortOrder()==null?0:r.sortOrder());
  p.setInventoryEnabled(r.inventoryEnabled()==null?(p.getInventoryEnabled()==null?true:p.getInventoryEnabled()):r.inventoryEnabled());
  p.setLowStockThreshold(r.lowStockThreshold()==null?(p.getLowStockThreshold()==null?10:p.getLowStockThreshold()):r.lowStockThreshold());
  if(p.getStockOnHand()==null)p.setStockOnHand(0); if(p.getStockReserved()==null)p.setStockReserved(0);
  return productDto(products.save(p));}
 @Transactional public void deleteProduct(UUID id){ConcessionProduct p=products.findById(id).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy sản phẩm"));p.setActive(false);products.save(p);}
 public List<VoucherResponse> allVouchers(){return vouchers.findAllByOrderByCreatedAtDesc().stream().map(this::voucherDto).toList();}
 public List<VoucherResponse> publicVouchers(){Instant now=Instant.now();return vouchers.findByActiveTrueOrderByCreatedAtDesc().stream().filter(v->(v.getStartsAt()==null||!now.isBefore(v.getStartsAt()))&&(v.getEndsAt()==null||!now.isAfter(v.getEndsAt()))&&(v.getUsageLimit()==null||v.getUsedCount()<v.getUsageLimit())).map(this::voucherDto).toList();}
 @Transactional public VoucherResponse saveVoucher(UUID id,VoucherRequest r){
  String type=r.discountType().trim().toUpperCase(Locale.ROOT);
  String code=r.code().trim().toUpperCase(Locale.ROOT);
  if(!Set.of("PERCENT","FIXED").contains(type))throw new ApiException(HttpStatus.BAD_REQUEST,"Loại voucher không hợp lệ");
  if(!code.matches("[A-Z0-9_-]{3,30}"))throw new ApiException(HttpStatus.BAD_REQUEST,"Mã ưu đãi chỉ gồm A-Z, 0-9, dấu gạch ngang/gạch dưới và dài 3-30 ký tự");
  if(type.equals("PERCENT")&&r.discountValue().compareTo(BigDecimal.valueOf(100))>0)throw new ApiException(HttpStatus.BAD_REQUEST,"Phần trăm giảm không được vượt 100");
  if(r.maxDiscount()!=null&&r.maxDiscount().compareTo(BigDecimal.ZERO)<0)throw new ApiException(HttpStatus.BAD_REQUEST,"Mức giảm tối đa không được âm");
  if(r.usageLimit()!=null&&r.usageLimit()<1)throw new ApiException(HttpStatus.BAD_REQUEST,"Giới hạn lượt dùng phải từ 1 trở lên hoặc để trống nếu không giới hạn");
  if(r.endsAt()!=null&&r.startsAt()!=null&&!r.endsAt().isAfter(r.startsAt()))throw new ApiException(HttpStatus.BAD_REQUEST,"Thời gian kết thúc phải sau thời gian bắt đầu");
  vouchers.findByCodeIgnoreCase(code).filter(other->id==null||!other.getId().equals(id)).ifPresent(other->{throw new ApiException(HttpStatus.CONFLICT,"Mã ưu đãi "+code+" đã tồn tại");});
  Voucher v=id==null?new Voucher():vouchers.findById(id).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy voucher"));
  v.setCode(code);v.setName(r.name().trim());v.setDiscountType(type);v.setDiscountValue(r.discountValue());v.setMinOrderAmount(r.minOrderAmount()==null?BigDecimal.ZERO:r.minOrderAmount());v.setMaxDiscount(r.maxDiscount());v.setStartsAt(r.startsAt());v.setEndsAt(r.endsAt());v.setUsageLimit(r.usageLimit());v.setActive(r.active()==null?true:r.active());if(v.getUsedCount()==null)v.setUsedCount(0);return voucherDto(vouchers.save(v));
 }
 @Transactional public void deleteVoucher(UUID id){Voucher v=vouchers.findById(id).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy voucher"));v.setActive(false);vouchers.save(v);}
 public VoucherQuoteResponse quote(String code,BigDecimal amount){Voucher v=vouchers.findByCodeIgnoreCase(code.trim()).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Mã ưu đãi không tồn tại"));BigDecimal d=discount(v,amount,true);return new VoucherQuoteResponse(v.getCode(),v.getName(),d,amount.subtract(d).max(BigDecimal.ZERO));}
 @Transactional public AppliedVoucher applyVoucher(String code,BigDecimal amount,UUID userId,UUID bookingId){if(code==null||code.isBlank())return new AppliedVoucher(null,BigDecimal.ZERO,null);Voucher v=vouchers.findByCodeForUpdate(code.trim()).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Mã ưu đãi không tồn tại"));BigDecimal d=discount(v,amount,true);v.setUsedCount(v.getUsedCount()+1);vouchers.save(v);VoucherRedemption rd=new VoucherRedemption();rd.setVoucherId(v.getId());rd.setUserId(userId);rd.setBookingId(bookingId);rd.setDiscountAmount(d);redemptions.save(rd);return new AppliedVoucher(v.getCode(),d,v.getId());}
 @Transactional public void releaseVoucher(UUID bookingId){redemptions.findByBookingId(bookingId).ifPresent(rd->{vouchers.findById(rd.getVoucherId()).ifPresent(v->{v.setUsedCount(Math.max(0,v.getUsedCount()-1));vouchers.save(v);});redemptions.delete(rd);});}
 public List<BookingConcession> buildConcessions(UUID bookingId,List<Selection> selections){if(selections==null||selections.isEmpty())return List.of();Map<UUID,Integer> qty=new LinkedHashMap<>();for(Selection s:selections){if(s==null||s.productId()==null||s.quantity()<=0)continue;if(s.quantity()>10)throw new ApiException(HttpStatus.BAD_REQUEST,"Mỗi combo tối đa 10 phần");qty.merge(s.productId(),s.quantity(),Integer::sum);}List<ConcessionProduct> found=products.findAllById(qty.keySet());if(found.size()!=qty.size())throw new ApiException(HttpStatus.BAD_REQUEST,"Có sản phẩm bắp nước không hợp lệ");Map<UUID,ConcessionProduct> map=new HashMap<>();found.forEach(p->map.put(p.getId(),p));List<BookingConcession> result=new ArrayList<>();for(var e:qty.entrySet()){ConcessionProduct p=map.get(e.getKey());if(!Boolean.TRUE.equals(p.getActive()))throw new ApiException(HttpStatus.CONFLICT,"Sản phẩm "+p.getName()+" hiện không bán");BookingConcession bc=new BookingConcession();bc.setBookingId(bookingId);bc.setProductId(p.getId());bc.setProductName(p.getName());bc.setUnitPrice(p.getPrice());bc.setQuantity(e.getValue());bc.setSubtotal(p.getPrice().multiply(BigDecimal.valueOf(e.getValue())));result.add(bc);}return result;}
 public BigDecimal total(List<BookingConcession> rows){return rows.stream().map(BookingConcession::getSubtotal).reduce(BigDecimal.ZERO,BigDecimal::add);}
 public void saveConcessions(List<BookingConcession> rows){bookingConcessions.saveAll(rows);}
 public List<BookingConcession> bookingItems(UUID bookingId){return bookingConcessions.findByBookingId(bookingId);}
 private BigDecimal discount(Voucher v,BigDecimal amount,boolean enforceUsage){Instant now=Instant.now();if(!Boolean.TRUE.equals(v.getActive()))throw new ApiException(HttpStatus.CONFLICT,"Voucher đã tạm dừng");if(v.getStartsAt()!=null&&now.isBefore(v.getStartsAt()))throw new ApiException(HttpStatus.CONFLICT,"Voucher chưa đến thời gian sử dụng");if(v.getEndsAt()!=null&&now.isAfter(v.getEndsAt()))throw new ApiException(HttpStatus.CONFLICT,"Voucher đã hết hạn");if(enforceUsage&&v.getUsageLimit()!=null&&v.getUsedCount()>=v.getUsageLimit())throw new ApiException(HttpStatus.CONFLICT,"Voucher đã hết lượt sử dụng");if(amount.compareTo(v.getMinOrderAmount())<0)throw new ApiException(HttpStatus.CONFLICT,"Đơn hàng chưa đạt giá trị tối thiểu "+v.getMinOrderAmount().toPlainString()+"đ");BigDecimal d=v.getDiscountType().equals("PERCENT")?amount.multiply(v.getDiscountValue()).divide(BigDecimal.valueOf(100),0,RoundingMode.DOWN):v.getDiscountValue();if(v.getMaxDiscount()!=null)d=d.min(v.getMaxDiscount());return d.min(amount).max(BigDecimal.ZERO);}
 private ProductResponse productDto(ConcessionProduct p){int on=p.getStockOnHand()==null?0:p.getStockOnHand();int reserved=p.getStockReserved()==null?0:p.getStockReserved();int available=Math.max(0,on-reserved);int threshold=p.getLowStockThreshold()==null?0:p.getLowStockThreshold();boolean tracked=Boolean.TRUE.equals(p.getInventoryEnabled());return new ProductResponse(p.getId(),p.getName(),p.getDescription(),p.getPrice(),p.getImageUrl(),Boolean.TRUE.equals(p.getActive()),p.getSortOrder(),tracked,on,reserved,available,threshold,tracked&&available<=threshold,tracked&&available<=0);}
 private VoucherResponse voucherDto(Voucher v){return new VoucherResponse(v.getId(),v.getCode(),v.getName(),v.getDiscountType(),v.getDiscountValue(),v.getMinOrderAmount(),v.getMaxDiscount(),v.getStartsAt(),v.getEndsAt(),v.getUsageLimit(),v.getUsedCount(),Boolean.TRUE.equals(v.getActive()));}
 private String blank(String s){return s==null||s.isBlank()?null:s.trim();}
 public record Selection(UUID productId,int quantity){}
 public record AppliedVoucher(String code,BigDecimal discount,UUID voucherId){}
}
