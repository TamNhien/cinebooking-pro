package com.cinebooking.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "app_user")
public class AppUser {
    @Id private UUID id;
    @Column(nullable = false, unique = true) private String email;
    @Column(name = "password_hash", nullable = false) private String passwordHash;
    @Column(name = "full_name", nullable = false) private String fullName;
    private String phone;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private Role role;
    @Column(name = "created_at", nullable = false) private Instant createdAt;
    @Column(name = "updated_at", nullable = false) private Instant updatedAt;
    @Column(name = "loyalty_points", nullable = false) private Integer loyaltyPoints;
    @Column(name = "membership_tier", nullable = false) private String membershipTier;
    @Column(name = "loyalty_lifetime_points", nullable = false) private Integer loyaltyLifetimePoints;
    @Column(name = "birth_date") private LocalDate birthDate;
    @Column(name = "birthday_reward_year") private Integer birthdayRewardYear;
    @Column(name = "account_enabled", nullable = false) private Boolean accountEnabled;

    @PrePersist void prePersist() {
        if (id == null) id = UUID.randomUUID();
        if (createdAt == null) createdAt = Instant.now();
        if (updatedAt == null) updatedAt = Instant.now();
        if (role == null) role = Role.USER;
        if (loyaltyPoints == null) loyaltyPoints = 0;
        if (membershipTier == null) membershipTier = "BRONZE";
        if (loyaltyLifetimePoints == null) loyaltyLifetimePoints = 0;
        if (accountEnabled == null) accountEnabled = true;
    }
    @PreUpdate void preUpdate(){ updatedAt = Instant.now(); }
    public UUID getId(){return id;} public void setId(UUID id){this.id=id;}
    public String getEmail(){return email;} public void setEmail(String email){this.email=email;}
    public String getPasswordHash(){return passwordHash;} public void setPasswordHash(String passwordHash){this.passwordHash=passwordHash;}
    public String getFullName(){return fullName;} public void setFullName(String fullName){this.fullName=fullName;}
    public String getPhone(){return phone;} public void setPhone(String phone){this.phone=phone;}
    public Role getRole(){return role;} public void setRole(Role role){this.role=role;}
    public Instant getCreatedAt(){return createdAt;} public void setCreatedAt(Instant createdAt){this.createdAt=createdAt;}
    public Instant getUpdatedAt(){return updatedAt;} public void setUpdatedAt(Instant updatedAt){this.updatedAt=updatedAt;}
    public Integer getLoyaltyPoints(){return loyaltyPoints;} public void setLoyaltyPoints(Integer loyaltyPoints){this.loyaltyPoints=loyaltyPoints;}
    public String getMembershipTier(){return membershipTier;} public void setMembershipTier(String membershipTier){this.membershipTier=membershipTier;}
    public Integer getLoyaltyLifetimePoints(){return loyaltyLifetimePoints;} public void setLoyaltyLifetimePoints(Integer v){loyaltyLifetimePoints=v;}
    public LocalDate getBirthDate(){return birthDate;} public void setBirthDate(LocalDate v){birthDate=v;}
    public Integer getBirthdayRewardYear(){return birthdayRewardYear;} public void setBirthdayRewardYear(Integer v){birthdayRewardYear=v;}
    public boolean isAccountEnabled(){return accountEnabled == null || accountEnabled;} public void setAccountEnabled(Boolean accountEnabled){this.accountEnabled=accountEnabled;}
}
