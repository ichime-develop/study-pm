package com.studypm.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * アカウント登録APIの入力を表す。
 */
public record SignupRequest(
        @NotBlank
        @Email
        @Size(max = 254)
        String email,

        @NotBlank
        @Size(min = 8, max = 128)
        @Pattern(
                regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).+$",
                message = "英大文字、英小文字、数字をそれぞれ1文字以上含めてください。"
        )
        String password,

        @NotBlank
        @Size(max = 100)
        String displayName
) {
}
