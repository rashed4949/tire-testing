package com.myproject.tire_testing.controller;
import com.myproject.tire_testing.dto.LoginRequest;
import com.myproject.tire_testing.model.User;
import com.myproject.tire_testing.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "http://localhost:5173")
public class AuthController {

    private final UserService service;

    public AuthController(UserService service) {
        this.service = service;
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody User user) {
        return ResponseEntity.ok(service.register(user));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        boolean isValid = service.login(request.getEmail(), request.getPassword());
        if (!isValid) {
            return ResponseEntity.status(401).body("Invalid credentials");
        }
        return ResponseEntity.ok("Login successful");
    }
    @GetMapping("/register")
    public String testRegisterPage() {
        return "Register endpoint is working. Use POST request to register a user.";
    }
}