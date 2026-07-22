package com.studypm.account;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * Accountの永続化とメールアドレスによる認証検索を担当する。
 */
public interface AccountRepository extends JpaRepository<Account, UUID> {

    @Query("select account from Account account where lower(account.email) = lower(:email)")
    Optional<Account> findByEmail(@Param("email") String email);

    @Query("""
            select case when count(account) > 0 then true else false end
            from Account account
            where lower(account.email) = lower(:email)
            """)
    boolean existsByEmail(@Param("email") String email);
}
