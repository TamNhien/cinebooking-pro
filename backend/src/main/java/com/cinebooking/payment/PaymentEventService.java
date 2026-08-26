package com.cinebooking.payment;

import com.cinebooking.domain.PaymentEvent;
import org.springframework.stereotype.Service;
import com.cinebooking.websocket.OperationsSignalPublisher;
import java.util.*;

@Service
public class PaymentEventService {
    private final PaymentEventRepository events;
    private final OperationsSignalPublisher operationsSignals;
    public PaymentEventService(PaymentEventRepository events, OperationsSignalPublisher operationsSignals){this.events=events;this.operationsSignals=operationsSignals;}

    public PaymentEvent record(UUID paymentId,String eventType,String actorType,String actorRef,String fromStatus,String toStatus,String code,String message,String detailsJson){
        PaymentEvent e=new PaymentEvent();
        e.setPaymentId(paymentId);e.setEventType(eventType);e.setActorType(actorType);e.setActorRef(actorRef);
        e.setFromStatus(fromStatus);e.setToStatus(toStatus);e.setCode(code);e.setMessage(message);e.setDetailsJson(detailsJson);
        PaymentEvent saved=events.save(e);
        operationsSignals.publish("PAYMENT:"+eventType);
        return saved;
    }

    public List<PaymentEvent> timeline(UUID paymentId){return events.findByPaymentIdOrderByCreatedAtAsc(paymentId);}
}
