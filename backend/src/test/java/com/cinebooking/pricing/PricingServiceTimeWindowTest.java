package com.cinebooking.pricing;

import org.junit.jupiter.api.Test;
import java.time.LocalTime;
import static org.junit.jupiter.api.Assertions.*;

class PricingServiceTimeWindowTest {
    @Test void normalWindow(){
        assertTrue(PricingService.inTimeWindow(LocalTime.of(20,0),LocalTime.of(18,0),LocalTime.of(23,0)));
        assertFalse(PricingService.inTimeWindow(LocalTime.of(23,0),LocalTime.of(18,0),LocalTime.of(23,0)));
        assertFalse(PricingService.inTimeWindow(LocalTime.of(17,59),LocalTime.of(18,0),LocalTime.of(23,0)));
    }
    @Test void crossMidnightWindow(){
        assertTrue(PricingService.inTimeWindow(LocalTime.of(20,0),LocalTime.of(20,0),LocalTime.of(2,0)));
        assertTrue(PricingService.inTimeWindow(LocalTime.of(1,59),LocalTime.of(20,0),LocalTime.of(2,0)));
        assertFalse(PricingService.inTimeWindow(LocalTime.of(2,0),LocalTime.of(20,0),LocalTime.of(2,0)));
        assertFalse(PricingService.inTimeWindow(LocalTime.of(12,0),LocalTime.of(20,0),LocalTime.of(2,0)));
    }
}
