import java.security.*;
import java.security.interfaces.*;
import java.security.spec.ECGenParameterSpec;
import java.util.Base64;
import java.math.BigInteger;

public class VapidKeyGenerator {
    private static final Base64.Encoder B64=Base64.getUrlEncoder().withoutPadding();
    public static void main(String[] args) throws Exception {
        KeyPairGenerator generator=KeyPairGenerator.getInstance("EC");
        generator.initialize(new ECGenParameterSpec("secp256r1"));
        KeyPair pair=generator.generateKeyPair();
        ECPublicKey pub=(ECPublicKey)pair.getPublic();
        ECPrivateKey priv=(ECPrivateKey)pair.getPrivate();
        byte[] publicRaw=new byte[65];publicRaw[0]=4;
        System.arraycopy(fixed(pub.getW().getAffineX(),32),0,publicRaw,1,32);
        System.arraycopy(fixed(pub.getW().getAffineY(),32),0,publicRaw,33,32);
        byte[] privateRaw=fixed(priv.getS(),32);
        System.out.println("WEB_PUSH_VAPID_PUBLIC_KEY="+B64.encodeToString(publicRaw));
        System.out.println("WEB_PUSH_VAPID_PRIVATE_KEY="+B64.encodeToString(privateRaw));
    }
    private static byte[] fixed(BigInteger value,int size){
        byte[] raw=value.toByteArray();int start=raw.length>size?raw.length-size:0;byte[] out=new byte[size];
        System.arraycopy(raw,start,out,size-(raw.length-start),raw.length-start);return out;
    }
}
