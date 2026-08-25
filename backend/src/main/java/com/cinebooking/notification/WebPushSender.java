package com.cinebooking.notification;

import com.cinebooking.domain.PwaDevice;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Cipher;
import javax.crypto.KeyAgreement;
import javax.crypto.Mac;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.io.ByteArrayOutputStream;
import java.math.BigInteger;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.security.interfaces.ECPublicKey;
import java.security.spec.*;
import java.time.Duration;
import java.time.Instant;
import java.util.*;

@Component
public class WebPushSender {
    private static final Base64.Decoder B64U_DEC=Base64.getUrlDecoder();
    private static final Base64.Encoder B64U=Base64.getUrlEncoder().withoutPadding();
    private static final byte[] KEY_INFO_PREFIX="WebPush: info\0".getBytes(StandardCharsets.US_ASCII);
    private static final byte[] CEK_INFO="Content-Encoding: aes128gcm\0".getBytes(StandardCharsets.US_ASCII);
    private static final byte[] NONCE_INFO="Content-Encoding: nonce\0".getBytes(StandardCharsets.US_ASCII);
    private static final int RECORD_SIZE=4096;
    private static final SecureRandom RANDOM=new SecureRandom();

    private final PwaDeviceService config;
    private final HttpClient client;
    private final String subject;

    public WebPushSender(PwaDeviceService config,@Value("${app.pwa.web-push.subject:mailto:admin@cinebooking.local}") String subject){
        this.config=config;this.subject=subject==null||subject.isBlank()?"mailto:admin@cinebooking.local":subject.trim();
        this.client=HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).followRedirects(HttpClient.Redirect.NEVER).build();
    }

    public DeliveryResult send(PwaDevice device,String payload){
        if(!config.webPushReady())return new DeliveryResult(false,false,0,"Web Push chưa được cấu hình");
        if(device.getPushEndpoint()==null||device.getP256dh()==null||device.getAuthSecret()==null)return new DeliveryResult(false,false,0,"Thiếu PushSubscription");
        try{
            URI endpoint=URI.create(device.getPushEndpoint());
            Encrypted encrypted=encrypt(device.getP256dh(),device.getAuthSecret(),payload);
            String authorization=vapidAuthorization(endpoint);
            HttpRequest request=HttpRequest.newBuilder(endpoint)
                    .timeout(Duration.ofSeconds(8))
                    .header("Content-Type","application/octet-stream")
                    .header("Content-Encoding","aes128gcm")
                    .header("TTL",Integer.toString(config.ttlSeconds()))
                    .header("Urgency","normal")
                    .header("Authorization",authorization)
                    .POST(HttpRequest.BodyPublishers.ofByteArray(encrypted.body()))
                    .build();
            HttpResponse<Void> response=client.send(request,HttpResponse.BodyHandlers.discarding());
            int status=response.statusCode();
            boolean success=status>=200&&status<300;
            boolean gone=status==404||status==410;
            return new DeliveryResult(success,gone,status,success?"OK":"Push service HTTP "+status);
        }catch(Exception ex){
            String message=ex.getMessage()==null?ex.getClass().getSimpleName():ex.getMessage();
            return new DeliveryResult(false,false,0,message.length()>240?message.substring(0,240):message);
        }
    }

    private Encrypted encrypt(String p256dh,String authSecret,String payload) throws Exception{
        byte[] clientPublicRaw=decodeUrl(p256dh);
        if(clientPublicRaw.length!=65||clientPublicRaw[0]!=4)throw new GeneralSecurityException("p256dh không phải P-256 uncompressed key");
        PublicKey clientPublic=publicKey(clientPublicRaw);

        KeyPairGenerator kpg=KeyPairGenerator.getInstance("EC");
        kpg.initialize(new ECGenParameterSpec("secp256r1"),RANDOM);
        KeyPair local=kpg.generateKeyPair();
        byte[] localPublicRaw=encodePublic((ECPublicKey)local.getPublic());

        KeyAgreement agreement=KeyAgreement.getInstance("ECDH");
        agreement.init(local.getPrivate());agreement.doPhase(clientPublic,true);
        byte[] shared=agreement.generateSecret();
        byte[] auth=decodeUrl(authSecret);
        byte[] prkKey=hkdfExtract(auth,shared);
        byte[] ikm=hkdfExpand(prkKey,concat(KEY_INFO_PREFIX,clientPublicRaw,localPublicRaw),32);

        byte[] salt=new byte[16];RANDOM.nextBytes(salt);
        byte[] prk=hkdfExtract(salt,ikm);
        byte[] cek=hkdfExpand(prk,CEK_INFO,16);
        byte[] nonce=hkdfExpand(prk,NONCE_INFO,12);

        byte[] data=payload.getBytes(StandardCharsets.UTF_8);
        if(data.length>3500)throw new IllegalArgumentException("Push payload quá lớn");
        byte[] plain=Arrays.copyOf(data,data.length+1);plain[plain.length-1]=0x02;
        Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.ENCRYPT_MODE,new SecretKeySpec(cek,"AES"),new GCMParameterSpec(128,nonce));
        byte[] ciphertext=cipher.doFinal(plain);

        ByteArrayOutputStream out=new ByteArrayOutputStream();
        out.write(salt);
        out.write(ByteBuffer.allocate(4).putInt(RECORD_SIZE).array());
        out.write(localPublicRaw.length);
        out.write(localPublicRaw);
        out.write(ciphertext);
        return new Encrypted(out.toByteArray());
    }

    private String vapidAuthorization(URI endpoint) throws Exception{
        byte[] publicRaw=decodeUrl(config.vapidPublicKey());
        byte[] privateRaw=decodeUrl(config.vapidPrivateKey());
        if(publicRaw.length!=65||publicRaw[0]!=4)throw new GeneralSecurityException("VAPID public key phải là P-256 uncompressed 65-byte");
        if(privateRaw.length!=32)throw new GeneralSecurityException("VAPID private key phải là P-256 scalar 32-byte");
        PrivateKey privateKey=privateKey(privateRaw);
        String audience=endpoint.getScheme()+"://"+endpoint.getAuthority();
        long exp=Instant.now().plusSeconds(12*3600L).getEpochSecond();
        String header=b64("{\"typ\":\"JWT\",\"alg\":\"ES256\"}");
        String claims=b64("{\"aud\":\""+json(audience)+"\",\"exp\":"+exp+",\"sub\":\""+json(subject)+"\"}");
        String signingInput=header+"."+claims;
        Signature signature=Signature.getInstance("SHA256withECDSA");
        signature.initSign(privateKey);signature.update(signingInput.getBytes(StandardCharsets.US_ASCII));
        String jwt=signingInput+"."+B64U.encodeToString(derToJose(signature.sign()));
        return "vapid t="+jwt+", k="+B64U.encodeToString(publicRaw);
    }

    private static PublicKey publicKey(byte[] raw) throws Exception{
        ECParameterSpec spec=ecSpec();
        BigInteger x=new BigInteger(1,Arrays.copyOfRange(raw,1,33));
        BigInteger y=new BigInteger(1,Arrays.copyOfRange(raw,33,65));
        return KeyFactory.getInstance("EC").generatePublic(new ECPublicKeySpec(new ECPoint(x,y),spec));
    }
    private static PrivateKey privateKey(byte[] raw) throws Exception{return KeyFactory.getInstance("EC").generatePrivate(new ECPrivateKeySpec(new BigInteger(1,raw),ecSpec()));}
    private static ECParameterSpec ecSpec() throws Exception{
        AlgorithmParameters parameters=AlgorithmParameters.getInstance("EC");parameters.init(new ECGenParameterSpec("secp256r1"));return parameters.getParameterSpec(ECParameterSpec.class);
    }
    private static byte[] encodePublic(ECPublicKey key){
        byte[] x=fixed(key.getW().getAffineX(),32),y=fixed(key.getW().getAffineY(),32);byte[] out=new byte[65];out[0]=4;System.arraycopy(x,0,out,1,32);System.arraycopy(y,0,out,33,32);return out;
    }
    private static byte[] fixed(BigInteger value,int size){byte[] raw=value.toByteArray();int start=raw.length>size?raw.length-size:0;byte[] out=new byte[size];System.arraycopy(raw,start,out,size-(raw.length-start),raw.length-start);return out;}
    private static byte[] hkdfExtract(byte[] salt,byte[] ikm) throws Exception{Mac mac=Mac.getInstance("HmacSHA256");mac.init(new SecretKeySpec(salt,"HmacSHA256"));return mac.doFinal(ikm);}
    private static byte[] hkdfExpand(byte[] prk,byte[] info,int length) throws Exception{
        Mac mac=Mac.getInstance("HmacSHA256");mac.init(new SecretKeySpec(prk,"HmacSHA256"));ByteArrayOutputStream out=new ByteArrayOutputStream();byte[] previous=new byte[0];int counter=1;
        while(out.size()<length){mac.reset();mac.update(previous);mac.update(info);mac.update((byte)counter++);previous=mac.doFinal();out.write(previous);}
        return Arrays.copyOf(out.toByteArray(),length);
    }
    private static byte[] derToJose(byte[] der) throws GeneralSecurityException{
        int[] p={0};if((der[p[0]++]&0xff)!=0x30)throw new GeneralSecurityException("ECDSA DER sequence invalid");readLength(der,p);
        if((der[p[0]++]&0xff)!=0x02)throw new GeneralSecurityException("ECDSA R invalid");int rLen=readLength(der,p);byte[] r=Arrays.copyOfRange(der,p[0],p[0]+rLen);p[0]+=rLen;
        if((der[p[0]++]&0xff)!=0x02)throw new GeneralSecurityException("ECDSA S invalid");int sLen=readLength(der,p);byte[] s=Arrays.copyOfRange(der,p[0],p[0]+sLen);
        byte[] out=new byte[64];copyInteger(r,out,0);copyInteger(s,out,32);return out;
    }
    private static int readLength(byte[] der,int[] p) throws GeneralSecurityException{if(p[0]>=der.length)throw new GeneralSecurityException("DER length missing");int b=der[p[0]++]&0xff;if((b&0x80)==0)return b;int n=b&0x7f;if(n<1||n>2||p[0]+n>der.length)throw new GeneralSecurityException("DER length invalid");int len=0;for(int i=0;i<n;i++)len=(len<<8)|(der[p[0]++]&0xff);return len;}
    private static void copyInteger(byte[] integer,byte[] out,int offset) throws GeneralSecurityException{int start=0;while(start<integer.length-1&&integer[start]==0)start++;int len=integer.length-start;if(len>32)throw new GeneralSecurityException("ECDSA integer too large");System.arraycopy(integer,start,out,offset+32-len,len);}
    private static byte[] concat(byte[]...arrays){int length=0;for(byte[] a:arrays)length+=a.length;byte[] out=new byte[length];int offset=0;for(byte[] a:arrays){System.arraycopy(a,0,out,offset,a.length);offset+=a.length;}return out;}
    private static byte[] decodeUrl(String value){return B64U_DEC.decode(value.trim());}
    private static String b64(String value){return B64U.encodeToString(value.getBytes(StandardCharsets.UTF_8));}
    private static String json(String value){return value.replace("\\","\\\\").replace("\"","\\\"").replace("\n","\\n").replace("\r","\\r");}

    private record Encrypted(byte[] body){}
    public record DeliveryResult(boolean success,boolean gone,int status,String message){}
}
