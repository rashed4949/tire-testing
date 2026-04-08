import axios from "axios";

const API_URL = "http://localhost:8080/api/auth/";

export interface IUser {
    username?: string;
    email: string;
    password: string;
}

export interface IUserResponse {
    id: number;
    username?: string;
    email: string;
    token?: string;
}

export const register = async (user: IUser): Promise<IUserResponse> => {
    const response = await axios.post<IUserResponse>(API_URL + "register", user);
    return response.data;
};

export const login = async (user: IUser): Promise<IUserResponse> => {
    const response = await axios.post<IUserResponse>(API_URL + "login", user);
    if (response.data.token) {
        localStorage.setItem("user", JSON.stringify(response.data));
    }
    return response.data;
};

export const logout = (): void => {
    localStorage.removeItem("user");
};