package com.myproject.tire_testing.repository;

import com.myproject.tire_testing.entity.Tire;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface TireRepository extends JpaRepository<Tire, Long>, JpaSpecificationExecutor<Tire> {
    long countByStatus(Tire.TireStatus status);
}
