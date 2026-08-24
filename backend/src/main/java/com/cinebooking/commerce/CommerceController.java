package com.cinebooking.commerce;
import com.cinebooking.user.UserRepository;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.*;
import static com.cinebooking.commerce.CommerceDtos.*;
@RestController @RequestMapping("/api/commerce")
public class CommerceController {
 private final CommerceService service; private final UserRepository users;
 public CommerceController(CommerceService s,UserRepository users){service=s;this.users=users;}
 @GetMapping("/products") public List<ProductResponse> products(@RequestParam(required=false) UUID cinemaId){return service.publicProducts(cinemaId);}
 @GetMapping("/vouchers") public List<VoucherResponse> vouchers(){return service.publicVouchers();}
 @PostMapping("/vouchers/quote") public VoucherQuoteResponse quote(@RequestBody VoucherQuoteRequest r,Authentication a){UUID uid=a==null?null:users.findByEmailIgnoreCase(a.getName()).map(x->x.getId()).orElse(null);return service.quote(r.code(),r.orderAmount(),uid);}
}
