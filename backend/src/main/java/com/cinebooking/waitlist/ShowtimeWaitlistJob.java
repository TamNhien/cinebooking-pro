package com.cinebooking.waitlist;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class ShowtimeWaitlistJob {
    private final ShowtimeWaitlistService service;
    public ShowtimeWaitlistJob(ShowtimeWaitlistService service){this.service=service;}
    @Scheduled(fixedDelayString="${app.waitlist.scan-ms:60000}")
    public void scan(){for(var showtimeId:service.activeShowtimes()){try{service.scanShowtime(showtimeId);}catch(Exception ignored){}}}
}
