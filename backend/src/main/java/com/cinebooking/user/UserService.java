package com.cinebooking.user;

import com.cinebooking.auth.AuthSessionService;
import com.cinebooking.common.ApiException;
import com.cinebooking.common.PasswordPolicy;
import com.cinebooking.security.SecurityProtectionService;
import com.cinebooking.domain.AppUser;
import com.cinebooking.domain.Role;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;
import java.util.UUID;

import static com.cinebooking.user.UserDtos.*;

@Service
public class UserService {
    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final AuthSessionService sessions;
    private final SecurityProtectionService protection;
    public UserService(UserRepository users, PasswordEncoder encoder, AuthSessionService sessions, SecurityProtectionService protection){this.users=users;this.encoder=encoder;this.sessions=sessions;this.protection=protection;}

    public UserResponse me(String email){return dto(findByEmail(email));}

    @Transactional
    public UserResponse updateMe(String email, UpdateProfileRequest req){
        AppUser u=findByEmail(email); u.setFullName(req.fullName().trim()); u.setPhone(clean(req.phone()));
        if(req.birthDate()!=null){
            if(req.birthDate().isAfter(java.time.LocalDate.now(java.time.ZoneId.of("Asia/Ho_Chi_Minh")))||req.birthDate().isBefore(java.time.LocalDate.of(1900,1,1)))throw new ApiException(HttpStatus.BAD_REQUEST,"Ngày sinh không hợp lệ");
            if(u.getBirthDate()!=null&&!u.getBirthDate().equals(req.birthDate()))throw new ApiException(HttpStatus.CONFLICT,"Ngày sinh chỉ được tự thiết lập một lần. Hãy liên hệ quản trị viên nếu cần chỉnh sửa.");
            if(u.getBirthDate()==null)u.setBirthDate(req.birthDate());
        }
        return dto(users.save(u));
    }

    @Transactional
    public void changePassword(String email, ChangePasswordRequest req, UUID currentSessionId){
        AppUser u=findByEmail(email);
        if(!encoder.matches(req.currentPassword(),u.getPasswordHash())) throw new ApiException(HttpStatus.BAD_REQUEST,"Mật khẩu hiện tại không đúng");
        if(encoder.matches(req.newPassword(),u.getPasswordHash())) throw new ApiException(HttpStatus.BAD_REQUEST,"Mật khẩu mới phải khác mật khẩu hiện tại");
        u.setPasswordHash(encoder.encode(req.newPassword())); users.save(u);
        sessions.revokeAllExcept(u.getId(), currentSessionId, "PASSWORD_CHANGED", email);
        protection.passwordChanged(u.getId(), false);
    }

    public List<UserResponse> adminList(){return users.findAllByOrderByCreatedAtDesc().stream().filter(u->u.getRole()==Role.USER||u.getRole()==Role.ADMIN).map(this::dto).toList();}

    @Transactional
    public UserResponse adminCreate(AdminCreateUserRequest req){
        String email=req.email().trim().toLowerCase(Locale.ROOT);
        if(users.existsByEmailIgnoreCase(email)) throw new ApiException(HttpStatus.CONFLICT,"Email đã tồn tại");
        AppUser u=new AppUser(); u.setEmail(email); u.setFullName(req.fullName().trim()); u.setPhone(clean(req.phone()));
        u.setPasswordHash(encoder.encode(req.password())); u.setRole(parseGeneralRole(req.role())); return dto(users.save(u));
    }

    @Transactional
    public UserResponse adminUpdate(UUID id, AdminUpdateUserRequest req, String currentAdminEmail){
        AppUser u=users.findById(id).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy người dùng"));
        String email=req.email().trim().toLowerCase(Locale.ROOT);
        users.findByEmailIgnoreCase(email).filter(other->!other.getId().equals(id)).ifPresent(other->{throw new ApiException(HttpStatus.CONFLICT,"Email đã tồn tại");});
        if(u.getEmail().equalsIgnoreCase(currentAdminEmail) && parseGeneralRole(req.role())!=Role.ADMIN)
            throw new ApiException(HttpStatus.BAD_REQUEST,"Không thể tự hạ quyền tài khoản admin đang đăng nhập");
        u.setEmail(email);u.setFullName(req.fullName().trim());u.setPhone(clean(req.phone()));u.setRole(parseGeneralRole(req.role()));
        if(req.newPassword()!=null&&!req.newPassword().isBlank()) {
            if(!PasswordPolicy.isValid(req.newPassword())) throw new ApiException(HttpStatus.BAD_REQUEST, PasswordPolicy.MESSAGE);
            u.setPasswordHash(encoder.encode(req.newPassword()));
            sessions.revokeAllForUser(u.getId(), "ADMIN_PASSWORD_RESET", currentAdminEmail);
        }
        return dto(users.save(u));
    }

    @Transactional
    public void adminDelete(UUID id, String currentAdminEmail){
        AppUser u=users.findById(id).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy người dùng"));
        if(u.getEmail().equalsIgnoreCase(currentAdminEmail)) throw new ApiException(HttpStatus.BAD_REQUEST,"Không thể xoá tài khoản admin đang đăng nhập");
        try{users.delete(u);users.flush();}catch(Exception e){throw new ApiException(HttpStatus.CONFLICT,"Không thể xoá người dùng đã có booking. Có thể đổi thông tin/quyền thay vì xoá.");}
    }

    public AppUser findByEmail(String email){return users.findByEmailIgnoreCase(email).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy người dùng"));}
    public UserResponse dto(AppUser u){return new UserResponse(u.getId(),u.getEmail(),u.getFullName(),u.getPhone(),u.getRole().name(),u.getLoyaltyPoints()==null?0:u.getLoyaltyPoints(),u.getLoyaltyLifetimePoints()==null?0:u.getLoyaltyLifetimePoints(),u.getMembershipTier()==null?"BRONZE":u.getMembershipTier(),u.getBirthDate(),u.isAccountEnabled(),u.getCreatedAt(),u.getUpdatedAt());}
    private Role parseGeneralRole(String raw){try{Role role=Role.valueOf(raw.trim().toUpperCase(Locale.ROOT));if(role!=Role.USER&&role!=Role.ADMIN)throw new IllegalArgumentException();return role;}catch(Exception e){throw new ApiException(HttpStatus.BAD_REQUEST,"Tài khoản nhân viên STAFF/MANAGER phải được tạo và chỉnh sửa trong mục Nhân viên");}}
    private String clean(String v){return v==null||v.isBlank()?null:v.trim();}
}
