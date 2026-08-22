package com.cinebooking.websocket;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import java.time.Instant;
import java.util.UUID;

@Component
public class StaffOperationsEventPublisher {
    public static final String CHANNEL="cinebooking:staff-operations-events";
    private final StringRedisTemplate redis;
    public StaffOperationsEventPublisher(StringRedisTemplate redis){this.redis=redis;}

    public void publish(UUID cinemaId,String type){
        if(cinemaId==null||type==null||type.isBlank())return;
        Runnable send=()->redis.convertAndSend(CHANNEL,type+"|"+cinemaId+"|"+Instant.now());
        if(TransactionSynchronizationManager.isActualTransactionActive()&&TransactionSynchronizationManager.isSynchronizationActive()){
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization(){@Override public void afterCommit(){send.run();}});
        }else send.run();
    }
}
