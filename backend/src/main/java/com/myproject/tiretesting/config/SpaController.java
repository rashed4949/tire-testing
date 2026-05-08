package com.myproject.tiretesting.config;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
public class SpaController {

    @RequestMapping(value = "/{path:[^\\.]*}")
    public String forwardRoot() {
        return "forward:/index.html";
    }

    @RequestMapping(value = "/{path:[^\\.]*}/**")
    public String forwardNested() {
        return "forward:/index.html";
    }
}