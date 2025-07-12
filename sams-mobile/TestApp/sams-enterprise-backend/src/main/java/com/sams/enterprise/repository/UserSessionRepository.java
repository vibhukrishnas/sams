package com.sams.enterprise.repository;

import com.sams.enterprise.entity.UserSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * User Session Repository
 */
@Repository
public interface UserSessionRepository extends JpaRepository<UserSession, Long> {
    
    Optional<UserSession> findByToken(String token);
    
    Optional<UserSession> findByRefreshToken(String refreshToken);
    
    Optional<UserSession> findByRefreshTokenAndStatus(String refreshToken, UserSession.SessionStatus status);
    
    List<UserSession> findByUserIdAndStatus(Long userId, UserSession.SessionStatus status);
    
    List<UserSession> findByUserIdAndStatusOrderByCreatedAtDesc(Long userId, UserSession.SessionStatus status);
}
