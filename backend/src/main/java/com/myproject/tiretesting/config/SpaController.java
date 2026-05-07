package com.myproject.tire_testing.config;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;

/**
 * Forwards all non-API, non-asset requests to React's index.html
 * so that React Router handles client-side navigation.
 */
@Controller
public class SpaController {

    @RequestMapping(value = {
        "/login", "/dashboard", "/tires", "/tires/**",
        "/sessions", "/sessions/**"
    })
    public String forwardToReact() {
        return "forward:/index.html";
    }
}
