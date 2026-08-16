package com.cinebooking.config;

import com.cinebooking.websocket.RedisSeatEventSubscriber;
import com.cinebooking.websocket.SeatEventPublisher;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.listener.ChannelTopic;
import org.springframework.data.redis.listener.RedisMessageListenerContainer;

@Configuration
public class RedisPubSubConfig {
    @Bean
    RedisMessageListenerContainer redisMessageListenerContainer(RedisConnectionFactory connectionFactory,
                                                                RedisSeatEventSubscriber subscriber) {
        RedisMessageListenerContainer c = new RedisMessageListenerContainer();
        c.setConnectionFactory(connectionFactory);
        c.addMessageListener(subscriber, new ChannelTopic(SeatEventPublisher.CHANNEL));
        return c;
    }
}
