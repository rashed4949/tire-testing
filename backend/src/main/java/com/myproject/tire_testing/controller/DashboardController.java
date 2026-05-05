package com.myproject.tire_testing.controller;

import com.myproject.tire_testing.entity.TestSession;
import com.myproject.tire_testing.entity.Tire;
import com.myproject.tire_testing.repository.TestSessionRepository;
import com.myproject.tire_testing.repository.TireRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final TireRepository tireRepository;
    private final TestSessionRepository sessionRepository;

    @GetMapping("/stats")
    public Map<String, Object> getStats() {
        long totalTires     = tireRepository.count();
        long activeTires    = tireRepository.countByStatus(Tire.TireStatus.ACTIVE);
        long testingTires   = tireRepository.countByStatus(Tire.TireStatus.TESTING);
        long totalSessions  = sessionRepository.count();
        long passedSessions = sessionRepository.countByPassed(true);
        long failedSessions = sessionRepository.countByPassed(false);
        long activeSessions = sessionRepository.countByStatus(TestSession.SessionStatus.IN_PROGRESS);

        double passRate = totalSessions > 0
            ? Math.round((double) passedSessions / totalSessions * 1000.0) / 10.0
            : 0.0;

        List<TestSession> recent = sessionRepository.findAllByOrderByCreatedAtDesc()
            .stream().limit(5).toList();

        List<Map<String, Object>> recentList = recent.stream().map(s -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", s.getId());
            m.put("tireBrand", s.getTire() != null ? s.getTire().getBrand() : "-");
            m.put("tireModel", s.getTire() != null ? s.getTire().getModel() : "-");
            m.put("testType", s.getTestType());
            m.put("status", s.getStatus());
            m.put("passed", s.getPassed());
            m.put("score", s.getScore());
            m.put("date", s.getCreatedAt());
            return m;
        }).toList();

        return Map.of(
            "totalTires",     totalTires,
            "activeTires",    activeTires,
            "testingTires",   testingTires,
            "totalSessions",  totalSessions,
            "passedSessions", passedSessions,
            "failedSessions", failedSessions,
            "activeSessions", activeSessions,
            "passRate",       passRate,
            "recentSessions", recentList
        );
    }
}
