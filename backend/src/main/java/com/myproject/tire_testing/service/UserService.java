package com.myproject.tire_testing.service;

import com.myproject.tire_testing.entity.User;          // ← fixed: was model.User
import com.myproject.tire_testing.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class UserService {

    private final UserRepository repo;
    private final PasswordEncoder encoder;

    public UserService(UserRepository repo, PasswordEncoder encoder) {
        this.repo = repo;
        this.encoder = encoder;
    }

    public User register(User user) {
        user.setPassword(encoder.encode(user.getPassword()));
        return repo.save(user);
    }

    public boolean login(String email, String password) {
        return repo.findByEmail(email)
                .map(u -> encoder.matches(password, u.getPassword()))
                .orElse(false);
    }
}
