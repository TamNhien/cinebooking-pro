package com.cinebooking.common;

public final class PasswordPolicy {
    private PasswordPolicy() {}

    public static final String REGEX = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9]).{8,100}$";
    public static final String MESSAGE = "Mật khẩu phải từ 8 đến 100 ký tự và có chữ hoa, chữ thường, số, ký tự đặc biệt";

    public static boolean isValid(String password) {
        return password != null && password.matches(REGEX);
    }
}
