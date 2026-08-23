package com.cinebooking.payment;

import com.cinebooking.domain.PaymentEvent;
import org.springframework.stereotype.Service;
import java.util.*;

@Service
public class PaymentEventService {
    private final PaymentEventRepository events;
    public PaymentEventService(PaymentEventRepository events){this.events=events;}

    public PaymentEvent record(UUID paymentId,String eventType,String actorType,String actorRef,String fromStatus,String toStatus,String code,String message,String detailsJson){
        PaymentEvent e=new PaymentEvent();
        e.setPaymentId(paymentId);e.setEventType(eventType);e.setActorType(actorType);e.setActorRef(actorRef);
        e.setFromStatus(fromStatus);e.setToStatus(toStatus);e.setCode(code);e.setMessage(message);e.setDetailsJson(detailsJson);
        return events.save(e);
    }

    public List<PaymentEvent> timeline(UUID paymentId){return events.findByPaymentIdOrderByCreatedAtAsc(paymentId);}
}
