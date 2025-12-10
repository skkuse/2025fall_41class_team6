# 1. 빌드 단계
FROM gradle:8.5-jdk17 AS build
WORKDIR /app
COPY . .
# [핵심] 메모리 제한 옵션(-Xmx512m) 추가 + bootJar(실행파일)만 딱 만들기
RUN gradle bootJar -x test --no-daemon -Dorg.gradle.jvmargs="-Xmx512m"

# 2. 실행 단계
FROM eclipse-temurin:17-jdk-alpine
WORKDIR /app
COPY --from=build /app/build/libs/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]