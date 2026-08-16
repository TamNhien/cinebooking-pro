package com.cinebooking.operations;

import com.cinebooking.common.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Value;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Base64;
import java.util.UUID;

@Service
public class TicketTokenService {
    private final byte[] secret;
    public TicketTokenService(@Value("${app.jwt.secret}") String secret){this.secret=secret.getBytes(StandardCharsets.UTF_8);}
    public String create(UUID bookingId,UUID showtimeId){String data="ticket:v1|"+bookingId+"|"+showtimeId;return "CINEBOOKING|V1|"+bookingId+"|"+showtimeId+"|"+sign(data);}

    /** Accepts either the signed raw payload or a V11 check-in URL containing ?ticket=. */
    public String normalize(String value){
        if(value==null) throw bad();
        String v=value.trim();
        if(v.startsWith("CINEBOOKING|")) return v;
        try{
            URI uri=URI.create(v);
            String q=uri.getRawQuery();
            if(q==null) throw bad();
            for(String pair:q.split("&")){
                int eq=pair.indexOf('=');
                String key=URLDecoder.decode(eq<0?pair:pair.substring(0,eq),StandardCharsets.UTF_8);
                if("ticket".equals(key)){
                    String raw=eq<0?"":pair.substring(eq+1);
                    String decoded=URLDecoder.decode(raw,StandardCharsets.UTF_8);
                    if(decoded.startsWith("CINEBOOKING|")) return decoded;
                }
            }
        }catch(ApiException e){throw e;}catch(Exception ignored){}
        throw bad();
    }

    public Parsed verify(String value){
        String payload=normalize(value);
        try{
            String[] p=payload.split("\\|"); if(p.length!=5||!"CINEBOOKING".equals(p[0])||!"V1".equals(p[1])) throw bad();
            UUID booking=UUID.fromString(p[2]), showtime=UUID.fromString(p[3]);
            byte[] expected=Base64.getUrlDecoder().decode(sign("ticket:v1|"+booking+"|"+showtime)); byte[] actual=Base64.getUrlDecoder().decode(p[4]);
            if(!MessageDigest.isEqual(expected,actual))throw bad(); return new Parsed(booking,showtime);
        }catch(ApiException e){throw e;}catch(Exception e){throw bad();}
    }
    private String sign(String s){try{Mac m=Mac.getInstance("HmacSHA256");m.init(new SecretKeySpec(secret,"HmacSHA256"));return Base64.getUrlEncoder().withoutPadding().encodeToString(m.doFinal(s.getBytes(StandardCharsets.UTF_8)));}catch(Exception e){throw new IllegalStateException(e);}}
    private ApiException bad(){return new ApiException(HttpStatus.BAD_REQUEST,"QR vé không hợp lệ hoặc đã bị thay đổi");}
    public record Parsed(UUID bookingId,UUID showtimeId){}
}
