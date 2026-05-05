package com.myproject.tire_testing.controller;

import com.myproject.tire_testing.entity.Tire;
import com.myproject.tire_testing.repository.TireRepository;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/tires")
@RequiredArgsConstructor
public class TireController {

    private final TireRepository tireRepository;

    @GetMapping
    public List<Tire> getAll(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Tire.TireType type,
            @RequestParam(required = false) Tire.TireStatus status) {

        Specification<Tire> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (search != null && !search.isBlank()) {
                String pattern = "%" + search.toLowerCase() + "%";
                predicates.add(cb.or(
                    cb.like(cb.lower(root.get("brand")), pattern),
                    cb.like(cb.lower(root.get("model")), pattern)
                ));
            }
            if (type != null) {
                predicates.add(cb.equal(root.get("type"), type));
            }
            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
        return tireRepository.findAll(spec);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Tire> getById(@PathVariable Long id) {
        return tireRepository.findById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public Tire create(@RequestBody Tire tire) {
        tire.setId(null);
        return tireRepository.save(tire);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Tire> update(@PathVariable Long id, @RequestBody Tire tire) {
        if (!tireRepository.existsById(id)) return ResponseEntity.notFound().build();
        tire.setId(id);
        return ResponseEntity.ok(tireRepository.save(tire));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        if (!tireRepository.existsById(id)) return ResponseEntity.notFound().build();
        tireRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<Tire> updateStatus(@PathVariable Long id, @RequestBody Map<String, String> body) {
        return tireRepository.findById(id).map(tire -> {
            tire.setStatus(Tire.TireStatus.valueOf(body.get("status")));
            return ResponseEntity.ok(tireRepository.save(tire));
        }).orElse(ResponseEntity.notFound().build());
    }
}
