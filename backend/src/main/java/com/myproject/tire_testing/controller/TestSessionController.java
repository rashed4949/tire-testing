package com.myproject.tire_testing.controller;

import com.myproject.tire_testing.entity.TestSession;
import com.myproject.tire_testing.entity.Tire;
import com.myproject.tire_testing.repository.TestSessionRepository;
import com.myproject.tire_testing.repository.TireRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/sessions")
@RequiredArgsConstructor
public class TestSessionController {

    private final TestSessionRepository sessionRepository;
    private final TireRepository tireRepository;

    @GetMapping
    public List<TestSession> getAll() {
        return sessionRepository.findAllByOrderByCreatedAtDesc();
    }

    @GetMapping("/{id}")
    public ResponseEntity<TestSession> getById(@PathVariable Long id) {
        return sessionRepository.findById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/tire/{tireId}")
    public List<TestSession> getByTire(@PathVariable Long tireId) {
        return sessionRepository.findByTireIdOrderByCreatedAtDesc(tireId);
    }

    @PostMapping
    public ResponseEntity<TestSession> create(@RequestBody Map<String, Object> body) {
        Long tireId = Long.parseLong(body.get("tireId").toString());
        Tire tire = tireRepository.findById(tireId).orElse(null);
        if (tire == null) return ResponseEntity.badRequest().build();
        TestSession session = TestSession.builder()
            .tire(tire)
            .testType(body.getOrDefault("testType", "General").toString())
            .vehicle(body.getOrDefault("vehicle", "").toString())
            .testerName(body.getOrDefault("testerName", "").toString())
            .sessionDate(LocalDate.now())
            .status(TestSession.SessionStatus.PLANNED)
            .build();
        return ResponseEntity.ok(sessionRepository.save(session));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<TestSession> updateStatus(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        return sessionRepository.findById(id).map(session -> {
            session.setStatus(TestSession.SessionStatus.valueOf(body.get("status").toString()));
            if (body.containsKey("score")) session.setScore(Double.parseDouble(body.get("score").toString()));
            if (body.containsKey("passed")) session.setPassed(Boolean.parseBoolean(body.get("passed").toString()));
            if (body.containsKey("notes")) session.setNotes(body.getOrDefault("notes","").toString());
            return ResponseEntity.ok(sessionRepository.save(session));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        if (!sessionRepository.existsById(id)) return ResponseEntity.notFound().build();
        sessionRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
