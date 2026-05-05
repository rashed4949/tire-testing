package com.myproject.tire_testing.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "tire")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Tire {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String brand;

    @Column(nullable = false)
    private String model;

    private String size;          // e.g. "205/55R16"
    private String serialNumber;
    private Integer productionYear;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private TireType type = TireType.ALL_SEASON;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private TireStatus status = TireStatus.ACTIVE;

    private String notes;

    @JsonIgnore   // prevents circular reference: Tire → sessions → TestSession → tire → ...
    @OneToMany(mappedBy = "tire", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private List<TestSession> sessions;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    public enum TireType    { SUMMER, WINTER, ALL_SEASON, PERFORMANCE }
    public enum TireStatus  { ACTIVE, TESTING, ARCHIVED }
}
