package com.cinebooking;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class CineBookingApplication {
    public static void main(String[] args) {
        SpringApplication.run(CineBookingApplication.class, args);
    }
}
