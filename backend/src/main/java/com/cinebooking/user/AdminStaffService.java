package com.cinebooking.user;

import com.cinebooking.audit.AuditService;
import com.cinebooking.auth.AuthSessionService;
import com.cinebooking.common.ApiException;
import com.cinebooking.common.PasswordPolicy;
import com.cinebooking.domain.AppUser;
import com.cinebooking.domain.Role;
import com.cinebooking.domain.StaffAttendance;
import com.cinebooking.domain.StaffProfile;
import com.cinebooking.domain.StaffShift;
import com.cinebooking.movie.CinemaRepository;
import com.cinebooking.staffops.StaffAttendanceRepository;
import com.cinebooking.staffops.StaffShiftRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

import static com.cinebooking.user.AdminStaffDtos.*;

@Service
public class AdminStaffService {
    private final UserRepository users;
    private final StaffProfileRepository staff;
    private final CinemaRepository cinemas;
    private final PasswordEncoder encoder;
    private final AuditService audit;
    private final StaffShiftRepository shifts;
    private final StaffAttendanceRepository attendance;
    private final AuthSessionService sessions;

    public AdminStaffService(UserRepository users, StaffProfileRepository staff, CinemaRepository cinemas,
                             PasswordEncoder encoder, AuditService audit,
                             StaffShiftRepository shifts, StaffAttendanceRepository attendance, AuthSessionService sessions) {
        this.users = users;
        this.staff = staff;
        this.cinemas = cinemas;
        this.encoder = encoder;
        this.audit = audit;
        this.shifts = shifts;
        this.attendance = attendance;
        this.sessions = sessions;
    }

    public List<StaffResponse> list() {
        return staff.findAllByDeletedAtIsNullOrderByEmployeeCodeAsc().stream().map(this::dto).toList();
    }

    public EmailStatusResponse emailStatus(String rawEmail) {
        String email = rawEmail == null ? "" : rawEmail.trim().toLowerCase(Locale.ROOT);
        if (email.isBlank()) return new EmailStatusResponse(false, null, null, null, null, false, false, false, "Nhập email để kiểm tra.");
        var found = users.findByEmailIgnoreCase(email);
        if (found.isEmpty()) return new EmailStatusResponse(false, null, null, null, null, false, false, false, "Email chưa tồn tại; có thể tạo tài khoản nhân viên mới.");

        AppUser u = found.get();
        var profile = staff.findById(u.getId());
        boolean activeStaff = profile.isPresent() && profile.get().getDeletedAt() == null;
        boolean deletedStaff = profile.isPresent() && profile.get().getDeletedAt() != null;
        boolean canPromote = !activeStaff && u.getRole() != Role.ADMIN;
        String message;
        if (activeStaff) message = "Email này đã là tài khoản nhân viên đang hoạt động.";
        else if (u.getRole() == Role.ADMIN) message = "Không thể chuyển tài khoản ADMIN thành nhân viên.";
        else if (deletedStaff) message = "Email thuộc nhân viên đã xóa. Có thể khôi phục hồ sơ nhân viên và giữ nguyên mật khẩu hiện tại.";
        else message = "Email đã có tài khoản " + u.getRole().name() + ". Có thể chuyển tài khoản hiện có thành nhân viên và giữ nguyên mật khẩu.";
        return new EmailStatusResponse(true, u.getId(), u.getRole().name(), u.getFullName(), u.getPhone(), activeStaff, deletedStaff, canPromote, message);
    }

    @Transactional
    public StaffResponse create(CreateStaffRequest req, String adminEmail) {
        String email = req.email().trim().toLowerCase(Locale.ROOT);
        String code = normalizeCode(req.employeeCode());
        var existing = users.findByEmailIgnoreCase(email);
        if (existing.isPresent()) {
            AppUser u = existing.get();
            var profile = staff.findById(u.getId());
            if (profile.isPresent() && profile.get().getDeletedAt() == null)
                throw new ApiException(HttpStatus.CONFLICT, "Email đã thuộc một nhân viên đang hoạt động");
            if (u.getRole() == Role.ADMIN)
                throw new ApiException(HttpStatus.CONFLICT, "Email đang thuộc tài khoản ADMIN và không thể dùng để tạo nhân viên");
            throw new ApiException(HttpStatus.CONFLICT, "Email đã có tài khoản " + u.getRole().name() + ". Hãy chọn 'Chuyển tài khoản hiện có thành nhân viên' hoặc dùng email khác.");
        }
        if (staff.findByEmployeeCodeIgnoreCase(code).isPresent()) throw new ApiException(HttpStatus.CONFLICT, "Mã nhân viên đã tồn tại hoặc đã từng được sử dụng");
        validateCinema(req.cinemaId());

        AppUser u = new AppUser();
        u.setEmail(email);
        u.setFullName(req.fullName().trim());
        u.setPhone(clean(req.phone()));
        u.setPasswordHash(encoder.encode(req.password()));
        u.setRole(parseStaffRole(req.role()));
        String status = parseStatus(req.employmentStatus());
        u.setAccountEnabled(req.accountEnabled() && !"INACTIVE".equals(status));
        users.save(u);

        StaffProfile p = new StaffProfile();
        p.setUserId(u.getId());
        p.setEmployeeCode(code);
        p.setCinemaId(req.cinemaId());
        p.setJobTitle(clean(req.jobTitle()));
        p.setEmploymentStatus(status);
        p.setHireDate(req.hireDate() == null ? LocalDate.now() : req.hireDate());
        staff.save(p);

        audit.record(adminEmail, "STAFF_CREATE", "USER", u.getId().toString(), "Tạo tài khoản nhân viên " + code, null);
        return dto(p);
    }

    @Transactional
    public StaffResponse promote(PromoteStaffRequest req, String adminEmail) {
        String email = req.email().trim().toLowerCase(Locale.ROOT);
        String code = normalizeCode(req.employeeCode());
        AppUser u = users.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Email chưa có tài khoản. Hãy dùng chức năng tạo nhân viên mới."));
        if (u.getRole() == Role.ADMIN) throw new ApiException(HttpStatus.CONFLICT, "Không thể chuyển tài khoản ADMIN thành nhân viên");
        validateCinema(req.cinemaId());

        StaffProfile p = staff.findById(u.getId()).orElse(null);
        if (p != null && p.getDeletedAt() == null)
            throw new ApiException(HttpStatus.CONFLICT, "Tài khoản này đã là nhân viên đang hoạt động");
        staff.findByEmployeeCodeIgnoreCase(code)
                .filter(other -> !other.getUserId().equals(u.getId()))
                .ifPresent(other -> { throw new ApiException(HttpStatus.CONFLICT, "Mã nhân viên đã tồn tại hoặc đã từng được sử dụng"); });

        Role newRole = parseStaffRole(req.role());
        String status = parseStatus(req.employmentStatus());
        u.setFullName(req.fullName().trim());
        u.setPhone(clean(req.phone()));
        u.setRole(newRole);
        u.setAccountEnabled(req.accountEnabled() && !"INACTIVE".equals(status));
        users.save(u);

        boolean restored = p != null;
        if (p == null) {
            p = new StaffProfile();
            p.setUserId(u.getId());
        }
        p.setDeletedAt(null);
        p.setEmployeeCode(code);
        p.setCinemaId(req.cinemaId());
        p.setJobTitle(clean(req.jobTitle()));
        p.setEmploymentStatus(status);
        p.setHireDate(req.hireDate() == null ? LocalDate.now() : req.hireDate());
        staff.save(p);

        String action = restored ? "STAFF_RESTORE" : "STAFF_PROMOTE";
        String details = (restored ? "Khôi phục" : "Chuyển") + " tài khoản " + email + " thành nhân viên " + code + "; giữ nguyên mật khẩu hiện tại";
        audit.record(adminEmail, action, "USER", u.getId().toString(), details, null);
        return dto(p);
    }

    @Transactional
    public StaffResponse update(UUID userId, UpdateStaffRequest req, String adminEmail) {
        AppUser u = users.findById(userId).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy tài khoản nhân viên"));
        StaffProfile p = activeProfile(userId);
        String email = req.email().trim().toLowerCase(Locale.ROOT);
        String code = normalizeCode(req.employeeCode());
        users.findByEmailIgnoreCase(email).filter(other -> !other.getId().equals(userId)).ifPresent(other -> { throw new ApiException(HttpStatus.CONFLICT, "Email đã tồn tại"); });
        staff.findByEmployeeCodeIgnoreCase(code).filter(other -> !other.getUserId().equals(userId)).ifPresent(other -> { throw new ApiException(HttpStatus.CONFLICT, "Mã nhân viên đã tồn tại hoặc đã từng được sử dụng"); });
        validateCinema(req.cinemaId());

        u.setEmail(email);
        u.setFullName(req.fullName().trim());
        u.setPhone(clean(req.phone()));
        u.setRole(parseStaffRole(req.role()));
        String status = parseStatus(req.employmentStatus());
        u.setAccountEnabled(req.accountEnabled() && !"INACTIVE".equals(status));
        if (req.newPassword() != null && !req.newPassword().isBlank()) {
            if (!PasswordPolicy.isValid(req.newPassword())) throw new ApiException(HttpStatus.BAD_REQUEST, PasswordPolicy.MESSAGE);
            u.setPasswordHash(encoder.encode(req.newPassword()));
            sessions.revokeAllForUser(u.getId(), "ADMIN_PASSWORD_RESET", adminEmail);
        }
        users.save(u);
        if(!u.isAccountEnabled()) sessions.revokeAllForUser(u.getId(), "ACCOUNT_DISABLED", adminEmail);

        p.setEmployeeCode(code);
        p.setCinemaId(req.cinemaId());
        p.setJobTitle(clean(req.jobTitle()));
        p.setEmploymentStatus(status);
        p.setHireDate(req.hireDate());
        staff.save(p);

        audit.record(adminEmail, "STAFF_UPDATE", "USER", u.getId().toString(), "Cập nhật tài khoản nhân viên " + code, null);
        return dto(p);
    }

    @Transactional
    public DeleteStaffResponse delete(UUID userId, String adminEmail) {
        AppUser u = users.findById(userId).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy tài khoản nhân viên"));
        StaffProfile p = activeProfile(userId);
        String code = p.getEmployeeCode();
        Instant now = Instant.now();
        boolean endedActiveShift = false;

        var active = attendance.findFirstByStaffUserIdAndCheckOutAtIsNullOrderByCheckInAtDesc(userId);
        if (active.isPresent()) {
            StaffAttendance a = active.get();
            a.setCheckOutAt(now);
            a.setStatus("COMPLETED");
            attendance.save(a);
            shifts.findById(a.getShiftId()).ifPresent(s -> {
                s.setStatus("COMPLETED");
                shifts.save(s);
            });
            endedActiveShift = true;
        }

        List<StaffShift> scheduled = shifts.findByStaffUserIdAndStatusOrderByShiftDateAscStartTimeAsc(userId, "SCHEDULED");
        for (StaffShift s : scheduled) s.setStatus("CANCELLED");
        if (!scheduled.isEmpty()) shifts.saveAll(scheduled);

        u.setAccountEnabled(false);
        users.save(u);
        sessions.revokeAllForUser(u.getId(), "STAFF_DELETED", adminEmail);
        p.setEmploymentStatus("INACTIVE");
        p.setDeletedAt(now);
        staff.save(p);

        String details = "Xóa nhân viên " + code + "; hủy " + scheduled.size() + " ca chưa thực hiện"
                + (endedActiveShift ? "; tự kết thúc ca đang làm" : "");
        audit.record(adminEmail, "STAFF_DELETE", "USER", u.getId().toString(), details, null);
        return new DeleteStaffResponse(userId, code, scheduled.size(), endedActiveShift,
                "Đã xóa nhân viên khỏi danh sách. Tài khoản bị khóa; lịch sử ca, chấm công, quét vé và audit vẫn được giữ.");
    }

    private StaffProfile activeProfile(UUID userId) {
        StaffProfile p = staff.findById(userId).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy hồ sơ nhân viên"));
        if (p.getDeletedAt() != null) throw new ApiException(HttpStatus.NOT_FOUND, "Nhân viên đã được xóa");
        return p;
    }

    private StaffResponse dto(StaffProfile p) {
        AppUser u = users.findById(p.getUserId()).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy tài khoản nhân viên"));
        String cinemaName = p.getCinemaId() == null ? null : cinemas.findById(p.getCinemaId()).map(c -> c.getName()).orElse(null);
        return new StaffResponse(u.getId(), p.getEmployeeCode(), u.getEmail(), u.getFullName(), u.getPhone(),
                u.getRole().name(), p.getCinemaId(), cinemaName, p.getJobTitle(), p.getEmploymentStatus(),
                p.getHireDate(), u.isAccountEnabled(), u.getCreatedAt(), u.getUpdatedAt());
    }

    private Role parseStaffRole(String raw) {
        try {
            Role role = Role.valueOf(raw.trim().toUpperCase(Locale.ROOT));
            if (role != Role.STAFF && role != Role.MANAGER) throw new IllegalArgumentException();
            return role;
        } catch (Exception e) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Tài khoản nhân viên chỉ được chọn STAFF hoặc MANAGER");
        }
    }

    private String parseStatus(String raw) {
        String value = raw == null ? "ACTIVE" : raw.trim().toUpperCase(Locale.ROOT);
        if (!List.of("ACTIVE", "ON_LEAVE", "INACTIVE").contains(value))
            throw new ApiException(HttpStatus.BAD_REQUEST, "Trạng thái phải là ACTIVE, ON_LEAVE hoặc INACTIVE");
        return value;
    }

    private void validateCinema(UUID id) {
        if (id != null && !cinemas.existsById(id)) throw new ApiException(HttpStatus.BAD_REQUEST, "Rạp được phân công không tồn tại");
    }

    private String normalizeCode(String value) { return value.trim().toUpperCase(Locale.ROOT); }
    private String clean(String value) { return value == null || value.isBlank() ? null : value.trim(); }
}
