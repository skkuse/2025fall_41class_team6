package com.skku.swe_project.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**") // 모든 API 경로에 대해
                .allowedOrigins(
                        "http://localhost:3000", // 1. 프론트엔드 개발자가 로컬에서 띄울 때
                        "http://localhost:5173", // (Vite 쓰는 경우)
                        "https://software-engineering6.vercel.app" // 2. 나중에 배포 주소 나오면 여기 추가!
                )
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS") // 허용할 HTTP 메서드
                .allowedHeaders("*")
                .allowCredentials(true); // 쿠키/인증 정보 포함 허용
    }
}