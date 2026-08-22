package com.cinebooking.websocket;

import org.springframework.data.redis.connection.Message;
import org.springframework.data.redis.connection.MessageListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.UUID;

@Component
public class RedisStaffOperationsEventSubscriber implements MessageListener {
    private final SimpMessagingTemplate messaging;
    public RedisStaffOperationsEventSubscriber(SimpMessagingTemplate messaging){this.messaging=messaging;}
    @Override public void onMessage(Message message,byte[] pattern){
        try{
            String[] p=new String(message.getBody(),StandardCharsets.UTF_8).split("\\|",-1);
            if(p.length<3)return;
            UUID cinemaId=UUID.fromString(p[1]);
            Event event=new Event(p[0],cinemaId,Instant.parse(p[2]));
            messaging.convertAndSend("/topic/staff-operations/"+cinemaId,event);
        }catch(RuntimeException ignored){}
    }
    public record Event(String type,UUID cinemaId,Instant at){}
}
