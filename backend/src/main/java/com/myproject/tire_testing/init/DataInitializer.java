package com.myproject.tire_testing.init;

import com.myproject.tire_testing.entity.*;
import com.myproject.tire_testing.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final TireRepository tireRepository;
    private final TestSessionRepository sessionRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        if (userRepository.count() > 0) return;
        log.info("Seeding demo data...");

        userRepository.save(User.builder().email("admin@continental.com").fullName("Admin User")
            .password(passwordEncoder.encode("admin123")).role(User.Role.ADMIN).build());
        userRepository.save(User.builder().email("tester@continental.com").fullName("Rashed Islam")
            .password(passwordEncoder.encode("tester123")).role(User.Role.TESTER).build());

        List<Tire> tires = tireRepository.saveAll(List.of(
            Tire.builder().brand("Continental").model("ContiSportContact 5").size("225/45R17").type(Tire.TireType.SUMMER).status(Tire.TireStatus.ACTIVE).productionYear(2023).serialNumber("CSC5-001").build(),
            Tire.builder().brand("Continental").model("WinterContact TS870").size("205/55R16").type(Tire.TireType.WINTER).status(Tire.TireStatus.TESTING).productionYear(2023).serialNumber("WC870-002").build(),
            Tire.builder().brand("Michelin").model("Pilot Sport 4").size("245/40R18").type(Tire.TireType.PERFORMANCE).status(Tire.TireStatus.ACTIVE).productionYear(2022).serialNumber("PS4-003").build(),
            Tire.builder().brand("Bridgestone").model("Turanza T005").size("215/60R16").type(Tire.TireType.ALL_SEASON).status(Tire.TireStatus.ACTIVE).productionYear(2023).serialNumber("TT5-004").build(),
            Tire.builder().brand("Goodyear").model("EfficientGrip 2").size("195/65R15").type(Tire.TireType.SUMMER).status(Tire.TireStatus.TESTING).productionYear(2024).serialNumber("EG2-005").build(),
            Tire.builder().brand("Continental").model("EcoContact 6").size("185/60R15").type(Tire.TireType.ALL_SEASON).status(Tire.TireStatus.ACTIVE).productionYear(2024).serialNumber("EC6-006").build()
        ));

        sessionRepository.saveAll(List.of(
            TestSession.builder().tire(tires.get(0)).testType("Wet Braking").vehicle("VW Golf 8 2023").testerName("Rashed Islam").sessionDate(LocalDate.now().minusDays(5)).status(TestSession.SessionStatus.COMPLETED).score(87.5).passed(true).notes("Excellent wet performance").build(),
            TestSession.builder().tire(tires.get(1)).testType("Snow Traction").vehicle("Audi A4 2022").testerName("Rashed Islam").sessionDate(LocalDate.now().minusDays(3)).status(TestSession.SessionStatus.COMPLETED).score(92.0).passed(true).notes("Best in class for winter").build(),
            TestSession.builder().tire(tires.get(2)).testType("Dry Handling").vehicle("BMW 3 Series 2023").testerName("Admin User").sessionDate(LocalDate.now().minusDays(1)).status(TestSession.SessionStatus.IN_PROGRESS).build(),
            TestSession.builder().tire(tires.get(3)).testType("Rolling Resistance").vehicle("Toyota Corolla 2023").testerName("Rashed Islam").sessionDate(LocalDate.now().minusDays(7)).status(TestSession.SessionStatus.COMPLETED).score(73.0).passed(true).build(),
            TestSession.builder().tire(tires.get(4)).testType("Noise Level").vehicle("Hyundai i30 2024").testerName("Admin User").sessionDate(LocalDate.now()).status(TestSession.SessionStatus.PLANNED).build(),
            TestSession.builder().tire(tires.get(0)).testType("Aquaplaning").vehicle("VW Passat 2022").testerName("Rashed Islam").sessionDate(LocalDate.now().minusDays(10)).status(TestSession.SessionStatus.FAILED).score(48.5).passed(false).notes("Failed threshold — retest needed").build()
        ));
        log.info("Demo data seeded. Login: admin@continental.com / admin123");
    }
}
