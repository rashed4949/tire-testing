package com.myproject.tire_testing.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "test_session")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TestSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tire_id", nullable = false)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Tire tire;

    @Column(nullable = false)
    private String testType;      // e.g. "Wet Braking", "Rolling Resistance", "Noise"

    private String vehicle;       // e.g. "VW Golf 2023"
    private String testerName;
    private LocalDate sessionDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private SessionStatus status = SessionStatus.PLANNED;

    private Double score;         // 0–100 result score
    private Boolean passed;
    private String notes;

    @CreationTimestamp
    private LocalDateTime createdAt;

    public enum SessionStatus { PLANNED, IN_PROGRESS, COMPLETED, FAILED }
}
