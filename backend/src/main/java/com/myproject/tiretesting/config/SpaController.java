package com.myproject.tiretesting.config;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
public class SpaController {

    // Forward any path that doesn't contain a dot (i.e., not a file)
    // and doesn't start with /api/ or /actuator/ to the React app
    @RequestMapping(value = {
            "/{path:[^\\.]*}",
            "/{path:^(?!api|actuator).*$}/**"
    })
    public String forward() {
        return "forward:/index.html";
    }
}