// src/pages/Login.tsx
import { useState } from "react";
import axios from "axios";

interface LoginForm {
    email: string;
    password: string;
}

export default function Login() {
    const [form, setForm] = useState<LoginForm>({ email: "", password: "" });
    const [error, setError] = useState<string | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await axios.post("http://localhost:8080/api/auth/login", form);
            alert(res.data); // "Login successful"
            setError(null);
        } catch (err: any) {
            if (err.response?.status === 401) setError("Invalid credentials");
            else setError("Server error");
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <input type="email" name="email" placeholder="Email" value={form.email} onChange={handleChange} />
            <input type="password" name="password" placeholder="Password" value={form.password} onChange={handleChange} />
            <button type="submit">Login</button>
            {error && <p style={{ color: "red" }}>{error}</p>}
        </form>
    );
}