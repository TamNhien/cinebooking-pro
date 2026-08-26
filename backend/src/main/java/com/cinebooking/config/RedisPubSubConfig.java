package com.cinebooking.config;

import com.cinebooking.websocket.RedisSeatEventSubscriber;
import com.cinebooking.websocket.RedisStaffOperationsEventSubscriber;
import com.cinebooking.websocket.SeatEventPublisher;
import com.cinebooking.websocket.StaffOperationsEventPublisher;
import com.cinebooking.websocket.OperationsSignalPublisher;
import com.cinebooking.websocket.RedisOperationsControlEventSubscriber;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.listener.ChannelTopic;
import org.springframework.data.redis.listener.RedisMessageListenerContainer;

@Configuration
public class RedisPubSubConfig {
    @Bean
    RedisMessageListenerContainer redisMessageListenerContainer(RedisConnectionFactory connectionFactory,
                                                                RedisSeatEventSubscriber subscriber,
                                                                RedisStaffOperationsEventSubscriber staffOperationsSubscriber,
                                                                RedisOperationsControlEventSubscriber operationsControlSubscriber) {
        RedisMessageListenerContainer c = new RedisMessageListenerContainer();
        c.setConnectionFactory(connectionFactory);
        c.addMessageListener(subscriber, new ChannelTopic(SeatEventPublisher.CHANNEL));
        c.addMessageListener(staffOperationsSubscriber, new ChannelTopic(StaffOperationsEventPublisher.CHANNEL));
        c.addMessageListener(operationsControlSubscriber, new ChannelTopic(OperationsSignalPublisher.CHANNEL));
        return c;
    }
}
