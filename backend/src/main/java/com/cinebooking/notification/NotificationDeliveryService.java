package com.cinebooking.notification;

import com.cinebooking.domain.AppUser;
import com.cinebooking.domain.UserNotification;
import com.cinebooking.user.UserRepository;
import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.util.HtmlUtils;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.UUID;

@Service
public class NotificationDeliveryService {
    private final NotificationRepository notifications;
    private final UserRepository users;
    private final JavaMailSender mailSender;
    @Value("${app.mail.enabled:false}") private boolean mailEnabled;
    @Value("${app.mail.from:no-reply@cinebooking.local}") private String mailFrom;
    @Value("${app.frontend-url:http://localhost:3000}") private String frontendUrl;

    public NotificationDeliveryService(NotificationRepository notifications, UserRepository users, ObjectProvider<JavaMailSender> mailSender){
        this.notifications=notifications; this.users=users; this.mailSender=mailSender.getIfAvailable();
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void deliverEmail(UUID notificationId){
        UserNotification n=notifications.findById(notificationId).orElse(null);
        if(n==null || !"PENDING".equals(n.getEmailStatus())) return;
        if(!mailEnabled || mailSender==null){
            n.setEmailStatus("DISABLED");
            n.setDeliveryError("SMTP chưa được bật");
            notifications.save(n);
            return;
        }
        AppUser user=users.findById(n.getUserId()).orElse(null);
        if(user==null){
            n.setEmailStatus("FAILED"); n.setDeliveryError("Không tìm thấy người nhận"); notifications.save(n); return;
        }
        try{
            MimeMessage message=mailSender.createMimeMessage();
            MimeMessageHelper helper=new MimeMessageHelper(message,false, StandardCharsets.UTF_8.name());
            helper.setFrom(mailFrom); helper.setTo(user.getEmail()); helper.setSubject("CineBooking - "+n.getTitle());
            String link=n.getLinkUrl()==null||n.getLinkUrl().isBlank()?null:absolute(n.getLinkUrl());
            String action=link==null?"":"<p style=\"margin:26px 0\"><a href=\""+HtmlUtils.htmlEscape(link)+"\" style=\"display:inline-block;background:#f43f5e;color:white;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:10px\">Mở CineBooking</a></p>";
            String html="""
                <!doctype html><html lang="vi"><body style="margin:0;background:#0f172a;font-family:Arial,Helvetica,sans-serif;color:#e2e8f0">
                <div style="max-width:620px;margin:32px auto;padding:0 16px"><div style="background:#111827;border:1px solid #334155;border-radius:18px;padding:28px">
                <div style="font-size:20px;font-weight:800;color:#fb7185;margin-bottom:18px">CineBooking Pro</div>
                <p style="color:#94a3b8;margin:0 0 8px">Xin chào <strong style="color:#fff">%s</strong>,</p>
                <h1 style="font-size:24px;margin:0 0 14px;color:#fff">%s</h1>
                <p style="font-size:15px;line-height:1.7;color:#cbd5e1">%s</p>%s
                <p style="font-size:12px;color:#64748b;margin-top:26px">Bạn nhận email này theo tùy chọn Thông báo của tài khoản CineBooking.</p>
                </div></div></body></html>
                """.formatted(HtmlUtils.htmlEscape(user.getFullName()),HtmlUtils.htmlEscape(n.getTitle()),HtmlUtils.htmlEscape(n.getMessage()),action);
            helper.setText(html,true); mailSender.send(message);
            n.setEmailStatus("SENT"); n.setEmailSentAt(Instant.now()); n.setDeliveryError(null);
        }catch(Exception ex){
            n.setEmailStatus("FAILED");
            String text=ex.getMessage()==null?ex.getClass().getSimpleName():ex.getMessage();
            n.setDeliveryError(text.length()>300?text.substring(0,300):text);
        }
        notifications.save(n);
    }

    private String absolute(String link){
        if(link.startsWith("http://")||link.startsWith("https://")) return link;
        String base=frontendUrl==null?"":frontendUrl.replaceAll("/$","");
        return base+(link.startsWith("/")?link:"/"+link);
    }
}
