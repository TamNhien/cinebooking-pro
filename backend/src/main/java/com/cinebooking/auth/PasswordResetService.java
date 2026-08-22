package com.cinebooking.auth;

import com.cinebooking.common.ApiException;
import com.cinebooking.domain.AppUser;
import com.cinebooking.domain.PasswordResetToken;
import com.cinebooking.user.PasswordResetTokenRepository;
import com.cinebooking.user.UserRepository;
import com.cinebooking.security.SecurityProtectionService;
import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.util.HtmlUtils;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;

import static com.cinebooking.auth.PasswordResetDtos.*;

@Service
public class PasswordResetService {
    private final UserRepository users;
    private final PasswordResetTokenRepository tokens;
    private final PasswordEncoder encoder;
    private final JavaMailSender mailSender;
    private final SecureRandom random = new SecureRandom();
    private final AuthSessionService sessions;
    private final SecurityProtectionService protection;

    @Value("${app.frontend-url}") private String frontendUrl;
    @Value("${app.auth.reset-token-minutes:30}") private long ttlMinutes;
    @Value("${app.auth.dev-reset-link:false}") private boolean devResetLink;
    @Value("${app.mail.enabled:false}") private boolean mailEnabled;
    @Value("${app.mail.from:no-reply@cinebooking.local}") private String mailFrom;

    public PasswordResetService(
            UserRepository users,
            PasswordResetTokenRepository tokens,
            PasswordEncoder encoder,
            ObjectProvider<JavaMailSender> mailSender,
            AuthSessionService sessions,
            SecurityProtectionService protection
    ) {
        this.users = users;
        this.tokens = tokens;
        this.encoder = encoder;
        this.mailSender = mailSender.getIfAvailable();
        this.sessions = sessions;
        this.protection = protection;
    }

    @Transactional
    public ForgotPasswordResponse forgot(ForgotPasswordRequest req) {
        String generic = "Nếu email tồn tại, CineBooking đã gửi liên kết đặt lại mật khẩu. Vui lòng kiểm tra Hộp thư đến và Spam.";
        AppUser user = users.findByEmailIgnoreCase(req.email().trim()).orElse(null);
        if (user == null) return new ForgotPasswordResponse(generic, null);

        tokens.deleteByUserId(user.getId());
        String raw = generateToken();
        PasswordResetToken token = new PasswordResetToken();
        token.setUserId(user.getId());
        token.setTokenHash(hash(raw));
        token.setExpiresAt(Instant.now().plusSeconds(ttlMinutes * 60));
        tokens.save(token);

        String url = frontendUrl.replaceAll("/$", "") + "/reset-password?token=" + raw;

        if (mailEnabled) {
            if (mailSender == null) {
                throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "Dịch vụ email chưa được cấu hình");
            }
            try {
                sendMail(user, url);
            } catch (MailException ex) {
                throw new ApiException(HttpStatus.BAD_GATEWAY, "Không thể gửi email đặt lại mật khẩu. Hãy kiểm tra cấu hình SMTP.");
            } catch (Exception ex) {
                throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Không thể tạo email đặt lại mật khẩu");
            }
        }

        return new ForgotPasswordResponse(generic, devResetLink ? url : null);
    }

    @Transactional
    public void reset(ResetPasswordRequest req) {
        PasswordResetToken token = tokens.findByTokenHash(hash(req.token()))
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Liên kết đặt lại mật khẩu không hợp lệ"));
        if (token.getUsedAt() != null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Liên kết đặt lại mật khẩu đã được sử dụng");
        }
        if (token.getExpiresAt().isBefore(Instant.now())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Liên kết đặt lại mật khẩu đã hết hạn");
        }

        AppUser user = users.findById(token.getUserId())
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Tài khoản không còn tồn tại"));
        if (encoder.matches(req.newPassword(), user.getPasswordHash())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Mật khẩu mới phải khác mật khẩu hiện tại");
        }

        user.setPasswordHash(encoder.encode(req.newPassword()));
        users.save(user);
        token.setUsedAt(Instant.now());
        tokens.save(token);
        sessions.revokeAllForUser(user.getId(), "PASSWORD_RESET", user.getEmail());
        protection.passwordChanged(user.getId(), true);
    }

    private void sendMail(AppUser user, String url) throws Exception {
        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, false, StandardCharsets.UTF_8.name());
        helper.setFrom(mailFrom);
        helper.setTo(user.getEmail());
        helper.setSubject("CineBooking - Đặt lại mật khẩu");

        String safeName = HtmlUtils.htmlEscape(user.getFullName());
        String safeUrl = HtmlUtils.htmlEscape(url);
        String html = """
                <!doctype html>
                <html lang="vi">
                <body style="margin:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#0f172a">
                  <div style="max-width:600px;margin:32px auto;padding:0 16px">
                    <div style="background:#ffffff;border-radius:18px;padding:32px;border:1px solid #e2e8f0">
                      <div style="font-size:20px;font-weight:800;color:#e11d48;margin-bottom:20px">CineBooking Pro</div>
                      <h1 style="font-size:24px;margin:0 0 16px">Đặt lại mật khẩu</h1>
                      <p style="line-height:1.6">Xin chào %s,</p>
                      <p style="line-height:1.6">Bạn vừa yêu cầu đặt lại mật khẩu cho tài khoản CineBooking. Liên kết dưới đây có hiệu lực trong <strong>%d phút</strong>.</p>
                      <p style="margin:28px 0">
                        <a href="%s" style="display:inline-block;background:#f43f5e;color:#ffffff;text-decoration:none;font-weight:700;padding:13px 20px;border-radius:10px">Đặt lại mật khẩu</a>
                      </p>
                      <p style="font-size:13px;color:#64748b;line-height:1.6">Nếu nút không hoạt động, hãy sao chép liên kết sau vào trình duyệt:</p>
                      <p style="font-size:13px;word-break:break-all;color:#475569">%s</p>
                      <hr style="border:0;border-top:1px solid #e2e8f0;margin:28px 0">
                      <p style="font-size:13px;color:#64748b;line-height:1.6">Nếu bạn không yêu cầu thay đổi mật khẩu, hãy bỏ qua email này. Liên kết chỉ sử dụng được một lần.</p>
                    </div>
                  </div>
                </body>
                </html>
                """.formatted(safeName, ttlMinutes, safeUrl, safeUrl);

        helper.setText(html, true);
        mailSender.send(message);
    }

    private String generateToken() {
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String hash(String raw) {
        try {
            return java.util.HexFormat.of().formatHex(
                    MessageDigest.getInstance("SHA-256").digest(raw.getBytes(StandardCharsets.UTF_8))
            );
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }
}
