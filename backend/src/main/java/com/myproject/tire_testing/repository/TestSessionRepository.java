package com.myproject.tire_testing.repository;

import com.myproject.tire_testing.entity.TestSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;

public interface TestSessionRepository extends JpaRepository<TestSession, Long> {
    List<TestSession> findByTireIdOrderByCreatedAtDesc(Long tireId);
    List<TestSession> findAllByOrderByCreatedAtDesc();
    long countByStatus(TestSession.SessionStatus status);
    long countByPassed(Boolean passed);

    @Query("SELECT MONTH(s.sessionDate), COUNT(s) FROM TestSession s WHERE s.sessionDate IS NOT NULL GROUP BY MONTH(s.sessionDate) ORDER BY MONTH(s.sessionDate)")
    List<Object[]> countByMonth();
}
