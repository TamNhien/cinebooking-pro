package com.cinebooking.commerce;
import org.springframework.web.bind.annotation.*; import java.util.*; import static com.cinebooking.commerce.CommerceDtos.*;
@RestController @RequestMapping("/api/commerce")
public class CommerceController { private final CommerceService service; public CommerceController(CommerceService s){service=s;} @GetMapping("/products") public List<ProductResponse> products(){return service.publicProducts();} @GetMapping("/vouchers") public List<VoucherResponse> vouchers(){return service.publicVouchers();} @PostMapping("/vouchers/quote") public VoucherQuoteResponse quote(@RequestBody VoucherQuoteRequest r){return service.quote(r.code(),r.orderAmount());} }
